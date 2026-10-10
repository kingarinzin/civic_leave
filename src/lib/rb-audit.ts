// src/lib/rb-audit.ts
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type RBAuditAction =
  | "ROOM_CREATE"
  | "ROOM_UPDATE"
  | "ROOM_DELETE"
  | "ROOM_PHOTO_UPLOAD"
  | "ROOM_PHOTO_DELETE"
  | "ROOM_QR_GENERATE"
  | "BED_CREATE"
  | "BED_UPDATE"
  | "BED_DELETE"
  | "BED_STATUS_CHANGE"
  | "BULK_IMPORT";

export interface AuditEntry {
  action: RBAuditAction | string;
  performedByStaffId: string;
  targetType: string;
  targetId?: ObjectId | string;
  ipAddress?: string;
  details?: Record<string, any>;
}

/**
 * Write a single audit log entry. Never throws.
 */
export async function logAudit(entry: AuditEntry): Promise<boolean> {
  try {
    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    await db.collection("rb_audit").insertOne({
      action: entry.action,
      performedByStaffId: new ObjectId(entry.performedByStaffId),
      targetType: entry.targetType,
      targetId: entry.targetId
        ? typeof entry.targetId === "string"
          ? new ObjectId(entry.targetId)
          : entry.targetId
        : null,
      ipAddress: entry.ipAddress || "unknown",
      details: entry.details || {},
      createdAt: new Date(),
    });

    return true;
  } catch (err) {
    console.error("[RB AUDIT ERROR]", err);
    return false;
  }
}

/**
 * Convenience — get client IP from NextRequest.
 */
export function getClientIP(req: Request): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown"
  );
}