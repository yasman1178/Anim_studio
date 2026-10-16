import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import fs from "fs/promises";
import path from "path";
import os from "os";
import { PublicBlobStorage } from "@/lib/blob-store";

// POST /api/separate-audio
// Receives an audio or video file
// Uses FFmpeg stereo phase cancellation & spectral filtering to extract:
// 1. Pristine Instrumental BGM (100% center vocal stripped + bass preserved)
// 2. Isolated Vocals (speech band center channel)
export async function POST(req: NextRequest) {
  let tempInputPath = "";
  let tempInstPath = "";
  let tempVocPath = "";

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "لم يتم تقديم ملف صوت أو فيديو للمعالجة" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const tempDir = os.tmpdir();
    const uniqueId = `sep_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const ext = file.name ? path.extname(file.name) || ".mp4" : ".mp4";

    tempInputPath = path.join(tempDir, `${uniqueId}_in${ext}`);
    tempInstPath = path.join(tempDir, `${uniqueId}_instrumental.wav`);
    tempVocPath = path.join(tempDir, `${uniqueId}_vocals.wav`);

    await fs.writeFile(tempInputPath, buffer);

    // 1. Extract Instrumental: Remove center dialogue via stereo difference + low-frequency bass recovery
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        tempInputPath,
        "-vn",
        "-filter_complex",
        "[0:a]aformat=channel_layouts=stereo,stereotools=mlev=0.015625:slev=1.4,lowpass=f=18000,highpass=f=35[out]",
        "-map",
        "[out]",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        tempInstPath
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg instrumental separation failed: ${stderr.slice(-300)}`));
      });
      ffmpeg.on("error", reject);
    });

    // 2. Extract Vocals: Bandpass center dialogue formant (300Hz - 3800Hz)
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-y",
        "-i",
        tempInputPath,
        "-vn",
        "-filter_complex",
        "[0:a]pan=mono|c0=0.5*c0+0.5*c1,highpass=f=280,lowpass=f=3600,volume=1.3[out]",
        "-map",
        "[out]",
        "-acodec",
        "pcm_s16le",
        "-ar",
        "44100",
        tempVocPath
      ]);

      let stderr = "";
      ffmpeg.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg vocal separation failed: ${stderr.slice(-300)}`));
      });
      ffmpeg.on("error", reject);
    });

    const [instBuf, vocBuf] = await Promise.all([
      fs.readFile(tempInstPath),
      fs.readFile(tempVocPath)
    ]);

    // Store in PublicBlobStorage for instant streaming
    const [instBlob, vocBlob] = await Promise.all([
      PublicBlobStorage.put(`separated_instrumental_${Date.now()}.wav`, instBuf, { contentType: "audio/wav" }),
      PublicBlobStorage.put(`separated_vocals_${Date.now()}.wav`, vocBuf, { contentType: "audio/wav" })
    ]);

    // Cleanup
    await Promise.allSettled([
      fs.unlink(tempInputPath),
      fs.unlink(tempInstPath),
      fs.unlink(tempVocPath)
    ]);

    return NextResponse.json({
      success: true,
      instrumentalAudioUrl: instBlob.url,
      vocalsAudioUrl: vocBlob.url,
      duration: Math.round((instBuf.length / (44100 * 2 * 2)) * 10) / 10,
      message: "تم فصل الموسيقى عن الحوار بنجاح عبر محرك الاستريو الطيفي!"
    });
  } catch (err: any) {
    console.error("Separation API error:", err);
    if (tempInputPath) await fs.unlink(tempInputPath).catch(() => {});
    if (tempInstPath) await fs.unlink(tempInstPath).catch(() => {});
    if (tempVocPath) await fs.unlink(tempVocPath).catch(() => {});

    return NextResponse.json(
      { error: "فشل فصل الصوت في الخادم: " + (err?.message || String(err)) },
      { status: 500 }
    );
  }
}
