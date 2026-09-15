import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request, { params }) {
  try {
    const resolvedParams = await params;
    const pathArray = resolvedParams.path;

    if (!pathArray || pathArray.length === 0) {
      return NextResponse.json({ error: "No path provided" }, { status: 400 });
    }

    const filePath = path.join(process.cwd(), "uploads-data", ...pathArray);
    const normalizedPath = path.normalize(filePath);
    const uploadsRoot = path.join(process.cwd(), "uploads-data");

    if (!normalizedPath.startsWith(uploadsRoot)) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    if (!fs.existsSync(normalizedPath)) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const fileBuffer = fs.readFileSync(normalizedPath);

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentTypes = {
      ".pdf": "application/pdf",
      ".doc": "application/msword",
      ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
    };
    const contentType = contentTypes[ext] || "application/octet-stream";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": fileBuffer.length.toString(),
        "Content-Disposition": `inline; filename="${path.basename(normalizedPath)}"`,
      },
    });
  } catch (error) {
    console.error("File serving error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to serve file" },
      { status: 500 }
    );
  }
}
