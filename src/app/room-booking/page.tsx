"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, Search, Filter, BedDouble, Home, Users, QrCode, X, RefreshCw, 
  CheckCircle2, Calendar, Info, ClipboardList
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
  
  // Check if user is admin
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const dashboardUrl = isAdmin ? "/admin/pending-users" : "/dashboard/leave";

  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [draftCheckIn, setDraftCheckIn] = useState<Date | null>(null);
  const [draftCheckOut, setDraftCheckOut] = useState<Date | null>(null);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierView, setTierView] = useState<"tier1" | "tier2" | "tier3" | "tier4" | "tier5">("tier2");
  const [filterType, setFilterType] = useState<string>("ALL");

  const [bookingModal, setBookingModal] = useState<{ 
    isOpen: boolean; 
    room: Room | null; 
    beds: Bed[]; 
    bedIds: string[] 
  }>({ isOpen: false, room: null, beds: [], bedIds: [] });

  const [qrModal, setQrModal] = useState<{ 
    isOpen: boolean; 
    roomId: string; 
    roomNumber: string; 
    url: string; 
    loading: boolean;
    position: { x: number, y: number } | null;
  }>({
    isOpen: false, roomId: "", roomNumber: "", url: "", loading: false, position: null,
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
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

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setQrModal(prev => ({ ...prev, isOpen: false }));
      }
    }
    function handleScroll() {
      if (qrModal.isOpen) setQrModal(prev => ({ ...prev, isOpen: false }));
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [qrModal.isOpen]);

  const nights = checkIn && checkOut 
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24))) 
    : 0;

  const formatDateDisplay = (date: Date | null) => {
    if (!date) return "";
    return date.toLocaleDateString("en-US", { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const handleApplyDates = () => {
    if (!draftCheckIn || !draftCheckOut) return alert("Please select both dates");
    setCheckIn(draftCheckIn);
    setCheckOut(draftCheckOut);
    setIsDatePickerOpen(false);
  };

  const handleBook = (room: Room, bedIds: string[] = []) => {
    setBookingModal({ isOpen: true, room, beds: room.beds, bedIds });
  };

  const openQrModal = async (e: React.MouseEvent, roomId: string, roomNumber: string) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const spaceRight = window.innerWidth - rect.right;
    const xPos = spaceRight > 300 ? rect.right + 10 : rect.left - 290;

    setQrModal({ 
      isOpen: true, roomId, roomNumber, url: "", loading: true,
      position: { x: xPos, y: rect.top }
    });

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
      
      {/* TOP NAVIGATION / SEARCH BAR */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm relative">
        <div className="max-w-[1400px] mx-auto px-4 md:px-6 py-4">
          <div className="flex flex-col xl:flex-row items-center justify-between gap-4">
            
            <div className="flex flex-col md:flex-row items-center gap-4 w-full xl:w-auto">
              
              {/* DYNAMIC HOME BUTTON */}
              <button 
                onClick={() => router.push(dashboardUrl)}
                className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors shrink-0"
                title="Back to Dashboard"
              >
                <Home size={20} />
              </button>

              <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 whitespace-nowrap">
                Room Booking
              </h1>

              <div className="flex items-center bg-white border-2 border-[#b5d3ff] rounded-xl shadow-[0_2px_10px_-4px_rgba(0,87,255,0.3)] w-full xl:w-[600px] overflow-hidden h-14 transition-all hover:border-[#0057ff]">
                <button 
                  onClick={() => {
                    setDraftCheckIn(checkIn);
                    setDraftCheckOut(checkOut);
                    setIsDatePickerOpen(true);
                  }}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-gray-50 transition border-r border-gray-200 h-full w-full md:w-auto"
                >
                  <Calendar size={20} className="text-gray-400 shrink-0" />
                  <div className="flex items-center gap-2 text-[15px]">
                    <span className="font-bold text-gray-900">{checkIn ? formatDateDisplay(checkIn) : "Check-in"}</span>
                    <span className="text-gray-400 font-medium">-</span>
                    <span className="font-bold text-gray-900">{checkOut ? formatDateDisplay(checkOut) : "Check-out"}</span>
                  </div>
                  {nights > 0 && (
                    <div className="bg-gray-100 text-gray-600 text-xs font-bold px-2.5 py-1 rounded-full ml-2 border border-gray-200">
                      {nights} night{nights > 1 ? "s" : ""}
                    </div>
                  )}
                </button>

                <div className="relative flex-1 flex items-center px-4 h-full bg-gray-50 hover:bg-gray-100 transition-colors cursor-text">
                  <Search className="text-gray-500 shrink-0" size={18} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search room..."
                    className="w-full pl-3 bg-transparent text-[15px] font-medium focus:outline-none placeholder-gray-500"
                  />
                </div>
              </div>

              <button 
                onClick={() => router.push("/room-booking/my-bookings")}
                className="flex items-center gap-2 bg-gray-900 hover:bg-black text-white px-5 py-2.5 rounded-lg font-bold text-sm transition shadow-sm whitespace-nowrap"
              >
                <ClipboardList size={18} /> My Bookings
              </button>
            </div>

            <div className="flex items-center gap-1.5 w-full xl:w-auto overflow-x-auto pb-1 xl:pb-0 scrollbar-hide">
              <Filter size={16} className="text-gray-500 shrink-0 ml-1" />
              {(["tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTierView(t)}
                  className={`px-2.5 py-1.5 rounded-md text-xs font-bold whitespace-nowrap transition-all border ${
                    tierView === t 
                      ? "bg-[#0057ff] text-white border-[#0057ff] shadow-sm" 
                      : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {t === "tier2" ? "ACC Staff" : t === "tier3" ? "Family" : t === "tier4" ? "Co-Agency" : "Stakeholder"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* CALENDAR POPUP */}
        {isDatePickerOpen && (
          <>
            <div className="fixed inset-0 bg-black/20 z-[45]" onClick={() => setIsDatePickerOpen(false)}></div>
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 p-6 w-[700px] max-w-[95vw] animate-in fade-in zoom-in-95">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-gray-900 text-lg">Select your dates</h3>
                <button onClick={() => setIsDatePickerOpen(false)} className="text-gray-400 hover:text-gray-700 bg-gray-100 p-1.5 rounded-full transition">
                  <X size={18} />
                </button>
              </div>
              <DatePicker
                selected={draftCheckIn} onChange={(dates: any) => {
                  const [start, end] = dates;
                  setDraftCheckIn(start);
                  setDraftCheckOut(end);
                }}
                startDate={draftCheckIn} endDate={draftCheckOut} selectsRange inline monthsShown={2} minDate={new Date()}
                calendarClassName="trip-calendar"
              />
              <div className="flex justify-between items-center mt-6 pt-4 border-t border-gray-100">
                <div className="text-sm text-gray-600">
                  {draftCheckIn && draftCheckOut ? (
                    <span className="font-medium text-gray-900">
                      {formatDateDisplay(draftCheckIn)} - {formatDateDisplay(draftCheckOut)} 
                      <span className="text-gray-500 ml-2">({Math.max(1, Math.ceil((draftCheckOut.getTime() - draftCheckIn.getTime()) / (1000 * 3600 * 24)))} nights)</span>
                    </span>
                  ) : ("Please select check-in and check-out dates.")}
                </div>
                <button onClick={handleApplyDates} disabled={!draftCheckIn || !draftCheckOut} className="bg-[#0057ff] hover:bg-[#0046cc] text-white px-8 py-2.5 rounded-md font-bold text-sm transition shadow-sm disabled:opacity-50">
                  Apply
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="max-w-[1400px] mx-auto px-4 md:px-6 pt-6">
        <div className="mb-6"><PendingBillBanner /></div>

        {(!checkIn || !checkOut) && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3 shadow-sm animate-in fade-in">
            <Info className="text-blue-600 mt-0.5" size={20} />
            <div>
              <h3 className="text-sm font-bold text-blue-900">Want to see exact availability?</h3>
              <p className="text-xs text-blue-700 mt-1">You are currently viewing general availability. Select your Check-in and Check-out dates in the top bar to see exactly which rooms are free for your specific stay.</p>
            </div>
          </div>
        )}

        {/* AVAILABLE ROOMS GRID */}
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {bookableRooms.map((r) => (
                <BookableRoomCard
                  key={r._id} room={r} tierView={tierView} onBook={handleBook}
                  onShowQr={(e) => openQrModal(e, r._id, r.roomNumber)}
                />
              ))}
            </div>
          )}
        </div>

        {/* RESIDENT ROOMS GRID */}
        {residentRooms.length > 0 && (
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
              Resident Rooms <span className="text-sm font-normal text-gray-500">(Not bookable)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {residentRooms.map((r) => (
                <ResidentRoomCard key={r._id} room={r} onShowQr={(e) => openQrModal(e, r._id, r.roomNumber)} />
              ))}
            </div>
          </div>
        )}

      </div>

      {/* QR POPOVER */}
      {qrModal.isOpen && qrModal.position && (
        <>
          <div className="fixed inset-0 bg-white/10 backdrop-blur-[2px] z-[90] animate-in fade-in duration-200"></div>
          <div 
            ref={popoverRef}
            className="fixed z-[100] bg-white rounded-xl shadow-2xl border border-gray-200 w-72 overflow-hidden flex flex-col animate-in fade-in zoom-in-95"
            style={{ top: qrModal.position.y, left: qrModal.position.x }}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Room {qrModal.roomNumber} QR</h3>
              <button 
                onClick={() => setQrModal(prev => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-full transition"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 flex flex-col items-center justify-center bg-gray-50">
              {qrModal.loading ? (
                <Loader2 className="animate-spin text-[#0057ff]" size={32} />
              ) : qrModal.url ? (
                <img src={qrModal.url} alt="QR" className="w-48 h-48 object-contain mix-blend-multiply" />
              ) : (
                <p className="text-sm text-red-500">Failed to load.</p>
              )}
            </div>
            <div className="p-3 border-t border-gray-100 bg-white flex justify-end">
              <button onClick={handleRegenerateQr} disabled={qrModal.loading} className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition disabled:opacity-50">
                <RefreshCw size={12} className={qrModal.loading ? "animate-spin" : ""} /> Regenerate
              </button>
            </div>
          </div>
        </>
      )}

      <BookingModal
        isOpen={bookingModal.isOpen}
        onClose={() => setBookingModal({ ...bookingModal, isOpen: false })}
        room={bookingModal.room} beds={bookingModal.beds} preselectedBedIds={bookingModal.bedIds}
      />
    </div>
  );
}

/* ─── RESIDENT ROOM CARD ─── */
function ResidentRoomCard({ room, onShowQr }: { room: Room; onShowQr: (e: React.MouseEvent) => void }) {
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

/* ─── BOOKABLE ROOM CARD (GRID LAYOUT) ─── */
function BookableRoomCard({
  room,
  tierView,
  onBook,
  onShowQr,
}: {
  room: Room;
  tierView: "tier1" | "tier2" | "tier3" | "tier4" | "tier5";
  onBook: (room: Room, bedIds?: string[]) => void;
  onShowQr: (e: React.MouseEvent) => void;
}) {
  const availableBeds = room.beds.filter((b) => b.status === "AVAILABLE");
  const allAvailable = availableBeds.length === room.beds.length && room.beds.length > 0;
  const primaryPhoto = room.photos?.find((p) => p.isPrimary)?.url || room.photos?.[0]?.url;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow flex flex-col relative">
      <div className="aspect-video bg-gray-100 relative">
        {primaryPhoto ? (
          <img src={primaryPhoto} alt={room.roomNumber} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300"><BedDouble size={40} /></div>
        )}
        <div className="absolute top-2 left-2 bg-white/95 backdrop-blur px-2 py-1 rounded shadow-sm text-[10px] font-bold text-gray-800 uppercase tracking-wider">
          {room.roomTypeName}
        </div>
        <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded-md text-xs flex items-center gap-1 shadow-sm">
          <Users size={11} /> {availableBeds.length}/{room.beds.length}
        </div>
      </div>

      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-lg text-gray-900">{room.roomNumber}</h3>
          <span className="text-xs text-gray-500 font-medium">Floor {room.floor}</span>
        </div>
        
        {room.description && <p className="text-xs text-gray-500 line-clamp-2 mb-3">{room.description}</p>}
        
        <div className="flex flex-wrap gap-1.5 mb-4">
          {room.amenities?.slice(0, 5).map((a) => (
            <span key={a} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded uppercase font-semibold">
              {a}
            </span>
          ))}
        </div>

        <div className="space-y-2 mb-12 mt-auto">
          {room.beds.map((bed) => {
            const rate = bed.rates?.[tierView] || 0;
            const isAvailable = bed.status === "AVAILABLE";
            
            return (
              <div key={bed._id} className={`flex items-center justify-between p-2.5 rounded-lg border ${isAvailable ? "border-gray-200 bg-gray-50/50" : "border-gray-100 bg-gray-50 opacity-60"}`}>
                <div>
                  <p className="text-xs font-bold text-gray-900">Bed {bed.bedLabel} <span className="text-gray-400 font-normal">· {bed.bedTypeCode}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 bg-blue-50 text-blue-700 font-bold rounded-md border border-blue-100 shadow-sm">
                    Nu. {rate.toLocaleString()}/night
                  </span>
                  <BedStatusBadge status={bed.status} size="sm" />
                  {isAvailable && (
                    <button onClick={() => onBook(room, [bed._id])} className="text-[11px] px-3 py-1.5 bg-black text-white rounded-md font-bold hover:bg-gray-800 transition shadow-sm">
                      Book
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {allAvailable && room.beds.length > 1 && (
          <button 
            onClick={() => onBook(room, room.beds.map((b) => b._id))} 
            className="w-full text-xs py-2 border-2 border-black text-black font-bold rounded-lg hover:bg-black hover:text-white transition mb-10"
          >
            Book Whole Room
          </button>
        )}
        {availableBeds.length === 0 && (
          <p className="text-xs text-center font-medium text-gray-500 py-2 mb-10 bg-gray-50 rounded-lg">
            🔒 Fully Occupied
          </p>
        )}
      </div>

      <button 
        onClick={onShowQr} 
        className="absolute bottom-4 right-4 p-2 bg-white border border-gray-200 text-gray-500 hover:text-[#0057ff] hover:border-[#0057ff] rounded-lg transition shadow-sm" 
        title="View Room QR Code"
      >
        <QrCode size={16} />
      </button>
    </div>
  );
}