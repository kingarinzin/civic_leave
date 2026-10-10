"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Pencil, QrCode, Search, X, Save, Image as ImageIcon } from "lucide-react";
import QRCodeModal from "@/components/room-booking/QRCodeModal";
import RoomPhotoUploader from "@/components/room-booking/RoomPhotoUploader";
import BedStatusBadge from "@/components/room-booking/BedStatusBadge";

interface Room {
  _id: string;
  roomNumber: string;
  roomName: string;
  roomTypeCode: string;
  roomTypeName: string;
  floor: number;
  areaSqm: number;
  description: string;
  amenities: string[];
  photos: any[];
  status: string;
  isResidentRoom: boolean;
  qrCodeUrl: string | null;
  beds: any[];
  bedSummary: { total: number; available: number; occupied: number; reserved: number; maintenance: number };
}

interface MasterItem {
  _id: string;
  code: string;
  name: string;
}

export default function AdminRoomsPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<MasterItem[]>([]);
  const [amenities, setAmenities] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [qrRoom, setQrRoom] = useState<Room | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [roomsRes, typesRes, amenRes] = await Promise.all([
        fetch("/api/room-booking/rooms", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/room-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/amenities", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const roomsData = await roomsRes.json();
      const typesData = await typesRes.json();
      const amenData = await amenRes.json();
      setRooms(roomsData.rooms || []);
      setRoomTypes(typesData.items || []);
      setAmenities(amenData.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = rooms.filter((r) =>
    r.roomNumber.toLowerCase().includes(search.toLowerCase()) ||
    r.roomTypeName.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Rooms</h1>
            <p className="text-sm text-gray-500 mt-1">Manage rooms and their beds</p>
          </div>
          <button
            onClick={() => router.push("/room-booking/admin/rooms/new")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm"
          >
            <Plus size={14} /> Add Room
          </button>
        </div>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search room..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={28} /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((r) => {
              const primaryPhoto = r.photos?.find((p: any) => p.isPrimary)?.url || r.photos?.[0]?.url;
              return (
                <div key={r._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="aspect-video bg-gray-100 relative">
                    {primaryPhoto ? (
                      <img src={primaryPhoto} alt={r.roomNumber} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ImageIcon size={32} />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{r.roomNumber}</h3>
                        <p className="text-xs text-gray-500">{r.roomTypeName} · Floor {r.floor}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${r.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                        {r.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-4 gap-1 mt-3 text-center text-xs">
                      <div className="bg-green-50 py-1 rounded"><p className="font-bold text-green-700">{r.bedSummary.available}</p><p className="text-[10px] text-gray-500">Free</p></div>
                      <div className="bg-gray-100 py-1 rounded"><p className="font-bold text-gray-700">{r.bedSummary.occupied}</p><p className="text-[10px] text-gray-500">Occ</p></div>
                      <div className="bg-amber-50 py-1 rounded"><p className="font-bold text-amber-700">{r.bedSummary.reserved}</p><p className="text-[10px] text-gray-500">Res</p></div>
                      <div className="bg-red-50 py-1 rounded"><p className="font-bold text-red-700">{r.bedSummary.maintenance}</p><p className="text-[10px] text-gray-500">Mnt</p></div>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <button
                        onClick={() => router.push(`/room-booking/admin/rooms/${r._id}`)}
                        className="flex-1 text-xs py-1.5 border rounded-md hover:bg-gray-50 flex items-center justify-center gap-1"
                      >
                        <Pencil size={12} /> Edit
                      </button>
                      <button
                        onClick={() => setQrRoom(r)}
                        className="text-xs py-1.5 px-3 border rounded-md hover:bg-gray-50"
                        title="QR Code"
                      >
                        <QrCode size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {qrRoom && (
          <QRCodeModal
            roomId={qrRoom._id}
            roomNumber={qrRoom.roomNumber}
            qrCodeUrl={qrRoom.qrCodeUrl}
            onClose={() => setQrRoom(null)}
            onGenerated={() => load()}
          />
        )}
      </div>
    </div>
  );
}