// src/components/room-booking/RoomPhotoUploader.tsx
"use client";

import { useRef, useState } from "react";
import { Upload, X, Loader2, Star } from "lucide-react";

export interface RoomPhoto {
  url: string;
  key: string;
  order: number;
  isPrimary: boolean;
  uploadedAt?: string | Date;
}

interface Props {
  roomId: string;
  photos: RoomPhoto[];
  onChange: (photos: RoomPhoto[]) => void;
}

export default function RoomPhotoUploader({ roomId, photos, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleUpload = async (file: File) => {
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch(`/api/room-booking/rooms/${roomId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }

      const data = await res.json();
      onChange([...photos, data.photo]);
      notify("Photo uploaded", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const handleDelete = async (key: string) => {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch(
        `/api/room-booking/rooms/${roomId}/upload?key=${encodeURIComponent(key)}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) throw new Error("Delete failed");
      onChange(photos.filter((p) => p.key !== key));
      notify("Photo deleted", "success");
    } catch {
      notify("Delete failed", "error");
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-4 py-2 rounded-lg text-white text-sm ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Room Photos ({photos.length})
        </h3>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="animate-spin" size={14} />
          ) : (
            <Upload size={14} />
          )}
          Upload Photo
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleUpload(f);
          }}
        />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-200 rounded-lg">
          No photos yet. Click Upload to add.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {photos.map((p) => (
            <div
              key={p.key}
              className="relative aspect-video rounded-lg overflow-hidden group border border-gray-200"
            >
              <img src={p.url} alt="Room" className="w-full h-full object-cover" />
              {p.isPrimary && (
                <div className="absolute top-1 left-1 bg-black text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                  <Star size={10} fill="white" /> Primary
                </div>
              )}
              <button
                onClick={() => handleDelete(p.key)}
                className="absolute top-1 right-1 bg-red-600 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition"
                title="Delete"
              >
                <X size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}