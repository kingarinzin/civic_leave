"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  FileText, 
  XCircle, 
  Calendar, 
  Home, 
  Plus, 
  BedDouble,
  CreditCard,
  AlertCircle,
  Users,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface Guest {
  fullName: string;
  occupantType: string;
  checkIn: string;
  checkOut: string;
  totalAmount: number;
}

interface Booking {
  _id: string;
  bookingRef: string;
  roomNumberSnapshot: string;
  bookingStatus: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  totalAmount: number;
  paymentStatus: string;
  guests: Guest[];
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  CHECKED_IN: "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_OUT: "bg-gray-100 text-gray-700 border-gray-200",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const url = filter
        ? `/api/room-booking/bookings/my?status=${filter}`
        : "/api/room-booking/bookings/my";
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setBookings(data.bookings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleCancel = async (ref: string) => {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    const reason = prompt("Please provide a reason for cancellation:") || "";
    try {
      const res = await fetch(`/api/room-booking/bookings/${ref}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Cancel failed");
        return;
      }
      load();
    } catch {
      alert("Cancel failed");
    }
  };

  const handlePay = (bookingId: string) => {
    // Redirect to the payment page, passing the booking ID
    router.push(`/room-booking/ledger?bookingId=${bookingId}`);
  };

  // Descending Sort by Room Number
  const sortedBookings = [...bookings].sort((a, b) => {
    const roomA = a.roomNumberSnapshot || "";
    const roomB = b.roomNumberSnapshot || "";
    return roomB.localeCompare(roomA, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      
      {/* Header Banner */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/room-booking")}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              title="Back to Room Booking Menu"
            >
              <Home size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">My Bookings</h1>
              <p className="text-sm text-gray-500 mt-0.5">Manage your room reservations, guests, and payments</p>
            </div>
          </div>
          
          <button
            onClick={() => router.push("/room-booking")}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors shadow-sm"
          >
            <Plus size={16} /> Book New Room
          </button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-6">
        
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide mb-6">
          {[
            { label: "All Bookings", value: "" },
            { label: "Confirmed", value: "CONFIRMED" },
            { label: "Pending Approval", value: "PENDING_APPROVAL" },
            { label: "Checked In", value: "CHECKED_IN" },
            { label: "Checked Out", value: "CHECKED_OUT" },
            { label: "Cancelled", value: "CANCELLED" },
          ].map((s) => (
            <button
              key={s.value}
              onClick={() => setFilter(s.value)}
              className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-semibold transition-all ${
                filter === s.value 
                  ? "bg-black text-white shadow-sm" 
                  : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-gray-400 mb-4" size={32} />
            <p className="text-gray-500 text-sm">Loading your bookings...</p>
          </div>
        ) : sortedBookings.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
            <BedDouble className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No bookings found</h3>
            <p className="text-gray-500 text-sm mb-6">You don't have any bookings matching this filter.</p>
            <button
              onClick={() => router.push("/room-booking")}
              className="px-6 py-2.5 bg-black text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
            >
              Make a Booking
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedBookings.map((b) => {
              const isUnpaid = b.paymentStatus === "UNPAID" || b.paymentStatus === "PENDING";
              const isExpanded = expandedBooking === b._id;
              const guestCount = b.guests?.length || 1;

              return (
                <div
                  key={b._id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col"
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
                    <div>
                      <span className="text-xs text-gray-500 font-medium uppercase tracking-wider">Booking Reference</span>
                      <h3 className="font-bold text-gray-900 text-lg">{b.bookingRef}</h3>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${STATUS_STYLE[b.bookingStatus] || "bg-gray-100 text-gray-700"}`}>
                        {b.bookingStatus.replace("_", " ")}
                      </span>
                      {isUnpaid && (
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-red-100 text-red-700 border border-red-200 flex items-center gap-1">
                          <AlertCircle size={12} /> UNPAID
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 space-y-4">
                    
                    {/* Room Info */}
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <BedDouble size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Room {b.roomNumberSnapshot}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{new Date(b.checkIn).toLocaleDateString()} &rarr; {new Date(b.checkOut).toLocaleDateString()}</span>
                          <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{b.nights} nights</span>
                        </div>
                      </div>
                    </div>

                    {/* Toggle Guests */}
                    <div className="border border-gray-100 rounded-lg overflow-hidden">
                      <button 
                        onClick={() => setExpandedBooking(isExpanded ? null : b._id)}
                        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                          <Users size={16} className="text-gray-500" /> 
                          {guestCount} Guest(s) staying
                        </div>
                        {isExpanded ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                      </button>
                      
                      {isExpanded && b.guests && (
                        <div className="p-3 divide-y divide-gray-100 bg-white">
                          {b.guests.map((g, idx) => (
                            <div key={idx} className="py-2 flex justify-between items-center text-xs">
                              <div>
                                <p className="font-semibold text-gray-800">{g.fullName}</p>
                                <p className="text-gray-500 text-[10px] uppercase">{g.occupantType.replace("_", " ")}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-gray-600">{new Date(g.checkIn).toLocaleDateString()} - {new Date(g.checkOut).toLocaleDateString()}</p>
                                <p className="font-semibold text-gray-900">Nu. {g.totalAmount?.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment Info */}
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className={isUnpaid ? "text-red-500" : "text-green-500"} />
                        <span className="text-sm font-medium text-gray-700">Total Amount</span>
                      </div>
                      <span className={`font-bold ${isUnpaid ? "text-red-600" : "text-gray-900"}`}>
                        Nu. {b.totalAmount.toLocaleString()}
                      </span>
                    </div>

                  </div>

                  {/* Card Footer (Actions) */}
                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    {isUnpaid ? (
                      <button
                        onClick={() => handlePay(b._id)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0057ff] hover:bg-[#0046cc] text-white rounded-lg text-sm font-bold transition-colors shadow-sm"
                      >
                        <CreditCard size={16} /> Pay Now
                      </button>
                    ) : (
                      <a
                        href={`/api/room-booking/bookings/${b.bookingRef}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <FileText size={16} /> Download Receipt
                      </a>
                    )}

                    {["CONFIRMED", "PENDING_APPROVAL"].includes(b.bookingStatus) && (
                      <button
                        onClick={() => handleCancel(b.bookingRef)}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium transition-colors shadow-sm"
                      >
                        <XCircle size={16} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}