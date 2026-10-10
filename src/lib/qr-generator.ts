// lib/qr-generator.ts
import QRCode from "qrcode";
import { uploadFile } from "@/lib/storage";

/**
 * Generate a QR data URL (base64 PNG).
 */
export async function generateQRDataURL(
  text: string,
  options?: { size?: number; margin?: number },
): Promise<string> {
  return QRCode.toDataURL(text, {
    width: options?.size || 400,
    margin: options?.margin || 2,
    color: { dark: "#000000", light: "#FFFFFF" },
    errorCorrectionLevel: "H",
  });
}

/**
 * Extract the base64 buffer from a data URL.
 */
function dataUrlToBuffer(dataUrl: string): {
  buffer: Buffer;
  contentType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Invalid data URL");
  return {
    contentType: match[1],
    buffer: Buffer.from(match[2], "base64"),
  };
}

/**
 * Generate a room QR code and save to local storage.
 */
export async function generateRoomQR(
  roomNumber: string,
  baseUrl?: string,
): Promise<{ url: string; key: string }> {
  const appUrl =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.acc.org.bt";
  const qrTarget = `${appUrl}/room-booking/public/room/${roomNumber}`;

  const dataUrl = await generateQRDataURL(qrTarget, { size: 600 });
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);

  const result = await uploadFile(buffer, {
    folder: "qrcodes/rooms",
    filename: `room-${roomNumber.toLowerCase()}`,
    originalName: `room-${roomNumber.toLowerCase()}.png`,
    contentType,
  });

  return { url: result.url, key: result.key };
}

/**
 * Generate an amenity QR code (for issue reporting).
 */
export async function generateAmenityQR(
  roomNumber: string,
  amenityCode: string,
  baseUrl?: string,
): Promise<{ url: string; key: string }> {
  const appUrl =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.acc.org.bt";
  const qrTarget = `${appUrl}/room-booking/public/amenity/${roomNumber}/${amenityCode}`;

  const dataUrl = await generateQRDataURL(qrTarget, { size: 500 });
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);

  const result = await uploadFile(buffer, {
    folder: "qrcodes/amenities",
    filename: `amenity-${roomNumber.toLowerCase()}-${amenityCode.toLowerCase()}`,
    originalName: `amenity-${roomNumber.toLowerCase()}-${amenityCode.toLowerCase()}.png`,
    contentType,
  });

  return { url: result.url, key: result.key };
}

/**
 * Generate a check-in QR (booking reference embedded).
 */
export async function generateCheckInQR(
  bookingRef: string,
  baseUrl?: string,
): Promise<{ url: string; key: string }> {
  const appUrl =
    baseUrl || process.env.NEXT_PUBLIC_APP_URL || "https://app.acc.org.bt";
  const qrTarget = `${appUrl}/room-booking/public/checkin/${bookingRef}`;

  const dataUrl = await generateQRDataURL(qrTarget, { size: 500 });
  const { buffer, contentType } = dataUrlToBuffer(dataUrl);

  const result = await uploadFile(buffer, {
    folder: "qrcodes/checkins",
    filename: `checkin-${bookingRef.replace(/\//g, "-").toLowerCase()}`,
    originalName: `checkin-${bookingRef.replace(/\//g, "-").toLowerCase()}.png`,
    contentType,
  });

  return { url: result.url, key: result.key };
}