import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// Synthesize authentic Egyptian Arabic voice using Microsoft Edge Neural TTS
async function synthesizeEdgeTts(
  text: string,
  voiceName: string = "ar-EG-ShakirNeural",
  pitch: string = "+0Hz",
  rate: string = "+0%"
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  
  // Format options: 24kHz 48kbps or 96kbps mono MP3
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    // Pitch/rate options if provided
    const options: any = {};
    if (pitch && pitch !== "+0Hz") options.pitch = pitch;
    if (rate && rate !== "+0%") options.rate = rate;

    const { audioStream } = tts.toStream(text, options);
    const chunks: Buffer[] = [];

    audioStream.on("data", (chunk: Buffer) => {
      chunks.push(chunk);
    });

    audioStream.on("end", () => {
      try {
        tts.close();
      } catch {}
      resolve(Buffer.concat(chunks));
    });

    audioStream.on("error", (err: Error) => {
      try {
        tts.close();
      } catch {}
      reject(err);
    });
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      text,
      voice = "ar-EG-ShakirNeural",
      rate = "+0%",
      pitch = "+0Hz"
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    // Clean any vocal cues or bracketed direction from spoken text e.g. "(صوت لاهث ومرتعب)"
    const cleanedText = text
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\{[^}]*\}/g, "")
      .trim();

    if (!cleanedText) {
      return NextResponse.json({ error: "No speakable text found after cleaning cues" }, { status: 400 });
    }

    // Select valid Egyptian voice model
    const selectedVoice = voice.includes("Salma")
      ? "ar-EG-SalmaNeural"
      : "ar-EG-ShakirNeural";

    // Estimate realistic speaking duration based on Arabic word count (~ 2.5 - 3 words/sec)
    const wordCount = cleanedText.split(/\s+/).length;
    const estimatedDuration = Math.max(1.5, Math.round((wordCount * 0.42) * 10) / 10);

    // Generate real human Egyptian Arabic speech using Edge Neural TTS
    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeEdgeTts(cleanedText, selectedVoice, pitch, rate);
    } catch (edgeErr) {
      console.warn("Edge-TTS attempt failed, retrying once...", edgeErr);
      // Retry once with default pitch/rate
      audioBuffer = await synthesizeEdgeTts(cleanedText, selectedVoice);
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate Edge-TTS audio stream" },
        { status: 502 }
      );
    }

    const format = "audio/mp3";
    const base64Audio = `data:${format};base64,${audioBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      voice: selectedVoice,
      text: cleanedText,
      duration_seconds: estimatedDuration,
      audio_url: base64Audio,
      format,
      manifest: {
        voice_id: selectedVoice,
        timestamp: Date.now(),
        filesize_bytes: audioBuffer.length
      }
    });
  } catch (error) {
    console.error("TTS generation error:", error);
    return NextResponse.json(
      { error: "TTS generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
