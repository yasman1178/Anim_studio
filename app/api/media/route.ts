import { NextRequest, NextResponse } from "next/server";
import { PublicBlobStorage } from "@/lib/blob-store";

// GET /api/media
// Critical Requirement: Returns ok: true with storage health and media inventory
export async function GET(req: NextRequest) {
  try {
    const stats = await PublicBlobStorage.stats();
    const blobs = await PublicBlobStorage.list();
    const searchParams = req.nextUrl.searchParams;
    const pathname = searchParams.get("pathname");

    if (pathname) {
      const blob = await PublicBlobStorage.get(pathname);
      if (!blob) {
        return NextResponse.json({ ok: false, error: "Media not found" }, { status: 404 });
      }
      return NextResponse.json({ ok: true, blob });
    }

    return NextResponse.json({
      ok: true,
      service: "Anime Dub Studio - Public Blob Storage",
      status: "ready",
      storage_type: "public-blob",
      version: "v18-edge",
      stats: {
        total_files: stats.count,
        total_bytes: stats.totalBytes,
        total_formatted: `${(stats.totalBytes / (1024 * 1024)).toFixed(2)} MB`
      },
      media: blobs.map((b) => ({
        url: b.url,
        pathname: b.pathname,
        contentType: b.contentType,
        size: b.size,
        uploadedAt: b.uploadedAt
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Internal media error", details: String(error) },
      { status: 500 }
    );
  }
}

// POST /api/media - Upload media asset directly
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const customPath = (formData.get("pathname") as string) || (file ? file.name : `media_${Date.now()}`);

      if (!file) {
        return NextResponse.json({ ok: false, error: "No file uploaded" }, { status: 400 });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const savedBlob = await PublicBlobStorage.put(customPath, buffer, {
        contentType: file.type || "application/octet-stream",
      });

      return NextResponse.json({
        ok: true,
        message: "Media uploaded successfully",
        blob: savedBlob,
      });
    }

    // JSON upload with Base64 payload
    const body = await req.json();
    const { pathname, dataBase64, mimeType = "audio/mp3" } = body;

    if (!pathname || !dataBase64) {
      return NextResponse.json(
        { ok: false, error: "Missing pathname or dataBase64" },
        { status: 400 }
      );
    }

    const cleanBase64 = dataBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(cleanBase64, "base64");
    const savedBlob = await PublicBlobStorage.put(pathname, buffer, {
      contentType: mimeType,
    });

    return NextResponse.json({
      ok: true,
      message: "Media uploaded successfully via base64",
      blob: savedBlob,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Upload failed", details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE /api/media
export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const pathname = searchParams.get("pathname");

    if (!pathname) {
      return NextResponse.json({ ok: false, error: "Missing pathname" }, { status: 400 });
    }

    const deleted = await PublicBlobStorage.del(pathname);
    return NextResponse.json({ ok: true, deleted, pathname });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: "Deletion failed", details: String(error) },
      { status: 500 }
    );
  }
}
