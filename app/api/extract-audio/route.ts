import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";

// POST /api/extract-audio
// Receives an MP4/WebM video file (multipart form data or raw body)
// Uses system FFmpeg to extract pristine 44.1kHz 16-bit Stereo PCM WAV
export async function POST(req: NextRequest) {
  let tempInputPath = "";
  let tempOutputPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم تقديم ملف فيديو للاستخراج" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const uniqueId = `extract_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = file.name ? path.extname(file.name) || ".mp4" : ".mp4";

    tempInputPath = path.join(tempDir, `${uniqueId}_input${ext}`);
    tempOutputPath = path.join(tempDir, `${uniqueId}_output.wav`);

    // Write input file to disk for ffmpeg
    await fs.writeFile(tempInputPath, buffer);

    // Run ffmpeg: convert video audio stream to 44.1kHz 16-bit 2-channel WAV
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        tempInputPath,
        "-vn", // No video
        "-acodec",
        "pcm_s16le", // 16-bit PCM WAV
        "-ar",
        "44100", // 44.1 kHz
        "-ac",
        "2", // Stereo
        tempOutputPath
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });

      ffmpeg.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          console.error("FFmpeg error:", stderr);
          reject(new Error(`FFmpeg exited with code ${code}: ${stderr.slice(-300)}`));
        }
      });

      ffmpeg.on("error", (err) => {
        reject(err);
      });
    });

    // Read the converted WAV file
    const wavBuffer = await fs.readFile(tempOutputPath);

    // Clean up temporary files
    await Promise.allSettled([
      fs.unlink(tempInputPath),
      fs.unlink(tempOutputPath)
    ]);

    return new NextResponse(wavBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
        "Content-Disposition": `attachment; filename="extracted_audio.wav"`,
        "Cache-Control": "no-store",
      }
    });
  } catch (error: any) {
    console.error("Failed to extract audio with FFmpeg:", error);

    // Clean up on error
    if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
    if (tempOutputPath) await fs.unlink(tempOutputPath).catch(() => {});

    return NextResponse.json(
      { error: "فشل استخراج الصوت من الفيديو عبر FFmpeg: " + (error?.message || String(error)) },
      { status: 500 }
    );
  }
}
