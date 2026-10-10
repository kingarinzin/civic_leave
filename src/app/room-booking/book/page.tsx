"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, ArrowLeft } from "lucide-react";
import BookingWizard from "@/components/room-booking/BookingWizard";

function BookPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const roomId = searchParams.get("roomId") || "";
  const preselectedBedIds = (searchParams.get("bedIds") || "")
    .split(",")
    .filter(Boolean);

  const [room, setRoom] = useState<any>(null);
  const [beds, setBeds] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!roomId) {
      setError("No room selected");
      setLoading(false);
      return;
    }
    async function load() {
      try {
        const res = await fetch(`/api/room-booking/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load room");
        const data = await res.json();
        setRoom(data.room);
        setBeds(data.room.beds || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-gray-600">{error || "Room not found"}</p>
        <button
          onClick={() => router.push("/room-booking")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to room list
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-3xl mx-auto mb-4">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black"
        >
          <ArrowLeft size={16} /> Back
        </button>
      </div>
      <BookingWizard
        room={room}
        beds={beds}
        preselectedBedIds={preselectedBedIds}
      />
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    }>
      <BookPageInner />
    </Suspense>
  );
}