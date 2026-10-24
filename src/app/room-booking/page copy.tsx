"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Filter, BedDouble, Home, Users } from "lucide-react";
import PendingBillBanner from "@/components/room-booking/PendingBillBanner";
import BedStatusBadge from "@/components/room-booking/BedStatusBadge";

interface Bed {
  _id: string;
  bedLabel: string;
  bedTypeCode: string;
  status: string;
  rates: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
}

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
  photos: { url: string; key: string; isPrimary: boolean }[];
  beds: Bed[];
  bedSummary: { total: number; available: number; occupied: number; reserved: number; maintenance: number };
  isResidentRoom: boolean;
  status: string;
}

export default function RoomBookingLandingPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierView, setTierView] = useState<"tier1" | "tier2" | "tier3" | "tier4" | "tier5">("tier2");
  const [filterType, setFilterType] = useState<string>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/rooms", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRooms(data.rooms || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleBook = (roomId: string, bedIds: string[] = []) => {
    const qs = new URLSearchParams();
    qs.set("roomId", roomId);
    if (bedIds.length > 0) qs.set("bedIds", bedIds.join(","));
    router.push(`/room-booking/book?${qs.toString()}`);
  };

  const filtered = rooms.filter((r) => {
    if (search && !r.roomNumber.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterType !== "ALL" && r.roomTypeCode !== filterType) return false;
    return true;
  });

  const residentRooms = filtered.filter((r) => r.isResidentRoom);
  const bookableRooms = filtered.filter((r) => !r.isResidentRoom);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Home size={28} /> Room Booking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            ACC Phuntsholing Regional Office — Bed-level accommodation
          </p>
        </div>

        {/* Pending bill banner */}
        <div className="mb-4">
          <PendingBillBanner />
        </div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room number..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm"
              >
                <option value="ALL">All Room Types</option>
                <option value="STANDARD">Standard</option>
                <option value="STANDARD_DOUBLE">Standard Double</option>
                <option value="EXECUTIVE">Executive</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-3">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs text-gray-500">Show rates for:</span>
            {(["tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierView(t)}
                className={`px-3 py-1 rounded-full text-xs font-medium ${
                  tierView === t ? "bg-black text-white" : "bg-gray-100 text-gray-600"
                }`}
              >
                {t === "tier2" ? "ACC Staff" : t === "tier3" ? "Family" : t === "tier4" ? "Co-Agency" : "Stakeholder"}
              </button>
            ))}
          </div>
        </div>

        {/* Resident Rooms */}
        {residentRooms.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3 flex items-center gap-2">
              🏠 Resident Rooms <span className="text-xs text-gray-400 font-normal">(not bookable)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {residentRooms.map((r) => (
                <ResidentRoomCard key={r._id} room={r} />
              ))}
            </div>
          </div>
        )}

        {/* Bookable Rooms */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3">
            🛏️ Available Rooms
          </h2>
          {bookableRooms.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
              No rooms match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bookableRooms.map((r) => (
                <BookableRoomCard
                  key={r._id}
                  room={r}
                  tierView={tierView}
                  onBook={handleBook}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── RESIDENT ROOM CARD ─── */
function ResidentRoomCard({ room }: { room: Room }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-90">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
        {room.photos?.[0]?.url ? (
          <img src={room.photos[0].url} alt={room.roomNumber} className="w-full h-full object-cover" />
        ) : (
          <Home size={32} />
        )}
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{room.roomNumber}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
            Resident
          </span>
        </div>
        <p className="text-xs text-gray-500">Floor {room.floor}</p>
        <p className="text-sm text-gray-700 mt-2">🔒 Occupied</p>
      </div>
    </div>
  );
}

/* ─── BOOKABLE ROOM CARD ─── */
function BookableRoomCard({
  room,
  tierView,
  onBook,
}: {
  room: Room;
  tierView: "tier1" | "tier2" | "tier3" | "tier4" | "tier5";
  onBook: (roomId: string, bedIds?: string[]) => void;
}) {
  const availableBeds = room.beds.filter((b) => b.status === "AVAILABLE");
  const allAvailable = availableBeds.length === room.beds.length && room.beds.length > 0;
  const primaryPhoto = room.photos?.find((p) => p.isPrimary)?.url || room.photos?.[0]?.url;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow flex flex-col">
      {/* Photo */}
      <div className="aspect-video bg-gray-100 relative">
        {primaryPhoto ? (
          <img src={primaryPhoto} alt={room.roomNumber} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <BedDouble size={40} />
          </div>
        )}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-medium">
          {room.roomTypeName}
        </div>
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1">
          <Users size={11} /> {availableBeds.length}/{room.beds.length}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{room.roomNumber}</h3>
          <span className="text-xs text-gray-500">Floor {room.floor}</span>
        </div>
        {room.description && (
          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{room.description}</p>
        )}

        {/* Amenities icons (simple text) */}
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {room.amenities.slice(0, 5).map((a) => (
              <span key={a} className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Bed rows */}
        <div className="space-y-2 mb-3 mt-auto">
          {room.beds.map((bed) => {
            const rate = bed.rates?.[tierView] || 0;
            const isAvailable = bed.status === "AVAILABLE";
            return (
              <div
                key={bed._id}
                className={`flex items-center justify-between p-2 rounded-lg border ${
                  isAvailable ? "border-gray-200 bg-gray-50" : "border-gray-100 bg-gray-50 opacity-60"
                }`}
              >
                <div>
                  <p className="text-xs font-medium text-gray-800">
                    Bed {bed.bedLabel} · {bed.bedTypeCode}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Nu. {rate}/night
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BedStatusBadge status={bed.status} size="sm" />
                  {isAvailable && (
                    <button
                      onClick={() => onBook(room._id, [bed._id])}
                      className="text-[11px] px-2 py-1 bg-black text-white rounded font-medium hover:bg-gray-800"
                    >
                      Book
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Whole-room button */}
        {allAvailable && room.beds.length > 1 && (
          <button
            onClick={() => onBook(room._id, room.beds.map((b) => b._id))}
            className="w-full text-xs py-2 border border-black text-black rounded-md font-medium hover:bg-black hover:text-white transition"
          >
            Book Whole Room
          </button>
        )}

        {availableBeds.length === 0 && (
          <p className="text-xs text-center text-gray-500 py-2">
            🔒 Fully Occupied
          </p>
        )}
      </div>
    </div>
  );
}