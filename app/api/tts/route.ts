import { NextRequest, NextResponse } from "next/server";

// Real Arabic Natural Speech Synthesizer (MP3 Audio)
async function generateRealArabicSpeech(text: string): Promise<Buffer | null> {
  try {
    // Split into natural spoken clauses by punctuation or spaces to avoid URL limits
    const rawChunks = text.split(/([،,؛;.!؟?]+)/).filter(Boolean);
    const combinedChunks: string[] = [];
    let cur = "";

    for (const part of rawChunks) {
      if ((cur + part).length < 100) {
        cur += part;
      } else {
        if (cur.trim()) combinedChunks.push(cur.trim());
        cur = part;
      }
    }
    if (cur.trim()) combinedChunks.push(cur.trim());

    const buffers: Buffer[] = [];
    for (const chunk of combinedChunks) {
      if (!chunk.trim()) continue;
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(chunk.trim())}&tl=ar&client=tw-ob`;
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });
      if (res.ok) {
        const ab = await res.arrayBuffer();
        buffers.push(Buffer.from(ab));
      }
    }

    if (buffers.length > 0) {
      return Buffer.concat(buffers);
    }
    return null;
  } catch (err) {
    console.error("Arabic TTS fetch error:", err);
    return null;
  }
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

    // Estimate realistic speaking duration based on Arabic word count (~ 2.5 - 3 words/sec)
    const wordCount = cleanedText.split(/\s+/).length;
    const estimatedDuration = Math.max(1.8, Math.round((wordCount * 0.42) * 10) / 10);

    // Generate real human Arabic speech MP3 audio
    const audioBuffer = await generateRealArabicSpeech(cleanedText);

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate Arabic speech audio stream" },
        { status: 502 }
      );
    }

    const format = "audio/mp3";
    const base64Audio = `data:${format};base64,${audioBuffer.toString("base64")}`;

    return NextResponse.json({
      success: true,
      voice,
      text: cleanedText,
      duration_seconds: estimatedDuration,
      audio_url: base64Audio,
      format,
      manifest: {
        voice_id: voice,
        timestamp: Date.now(),
        filesize_bytes: audioBuffer.length
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: "TTS generation failed", details: String(error) },
      { status: 500 }
    );
  }
}
