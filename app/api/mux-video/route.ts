import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PublicBlobStorage } from "@/lib/blob-store";

// POST /api/mux-video
// Muxes original video picture stream with newly dubbed audio mix (BGM + Edge-TTS voices)
// Produces high-fidelity MP4 video with synced audio without re-encoding video frames
export async function POST(req: NextRequest) {
  let tempVideoPath = "";
  let tempAudioPath = "";
  let tempOutputPath = "";

  try {
    const formData = await req.formData();
    const videoFile = formData.get("video") as File | null;
    const audioFile = formData.get("audio") as File | null;
    const videoBlobPath = formData.get("videoBlobPath") as string | null;
    const audioBlobPath = formData.get("audioBlobPath") as string | null;

    let videoBuffer: Buffer | null = null;
    let audioBuffer: Buffer | null = null;

    // Resolve video buffer
    if (videoFile) {
      videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    } else if (videoBlobPath) {
      const stored = await PublicBlobStorage.get(videoBlobPath);
      if (stored && stored.dataBase64) {
        videoBuffer = Buffer.from(stored.dataBase64, "base64");
      }
    }

    // Resolve audio buffer
    if (audioFile) {
      audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    } else if (audioBlobPath) {
      const stored = await PublicBlobStorage.get(audioBlobPath);
      if (stored && stored.dataBase64) {
        audioBuffer = Buffer.from(stored.dataBase64, "base64");
      }
    }

    if (!videoBuffer) {
      return NextResponse.json({ error: "لم يتم تقديم ملف فيديو لدمج الدبلجة معه" }, { status: 400 });
    }
    if (!audioBuffer) {
      return NextResponse.json({ error: "لم يتم تقديم ملف صوت الدبلجة الماستر" }, { status: 400 });
    }

    const tempDir = os.tmpdir();
    const uniqueId = `mux_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const isMp3 = audioFile?.name?.toLowerCase().endsWith(".mp3") || 
      (audioBuffer.length >= 3 && audioBuffer[0] === 0x49 && audioBuffer[1] === 0x44 && audioBuffer[2] === 0x33) ||
      (audioBuffer.length >= 2 && audioBuffer[0] === 0xff && (audioBuffer[1] & 0xe0) === 0xe0);
    const audioExt = isMp3 ? ".mp3" : ".wav";

    tempVideoPath = path.join(tempDir, `${uniqueId}_input.mp4`);
    tempAudioPath = path.join(tempDir, `${uniqueId}_audio${audioExt}`);
    tempOutputPath = path.join(tempDir, `${uniqueId}_dubbed.mp4`);

    await Promise.all([
      fs.writeFile(tempVideoPath, videoBuffer),
      fs.writeFile(tempAudioPath, audioBuffer),
    ]);

    // Run FFmpeg: Copy video stream without re-encoding, encode new dubbed audio to AAC 192k
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        tempVideoPath,
        "-i",
        tempAudioPath,
        "-map",
        "0:v:0", // Take first video stream from video file
        "-map",
        "1:a:0", // Take first audio stream from master audio WAV
        "-c:v",
        "copy", // Stream copy video (lossless & instant)
        "-c:a",
        "aac", // Standard AAC audio for universal MP4 compatibility
        "-b:a",
        "192k",
        "-shortest", // Stop at the end of the shortest stream
        "-movflags",
        "+faststart", // Enable web streaming playback
        tempOutputPath,
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error("FFmpeg muxing error:", stderr);
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });
    });

    const outputMp4Buffer = await fs.readFile(tempOutputPath);

    // Save to PublicBlobStorage for instant sharing and preview
    const blobName = `dubbed_video_${Date.now()}.mp4`;
    const storedBlob = await PublicBlobStorage.put(blobName, outputMp4Buffer, {
      contentType: "video/mp4",
    });

    // Clean up temporary files
    await Promise.allSettled([
      fs.unlink(tempVideoPath),
      fs.unlink(tempAudioPath),
      fs.unlink(tempOutputPath),
    ]);

    return NextResponse.json({
      success: true,
      video_url: storedBlob.url,
      filename: blobName,
      size_bytes: outputMp4Buffer.length,
      message: "تم دمج فيديو الدبلجة بنجاح!",
    });
  } catch (err: any) {
    console.error("Muxing video error:", err);

    // Clean up on error
    if (tempVideoPath) await fs.unlink(tempVideoPath).catch(() => {});
    if (tempAudioPath) await fs.unlink(tempAudioPath).catch(() => {});
    if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});

    return NextResponse.json(
      { error: "فشل دمج الفيديو والصوت عبر FFmpeg: " + (err?.message || String(err)) },
      { status: 500 }
    );
  }
}
