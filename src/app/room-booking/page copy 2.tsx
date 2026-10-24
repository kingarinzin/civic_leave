"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Search, Filter, BedDouble, Home, Users, QrCode, X, RefreshCw } from "lucide-react";
import PendingBillBanner from "@/components/room-booking/PendingBillBanner";
import BedStatusBadge from "@/components/room-booking/BedStatusBadge";
import BookingModal from "@/components/room-booking/BookingModal";

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
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierView, setTierView] = useState<"tier1" | "tier2" | "tier3" | "tier4" | "tier5">("tier2");
  const [filterType, setFilterType] = useState<string>("ALL");

  // State for the Booking Modal
  const [bookingModal, setBookingModal] = useState<{ 
    isOpen: boolean; 
    room: Room | null; 
    beds: Bed[]; 
    bedIds: string[] 
  }>({
    isOpen: false,
    room: null,
    beds: [],
    bedIds: [],
  });

  // State for the QR Code Modal
  const [qrModal, setQrModal] = useState<{ isOpen: boolean; roomId: string; roomNumber: string; url: string; loading: boolean }>({
    isOpen: false,
    roomId: "",
    roomNumber: "",
    url: "",
    loading: false,
  });

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
  }, [token]);

  const handleBook = (room: Room, bedIds: string[] = []) => {
    setBookingModal({ 
      isOpen: true, 
      room, 
      beds: room.beds, 
      bedIds 
    });
  };

  const openQrModal = async (roomId: string, roomNumber: string) => {
    setQrModal({ isOpen: true, roomId, roomNumber, url: "", loading: true });
    try {
      const res = await fetch(`/api/room-booking/rooms/${roomId}/qrcode`);
      const data = await res.json();
      if (data.qrUrl) {
        setQrModal(prev => ({ ...prev, url: data.qrUrl, loading: false }));
      } else {
        alert("Failed to load QR Code");
        setQrModal(prev => ({ ...prev, isOpen: false, loading: false }));
      }
    } catch (err) {
      alert("Error loading QR Code");
      setQrModal(prev => ({ ...prev, isOpen: false, loading: false }));
    }
  };

  const handleRegenerateQr = async () => {
    if (!qrModal.roomId) return;
    setQrModal(prev => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`/api/room-booking/rooms/${qrModal.roomId}/qrcode`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Regeneration failed");
      const data = await res.json();
      setQrModal(prev => ({ ...prev, url: data.url, loading: false }));
    } catch (err) {
      alert("Error regenerating QR code.");
      setQrModal(prev => ({ ...prev, loading: false }));
    }
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

        <div className="mb-4"><PendingBillBanner /></div>

        {/* Search + Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search room number..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-black outline-none transition-shadow"
              />
            </div>
            <div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-black outline-none transition-shadow bg-white"
              >
                <option value="ALL">All Room Types</option>
                <option value="STANDARD">Standard</option>
                <option value="STANDARD_DOUBLE">Standard Double</option>
                <option value="EXECUTIVE">Executive</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Filter size={14} className="text-gray-500" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Show rates for:</span>
            {(["tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTierView(t)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                  tierView === t ? "bg-black text-white shadow-sm" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {t === "tier2" ? "ACC Staff" : t === "tier3" ? "Family" : t === "tier4" ? "Co-Agency" : "Stakeholder"}
              </button>
            ))}
          </div>
        </div>

        {/* 1. BOOKABLE ROOMS (Now at the top) */}
        <div className="mb-12">
          <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
            🛏️ Available Rooms
          </h2>
          {bookableRooms.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              No rooms match your search.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookableRooms.map((r) => (
                <BookableRoomCard
                  key={r._id}
                  room={r}
                  tierView={tierView}
                  onBook={handleBook}
                  onShowQr={() => openQrModal(r._id, r.roomNumber)}
                />
              ))}
            </div>
          )}
        </div>

        {/* 2. RESIDENT ROOMS (Now at the bottom) */}
        {residentRooms.length > 0 && (
          <div>
            <h2 className="text-sm font-bold text-gray-800 uppercase tracking-wide mb-4 flex items-center gap-2">
              🏠 Resident Rooms <span className="text-xs text-gray-400 font-normal normal-case">(not bookable)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {residentRooms.map((r) => (
                <ResidentRoomCard key={r._id} room={r} onShowQr={() => openQrModal(r._id, r.roomNumber)} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* BOOKING MODAL */}
      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ ...bookingModal, isOpen: false })}
        room={bookingModal.room}
        beds={bookingModal.beds}
        preselectedBedIds={bookingModal.bedIds}
      />

      {/* QR CODE MODAL */}
      {qrModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50">
              <h3 className="font-semibold text-gray-900">Room {qrModal.roomNumber} QR</h3>
              <button 
                onClick={() => setQrModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-gray-500 hover:bg-gray-200 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[250px]">
              {qrModal.loading ? (
                <Loader2 className="animate-spin text-gray-400" size={32} />
              ) : qrModal.url ? (
                <img src={qrModal.url} alt="QR" className="w-48 h-48 object-contain" />
              ) : (
                <p className="text-sm text-red-500">Failed to load.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
              <button onClick={handleRegenerateQr} disabled={qrModal.loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50">
                <RefreshCw size={14} className={qrModal.loading ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── RESIDENT ROOM CARD ─── */
function ResidentRoomCard({ room, onShowQr }: { room: Room; onShowQr: () => void }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-80 flex flex-col relative shadow-sm">
      <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-400">
        {room.photos?.[0]?.url ? <img src={room.photos[0].url} alt={room.roomNumber} className="w-full h-full object-cover grayscale-[30%]" /> : <Home size={32} />}
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-gray-900">{room.roomNumber}</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">Resident</span>
        </div>
        <p className="text-xs text-gray-500">Floor {room.floor}</p>
        <p className="text-sm text-gray-700 mt-3 mb-8 font-medium">🔒 Occupied</p>
      </div>
      <button onClick={onShowQr} className="absolute bottom-4 right-4 p-2 bg-gray-50 border border-gray-200 text-gray-600 hover:text-black hover:bg-gray-100 rounded-lg transition shadow-sm" title="View Room QR Code">
        <QrCode size={18} />
      </button>
    </div>
  );
}

/* ─── BOOKABLE ROOM CARD ─── */
function BookableRoomCard({
  room,
  tierView,
  onBook,
  onShowQr,
}: {
  room: Room;
  tierView: "tier1" | "tier2" | "tier3" | "tier4" | "tier5";
  onBook: (room: Room, bedIds?: string[]) => void;
  onShowQr: () => void;
}) {
  const availableBeds = room.beds.filter((b) => b.status === "AVAILABLE");
  const allAvailable = availableBeds.length === room.beds.length && room.beds.length > 0;
  const primaryPhoto = room.photos?.find((p) => p.isPrimary)?.url || room.photos?.[0]?.url;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow flex flex-col relative">
      <div className="aspect-video bg-gray-100 relative">
        {primaryPhoto ? <img src={primaryPhoto} alt={room.roomNumber} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-gray-300"><BedDouble size={40} /></div>}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur px-2 py-1 rounded-md text-xs font-medium shadow-sm">{room.roomTypeName}</div>
        <div className="absolute top-2 right-2 bg-black/80 text-white px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 shadow-sm"><Users size={11} /> {availableBeds.length}/{room.beds.length}</div>
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-bold text-gray-900 text-lg">{room.roomNumber}</h3>
          <span className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-1 rounded-md">Floor {room.floor}</span>
        </div>
        
        {room.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{room.description}</p>}
        
        {room.amenities && room.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {room.amenities.slice(0, 5).map((a) => <span key={a} className="text-[10px] px-2 py-1 bg-gray-50 border border-gray-100 text-gray-600 rounded-md uppercase tracking-wider font-medium">{a}</span>)}
          </div>
        )}

        <div className="space-y-2 mb-14 mt-auto">
          {room.beds.map((bed) => {
            const rate = bed.rates?.[tierView] || 0;
            const isAvailable = bed.status === "AVAILABLE";
            return (
              <div key={bed._id} className={`flex items-center justify-between p-3 rounded-lg border ${isAvailable ? "border-gray-200 bg-gray-50/50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                <div>
                  <p className="text-xs font-bold text-gray-800">Bed {bed.bedLabel} <span className="text-gray-400 font-normal">· {bed.bedTypeCode}</span></p>
                  <p className="text-[11px] font-medium text-gray-500 mt-0.5">Nu. {rate}/night</p>
                </div>
                <div className="flex items-center gap-2">
                  <BedStatusBadge status={bed.status} size="sm" />
                  {isAvailable && (
                    <button onClick={() => onBook(room, [bed._id])} className="text-[11px] px-3 py-1.5 bg-black text-white rounded-md font-medium hover:bg-gray-800 transition shadow-sm">Book</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allAvailable && room.beds.length > 1 && (
          <button onClick={() => onBook(room, room.beds.map((b) => b._id))} className="w-full text-xs py-2.5 mb-2 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition">
            Book Whole Room
          </button>
        )}
        {availableBeds.length === 0 && <p className="text-xs text-center font-medium text-gray-500 py-2 mb-2 bg-gray-50 rounded-lg">🔒 Fully Occupied</p>}
      </div>

      <button onClick={onShowQr} className="absolute bottom-5 right-5 p-2 bg-white border border-gray-200 text-gray-500 hover:text-black hover:bg-gray-50 rounded-lg transition shadow-sm" title="View Room QR Code">
        <QrCode size={18} />
      </button>
    </div>
  );
}