// src/app/api/uploads/[...path]/route.ts
import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

const STORAGE_ROOT =
  process.env.STORAGE_ROOT ||
  "/home/appplus/civic_leave/public/uploads";

const MIME_MAP: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  try {
    const { path: segments } = await params;

    // Block path traversal
    if (segments.some((s) => s.includes("..") || s.includes("\0"))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const safePath = segments.join("/");
    const filePath = path.join(STORAGE_ROOT, safePath);

    // Ensure resolved path stays inside STORAGE_ROOT
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(STORAGE_ROOT))) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const file = await fs.readFile(resolved);
    const ext = path.extname(resolved).toLowerCase();
    const contentType = MIME_MAP[ext] || "application/octet-stream";

    return new NextResponse(file, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=2592000, immutable",
      },
    });
  } catch (err: any) {
    if (err?.code === "ENOENT") {
      return new NextResponse("Not found", { status: 404 });
    }
    console.error("[UPLOADS ROUTE ERROR]", err);
    return new NextResponse("Server error", { status: 500 });
  }
}
