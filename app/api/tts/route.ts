import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { PublicBlobStorage } from "@/lib/blob-store";

// V18 Official Voice Presets for Edge-TTS
const V18_VOICE_PRESETS: Record<string, { voice: string; rate: string; pitch: string; volume: string }> = {
  narrator: { voice: "ar-EG-ShakirNeural", rate: "+8%", pitch: "+0Hz", volume: "+0%" },
  tension: { voice: "ar-EG-ShakirNeural", rate: "+4%", pitch: "-6Hz", volume: "+0%" },
  excited: { voice: "ar-EG-ShakirNeural", rate: "+14%", pitch: "+6Hz", volume: "+5%" },
  sad: { voice: "ar-EG-ShakirNeural", rate: "-6%", pitch: "-4Hz", volume: "-5%" },
  beast: { voice: "ar-SA-HamedNeural", rate: "-8%", pitch: "-18Hz", volume: "+5%" },
  system: { voice: "ar-AE-HamdanNeural", rate: "-5%", pitch: "-10Hz", volume: "-3%" }
};

// Synthesize authentic Arabic speech with Edge Neural TTS
async function synthesizeEdgeTts(
  text: string,
  voiceName: string,
  pitch: string,
  rate: string,
  volume?: string
): Promise<Buffer> {
  const tts = new MsEdgeTTS();
  
  await tts.setMetadata(voiceName, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

  return new Promise((resolve, reject) => {
    const options: any = {};
    if (pitch && pitch !== "+0Hz") options.pitch = pitch;
    if (rate && rate !== "+0%") options.rate = rate;
    if (volume && volume !== "+0%") options.volume = volume;

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
      vocal_cue,
      voice,
      rate,
      pitch,
      volume,
      save_to_blob = true,
      filename
    } = body;

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
    }

    // Clean spoken text according to v18 rules (strip brackets, cues, extra dashes)
    const cleanedText = text
      .replace(/\([^)]*\)/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .replace(/\{[^}]*\}/g, "")
      .replace(/--+/g, ",")
      .replace(/—+/g, ",")
      .trim();

    if (!cleanedText) {
      return NextResponse.json({ error: "No speakable text found after cleaning cues" }, { status: 400 });
    }

    // Determine voice settings from v18 preset or fallback
    const cueKey = (vocal_cue || "").toLowerCase().trim();
    const preset = V18_VOICE_PRESETS[cueKey];

    const selectedVoice = voice || preset?.voice || (cueKey.includes("salma") || cueKey.includes("sara") ? "ar-EG-SalmaNeural" : "ar-EG-ShakirNeural");
    const selectedRate = rate || preset?.rate || "+8%";
    const selectedPitch = pitch || preset?.pitch || "+0Hz";
    const selectedVolume = volume || preset?.volume || "+0%";

    // Estimate speaking duration in Arabic (~ 2.5 - 3 words/sec)
    const wordCount = cleanedText.split(/\s+/).length;
    const estimatedDuration = Math.max(1.5, Math.round((wordCount * 0.42) * 10) / 10);

    let audioBuffer: Buffer;
    try {
      audioBuffer = await synthesizeEdgeTts(cleanedText, selectedVoice, selectedPitch, selectedRate, selectedVolume);
    } catch (edgeErr) {
      console.warn("Edge-TTS initial attempt failed, retrying with base settings...", edgeErr);
      audioBuffer = await synthesizeEdgeTts(cleanedText, selectedVoice, "+0Hz", "+0%");
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate Edge-TTS audio stream" },
        { status: 502 }
      );
    }

    const format = "audio/mp3";
    const base64Audio = `data:${format};base64,${audioBuffer.toString("base64")}`;

    // Optionally save to Public Blob Storage
    let publicBlobUrl = base64Audio;
    if (save_to_blob) {
      try {
        const blobPathname = filename || `tts_${selectedVoice}_${Date.now()}.mp3`;
        const blobItem = await PublicBlobStorage.put(blobPathname, audioBuffer, {
          contentType: format,
        });
        publicBlobUrl = blobItem.url;
      } catch (blobErr) {
        console.warn("Failed to store audio in Blob storage:", blobErr);
      }
    }

    return NextResponse.json({
      success: true,
      voice: selectedVoice,
      preset_applied: cueKey in V18_VOICE_PRESETS ? cueKey : "custom",
      rate: selectedRate,
      pitch: selectedPitch,
      volume: selectedVolume,
      text: cleanedText,
      duration_seconds: estimatedDuration,
      audio_url: publicBlobUrl,
      base64_url: base64Audio,
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
