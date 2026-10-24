"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, Search, Filter, BedDouble, Home, Users, QrCode, X, RefreshCw, 
  CheckCircle2, ChevronRight, Calendar, Info
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
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

  // Global Dates
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);

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
      setLoading(true);
      try {
        // If dates are missing, the API returns all rooms with their base status
        const qs = new URLSearchParams();
        if (checkIn) qs.set("checkIn", checkIn.toISOString());
        if (checkOut) qs.set("checkOut", checkOut.toISOString());
        
        const res = await fetch(`/api/room-booking/rooms?${qs.toString()}`, {
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
  }, [token, checkIn, checkOut]);

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

  return (
    <div className="min-h-screen bg-[#f5f7fa] pb-20 font-sans text-gray-800">
      
      {/* TOP NAVIGATION / SEARCH BAR (Sticky) */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                <Home size={20} className="text-[#0057ff]" /> Room Booking
              </h1>

              {/* DATE PICKERS */}
              <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200 w-full md:w-auto">
                <div className="flex flex-col px-3 py-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Check-in</span>
                  <DatePicker
                    selected={checkIn}
                    onChange={(date: Date | null) => setCheckIn(date)}
                    selectsStart
                    startDate={checkIn}
                    endDate={checkOut}
                    minDate={new Date()}
                    placeholderText="Select Date"
                    className="bg-transparent text-sm font-medium text-gray-900 outline-none w-28"
                  />
                </div>
                <div className="w-px h-8 bg-gray-300"></div>
                <div className="flex flex-col px-3 py-1">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex items-center gap-1"><Calendar size={12}/> Check-out</span>
                  <DatePicker
                    selected={checkOut}
                    onChange={(date: Date | null) => setCheckOut(date)}
                    selectsEnd
                    startDate={checkIn}
                    endDate={checkOut}
                    minDate={checkIn || new Date()}
                    placeholderText="Select Date"
                    className="bg-transparent text-sm font-medium text-gray-900 outline-none w-28"
                  />
                </div>
              </div>

              <div className="relative w-full md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search room..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#0057ff] outline-none transition-shadow"
                />
              </div>
            </div>

            <div className="flex items-center gap-3 w-full xl:w-auto overflow-x-auto pb-2 xl:pb-0">
              <Filter size={14} className="text-gray-500 shrink-0" />
              {(["tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierView(t)}
                  className={`px-4 py-2 rounded-md text-sm font-medium whitespace-nowrap transition-all ${
                    tierView === t 
                      ? "bg-[#0057ff] text-white shadow-sm" 
                      : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t === "tier2" ? "ACC Staff" : t === "tier3" ? "Family" : t === "tier4" ? "Co-Agency" : "Stakeholder"}
                </button>
              ))}
            </div>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-6">
        
        <div className="mb-6"><PendingBillBanner /></div>

        {/* PROMPT BANNER (If no dates selected) */}
        {(!checkIn || !checkOut) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-in fade-in">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-blue-900">Want to see exact availability?</h3>
              <p className="text-xs text-blue-700 mt-1">You are currently viewing general availability. Select your Check-in and Check-out dates in the top bar to see exactly which rooms are free for your specific stay.</p>
            </div>
          </div>
        )}

        {/* 1. AVAILABLE ROOMS */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-900">Available Rooms</h2>
            <span className="text-sm text-gray-500 font-medium">{bookableRooms.length} rooms found</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="animate-spin text-[#0057ff]" size={32} />
            </div>
          ) : bookableRooms.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-500 shadow-sm">
              No rooms match your search or are available for the selected dates.
            </div>
          ) : (
            <div className="space-y-6">
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

        {/* 2. RESIDENT ROOMS */}
        {residentRooms.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Resident Rooms <span className="text-sm font-normal text-gray-500">(Not bookable)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {residentRooms.map((r) => (
                <ResidentRoomCard key={r._id} room={r} onShowQr={() => openQrModal(r._id, r.roomNumber)} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* MODALS */}
      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ ...bookingModal, isOpen: false })}
        room={bookingModal.room}
        beds={bookingModal.beds}
        preselectedBedIds={bookingModal.bedIds}
      />

      {qrModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Room {qrModal.roomNumber} QR</h3>
              <button 
                onClick={() => setQrModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center min-h-[250px] bg-gray-50">
              {qrModal.loading ? (
                <Loader2 className="animate-spin text-[#0057ff]" size={32} />
              ) : qrModal.url ? (
                <img src={qrModal.url} alt="QR" className="w-48 h-48 object-contain mix-blend-multiply" />
              ) : (
                <p className="text-sm text-red-500">Failed to load.</p>
              )}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white flex justify-end">
              <button onClick={handleRegenerateQr} disabled={qrModal.loading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50">
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden flex flex-col relative shadow-sm opacity-80 hover:opacity-100 transition-opacity">
      <div className="aspect-video bg-gray-100 relative">
        {room.photos?.[0]?.url ? <img src={room.photos[0].url} alt={room.roomNumber} className="w-full h-full object-cover grayscale-[20%]" /> : <div className="flex items-center justify-center h-full text-gray-400"><Home size={32} /></div>}
        <div className="absolute top-2 left-2 bg-gray-900/80 backdrop-blur px-2.5 py-1 rounded text-[10px] font-bold text-white uppercase tracking-wider">Resident</div>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-gray-900 text-lg">{room.roomNumber}</h3>
          <span className="text-xs text-gray-500 font-medium">Floor {room.floor}</span>
        </div>
        <p className="text-xs text-gray-500">🔒 Occupied</p>
      </div>
      <button onClick={onShowQr} className="absolute bottom-4 right-4 p-2 bg-white border border-gray-200 text-gray-500 hover:text-[#0057ff] hover:border-[#0057ff] rounded shadow-sm transition" title="View Room QR Code">
        <QrCode size={16} />
      </button>
    </div>
  );
}

/* ─── BOOKABLE ROOM CARD (HORIZONTAL LAYOUT) ─── */
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
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col lg:flex-row">
      
      <div className="lg:w-[350px] shrink-0 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-200 relative">
        <div className="h-56 w-full relative">
          {primaryPhoto ? (
            <img src={primaryPhoto} alt={room.roomNumber} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100"><BedDouble size={48} /></div>
          )}
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur px-2.5 py-1 rounded shadow-sm text-xs font-bold text-gray-800 uppercase tracking-wide">
            {room.roomTypeName}
          </div>
        </div>
        
        <div className="p-4 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-xl text-gray-900">{room.roomNumber}</h3>
            <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Floor {room.floor}</span>
          </div>
          
          {room.description && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{room.description}</p>}
          
          <div className="flex flex-wrap gap-x-4 gap-y-2 mb-4 mt-auto">
            {room.amenities?.slice(0, 6).map((a) => (
              <div key={a} className="flex items-center gap-1.5 text-[11px] font-medium text-gray-600">
                <CheckCircle2 size={12} className="text-[#0057ff]" /> {a}
              </div>
            ))}
          </div>

          <button onClick={onShowQr} className="flex items-center justify-center gap-2 w-full py-2 border border-gray-300 rounded text-xs font-semibold text-gray-700 hover:bg-gray-50 transition">
            <QrCode size={14} /> View Room QR
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col bg-white">
        <div className="hidden md:grid grid-cols-12 gap-4 bg-gray-50/80 border-b border-gray-200 p-3 text-xs font-bold text-gray-600 uppercase tracking-wider">
          <div className="col-span-6">Your Choices</div>
          <div className="col-span-2 text-center">Sleeps</div>
          <div className="col-span-4 text-right pr-2">Today's Price</div>
        </div>

        <div className="flex-1 flex flex-col justify-center divide-y divide-gray-100">
          {room.beds.map((bed) => {
            const rate = bed.rates?.[tierView] || 0;
            const isAvailable = bed.status === "AVAILABLE";
            
            return (
              <div key={bed._id} className={`grid grid-cols-1 md:grid-cols-12 gap-4 p-4 items-center ${!isAvailable ? 'opacity-50 grayscale' : ''}`}>
                <div className="md:col-span-6 flex flex-col">
                  <div className="font-bold text-sm text-gray-900 mb-1 flex items-center gap-2">
                    Bed {bed.bedLabel} <span className="text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{bed.bedTypeCode}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-600">
                    <span className="flex items-center gap-1 text-green-700 font-medium"><CheckCircle2 size={12}/> Free Cancellation</span>
                    <span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-[#0057ff]"/> Instant Confirmation</span>
                  </div>
                </div>

                <div className="md:col-span-2 flex items-center justify-start md:justify-center gap-1 text-gray-700">
                  <Users size={16} />
                  <span className="text-sm font-medium">1</span>
                </div>

                <div className="md:col-span-4 flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 mt-3 md:mt-0">
                  <div className="text-right">
                    {isAvailable ? (
                      <>
                        <div className="text-xl font-bold text-gray-900">Nu. {rate.toLocaleString()}</div>
                        <div className="text-[10px] text-gray-500">Total (incl. taxes & fees)</div>
                      </>
                    ) : (
                      <div className="text-sm font-bold text-red-600 bg-red-50 px-2 py-1 rounded">Occupied</div>
                    )}
                  </div>

                  {isAvailable && (
                    <button 
                      onClick={() => onBook(room, [bed._id])} 
                      className="bg-[#0057ff] hover:bg-[#0046cc] text-white px-6 py-2 rounded font-bold text-sm transition shadow-sm w-full md:w-auto"
                    >
                      Reserve
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allAvailable && room.beds.length > 1 && (
          <div className="bg-gray-50 p-3 border-t border-gray-200 flex justify-end">
            <button 
              onClick={() => onBook(room, room.beds.map((b) => b._id))} 
              className="text-sm font-bold text-[#0057ff] hover:underline flex items-center gap-1"
            >
              Book Entire Room <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}