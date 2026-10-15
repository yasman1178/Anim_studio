import { NextRequest, NextResponse } from "next/server";
import { PublicBlobStorage } from "@/lib/blob-store";

// GET /api/blob?pathname=...
// Streams the binary media content (audio/video/image) directly to the browser
export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pathname = searchParams.get("pathname");

    if (!pathname) {
      return NextResponse.json({ error: "Missing pathname parameter" }, { status: 400 });
    }

    const item = await PublicBlobStorage.get(pathname);
    if (!item || !item.dataBase64) {
      return NextResponse.json({ error: "Blob not found" }, { status: 404 });
    }

    const buffer = Buffer.from(item.dataBase64, "base64");

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": item.contentType || "application/octet-stream",
        "Content-Length": buffer.length.toString(),
        "Content-Disposition": item.contentDisposition || `inline; filename="${pathname.split('/').pop() || 'file'}"`,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Accept-Ranges": "bytes",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to stream blob", details: String(error) },
      { status: 500 }
    );
  }
}
