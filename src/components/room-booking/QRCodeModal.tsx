// src/components/room-booking/QRCodeModal.tsx
"use client";

import { useState } from "react";
import { X, QrCode, Loader2, Download, RefreshCw } from "lucide-react";

interface Props {
  roomId: string;
  roomNumber: string;
  qrCodeUrl?: string | null;
  onClose: () => void;
  onGenerated?: (url: string) => void;
}

export default function QRCodeModal({
  roomId,
  roomNumber,
  qrCodeUrl,
  onClose,
  onGenerated,
}: Props) {
  const [url, setUrl] = useState<string | null>(qrCodeUrl || null);
  const [generating, setGenerating] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch(`/api/room-booking/rooms/${roomId}/qrcode`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Generation failed");
      const data = await res.json();
      setUrl(data.url);
      onGenerated?.(data.url);
      setNotification("QR code generated successfully");
      setTimeout(() => setNotification(null), 2500);
    } catch {
      setNotification("Failed to generate QR code");
      setTimeout(() => setNotification(null), 2500);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownload = () => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `room-${roomNumber}-qr.png`;
    a.target = "_blank";
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <QrCode size={18} />
            <h2 className="font-semibold text-gray-900">
              Room {roomNumber} — QR Code
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
            title="Close"
          >
            <X size={18} />
          </button>
        </div>

        {notification && (
          <div className="px-5 py-2 text-xs text-center bg-blue-50 text-blue-700">
            {notification}
          </div>
        )}

        <div className="p-6">
          {url ? (
            <div className="flex flex-col items-center">
              <img
                src={url}
                alt={`QR for Room ${roomNumber}`}
                className="w-64 h-64 border border-gray-200 rounded-lg p-2"
              />
              <p className="text-xs text-gray-500 mt-3 text-center">
                Scan to view room info, amenities &amp; contact
              </p>
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-md text-xs"
                >
                  <Download size={14} /> Download
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-md text-xs disabled:opacity-50"
                >
                  {generating ? (
                    <Loader2 className="animate-spin" size={14} />
                  ) : (
                    <RefreshCw size={14} />
                  )}
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center py-8">
              <QrCode size={48} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500 mb-4">
                No QR code yet for this room
              </p>
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
              >
                {generating ? (
                  <Loader2 className="animate-spin" size={16} />
                ) : (
                  <QrCode size={16} />
                )}
                Generate QR Code
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}