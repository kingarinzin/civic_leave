// src/lib/storage/index.ts
import fs from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

export type UploadOptions = {
  /** Logical folder, e.g. "rooms/PRO-101", "family-proofs", "qrcodes/rooms" */
  folder: string;
  /** Optional filename (without extension). Auto-generated if omitted. */
  filename?: string;
  /** Optional original filename (used to derive extension). */
  originalName?: string;
  /** Optional content type. */
  contentType?: string;
};

export type UploadResult = {
  /** Public URL to access the file. */
  url: string;
  /** Relative key (folder + filename). */
  key: string;
  /** File size in bytes. */
  size?: number;
  /** MIME type. */
  contentType?: string;
};

/**
 * Base directory for all Room Booking files.
 *
 * Priority:
 *   1. STORAGE_ROOT env var (set in .env.local)
 *   2. Hard-coded fallback (works regardless of PM2 cwd)
 *
 * Files go into:  <STORAGE_ROOT>/acc/room-booking/<folder>/<file>
 * Example:        /home/appplus/civic_leave/public/uploads/acc/room-booking/rooms/PRO-101/photo.webp
 */
const STORAGE_ROOT =
  process.env.STORAGE_ROOT ||
  "/home/appplus/civic_leave/public/uploads";

const BASE_DIR = path.join(STORAGE_ROOT, "acc", "room-booking");

/**
 * Public URL prefix.
 *
 * IMPORTANT: We serve files through an API route (not /public/) so that
 * newly-uploaded files are available immediately — without needing a rebuild.
 *
 * URL:    <APP_URL>/api/uploads/acc/room-booking/<folder>/<file>
 * Route:  src/app/api/uploads/[...path]/route.ts
 */
const PUBLIC_PREFIX = "/api/uploads/acc/room-booking";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Derive file extension from original name or content type.
 */
function extFromName(name?: string, contentType?: string): string {
  if (name && name.includes(".")) {
    return path.extname(name).toLowerCase();
  }
  const m: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "application/pdf": ".pdf",
  };
  return (contentType && m[contentType]) || ".bin";
}

/**
 * Upload a file buffer to local VM storage.
 *
 * Written to: <STORAGE_ROOT>/acc/room-booking/<folder>/<file>
 * Served at:  <APP_URL>/api/uploads/acc/room-booking/<folder>/<file>
 */
export async function uploadFile(
  fileBuffer: Buffer,
  options: UploadOptions,
): Promise<UploadResult> {
  const folder = options.folder.replace(/^\/+|\/+$/g, "");
  const ext = extFromName(options.originalName, options.contentType);
  const baseName =
    options.filename || `${Date.now()}-${randomBytes(6).toString("hex")}`;
  const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

  const targetDir = path.join(BASE_DIR, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const filePath = path.join(targetDir, fileName);
  await fs.writeFile(filePath, fileBuffer);

  const key = `${folder}/${fileName}`;
  const url = `${APP_URL}${PUBLIC_PREFIX}/${key}`;

  return {
    url,
    key,
    size: fileBuffer.length,
    contentType: options.contentType,
  };
}

/**
 * Delete a file by its relative key.
 */
export async function deleteFile(key: string): Promise<boolean> {
  try {
    const filePath = path.join(BASE_DIR, key);
    await fs.unlink(filePath);
    return true;
  } catch (err: any) {
    if (err?.code === "ENOENT") return true;
    console.error("[LOCAL STORAGE DELETE ERROR]", err);
    return false;
  }
}

/**
 * Check if a file exists.
 */
export async function fileExists(key: string): Promise<boolean> {
  try {
    await fs.access(path.join(BASE_DIR, key));
    return true;
  } catch {
    return false;
  }
}

/**
 * Absolute path of the storage root (for debug/admin tools).
 */
export function getStorageRoot(): string {
  return BASE_DIR;
}