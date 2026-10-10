"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, Wifi, Snowflake, Flame, Droplet, Tv, Bath, Refrigerator,
  DoorOpen, Briefcase, Shirt, Phone, AlertCircle,
} from "lucide-react";

interface RoomPublic {
  roomNumber: string;
  roomName: string;
  roomTypeCode: string;
  floor: number;
  areaSqm: number;
  description: string;
  amenities: string[];
  photos: { url: string; isPrimary: boolean }[];
  wifiPassword: string | null;
  emergencyContact: string | null;
}

const AMENITY_ICONS: Record<string, React.ComponentType<any>> = {
  WIFI: Wifi,
  AC: Snowflake,
  HEATER: Flame,
  HOT_WATER: Droplet,
  TV: Tv,
  BATHTUB: Bath,
  MINI_FRIDGE: Refrigerator,
  BALCONY: DoorOpen,
  WORK_DESK: Briefcase,
  WARDROBE: Shirt,
};

const AMENITY_LABELS: Record<string, string> = {
  WIFI: "WiFi",
  AC: "Air Conditioning",
  HEATER: "Room Heater",
  HOT_WATER: "Hot Water",
  TV: "Smart TV",
  BATHTUB: "Bathtub",
  MINI_FRIDGE: "Mini Fridge",
  BALCONY: "Balcony",
  WORK_DESK: "Work Desk",
  WARDROBE: "Wardrobe",
};

export default function PublicRoomPage() {
  const params = useParams();
  const roomNumber = params?.roomNumber as string;

  const [room, setRoom] = useState<RoomPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);

  useEffect(() => {
    if (!roomNumber) return;
    async function load() {
      try {
        const res = await fetch(
          `/api/room-booking/public/room/${roomNumber}`,
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to load room");
        }
        const data = await res.json();
        setRoom(data.room);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [roomNumber]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-gray-700">{error || "Room not found"}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Photo carousel */}
      {room.photos.length > 0 && (
        <div className="bg-white rounded-xl overflow-hidden border">
          <div className="aspect-video relative">
            <img
              src={room.photos[photoIndex].url}
              alt={room.roomNumber}
              className="w-full h-full object-cover"
            />
            {room.photos.length > 1 && (
              <>
                <button
                  onClick={() =>
                    setPhotoIndex(
                      (photoIndex - 1 + room.photos.length) % room.photos.length,
                    )
                  }
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
                >
                  ‹
                </button>
                <button
                  onClick={() =>
                    setPhotoIndex((photoIndex + 1) % room.photos.length)
                  }
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 rounded-full p-2 shadow"
                >
                  ›
                </button>
              </>
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1 rounded-full">
              {photoIndex + 1} / {room.photos.length}
            </div>
          </div>
        </div>
      )}

      {/* Room title */}
      <div className="bg-white rounded-xl border p-6">
        <h1 className="text-2xl font-bold text-gray-900">{room.roomNumber}</h1>
        <p className="text-sm text-gray-500 mt-1">{room.roomName}</p>

        <div className="flex flex-wrap gap-3 mt-4 text-sm text-gray-600">
          <span>📍 Floor {room.floor}</span>
          {room.areaSqm > 0 && <span>📐 {room.areaSqm} sq.m</span>}
        </div>

        {room.description && (
          <p className="text-sm text-gray-700 mt-4">{room.description}</p>
        )}
      </div>

      {/* WiFi + emergency */}
      {(room.wifiPassword || room.emergencyContact) && (
        <div className="bg-white rounded-xl border p-6 space-y-3">
          {room.wifiPassword && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-50 text-blue-700 rounded-lg">
                <Wifi size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">WiFi Password</p>
                <p className="font-mono text-sm font-medium">{room.wifiPassword}</p>
              </div>
            </div>
          )}
          {room.emergencyContact && (
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-50 text-red-700 rounded-lg">
                <Phone size={18} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Emergency</p>
                <a
                  href={`tel:${room.emergencyContact}`}
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {room.emergencyContact}
                </a>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Amenities */}
      {room.amenities && room.amenities.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-4">
            Amenities
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {room.amenities.map((a) => {
              const Icon = AMENITY_ICONS[a] || Droplet;
              return (
                <div
                  key={a}
                  className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg"
                >
                  <Icon size={16} className="text-gray-600" />
                  <span className="text-sm text-gray-700">
                    {AMENITY_LABELS[a] || a}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Report issue CTA */}
      <div className="bg-white rounded-xl border p-6 text-center">
        <p className="text-sm text-gray-600 mb-3">
          Something not working? Report an issue.
        </p>
        <a
          href={`/room-booking/public/amenity/${room.roomNumber}/GENERAL`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm"
        >
          <AlertCircle size={14} /> Report Issue
        </a>
      </div>
    </div>
  );
}