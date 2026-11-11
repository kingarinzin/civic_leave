"use client";

import { useEffect, useState, ChangeEvent } from "react";
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
  ChevronUp,
  X,
  Clock,
  Upload
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
  receipts?: string[]; // ADDED: To hold uploaded files
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700 border-emerald-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700 border-amber-200",
  CANCELLED: "bg-red-100 text-red-700 border-red-200",
  CHECKED_IN: "bg-blue-100 text-blue-700 border-blue-200",
  CHECKED_OUT: "bg-gray-100 text-gray-700 border-gray-200",
};

const formatDate = (dateString: any) => {
  if (!dateString) return "N/A";
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "N/A"; 
    return date.toLocaleDateString();
  } catch {
    return "N/A";
  }
};

export default function MyBookingsPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  
  // DYNAMIC ROUTING
  const isAdmin = typeof window !== "undefined" && localStorage.getItem("isAdmin") === "true";
  const dashboardUrl = isAdmin ? "/admin/pending-users" : "/dashboard/leave";

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);

  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [journeyNo, setJourneyNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Attachment State
  const [attachments, setAttachments] = useState<File[]>([]);

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

  const handlePayClick = (booking: Booking) => {
    setSelectedBooking(booking);
    setJourneyNo("");
    setAttachments([]);
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setAttachments((prev) => [...prev, ...files]);
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBooking || !journeyNo) return alert("Please enter the Journey Number");

    setIsSubmitting(true);
    try {
      const ledgerRes = await fetch("/api/room-booking/ledger", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!ledgerRes.ok) throw new Error("Failed to fetch pending bills.");
      
      const ledgerData = await ledgerRes.json();
      
      const unpaidBill = ledgerData.ledger?.find(
        (l: any) => l.bookingId === selectedBooking._id
      );

      if (!unpaidBill) {
        throw new Error("Could not find the pending bill for this booking. It may have already been paid.");
      }

      const formData = new FormData();
      formData.append("method", "MBOB");
      formData.append("referenceNumber", journeyNo);
      attachments.forEach((file) => formData.append("attachments", file));

      const res = await fetch(`/api/room-booking/ledger/${unpaidBill._id}/pay`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Payment submission failed");
      }

      alert("Payment submitted successfully! Waiting for Admin verification.");
      setSelectedBooking(null);
      setJourneyNo("");
      setAttachments([]);
      load(); 
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedBookings = [...bookings].sort((a, b) => {
    const roomA = a.roomNumberSnapshot || "";
    const roomB = b.roomNumberSnapshot || "";
    return roomB.localeCompare(roomA, undefined, { numeric: true, sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-12">
      
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            
            {/* DYNAMIC HOME BUTTON */}
            <button
              onClick={() => router.push(dashboardUrl)}
              className="p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full transition-colors"
              title="Back to Dashboard"
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
              const isPendingVerification = b.paymentStatus === "PENDING_VERIFICATION";
              const isPaid = b.paymentStatus === "PAID";

              const isExpanded = expandedBooking === b._id;
              const guestCount = b.guests?.length || 1;

              return (
                <div key={b._id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
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
                      {isPendingVerification && (
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200 flex items-center gap-1">
                            <Clock size={12} /> VERIFYING
                          </span>
                          {/* FIXED: href now points directly to the public folder */}
                          {b.receipts && b.receipts.length > 0 && (
                            <div className="flex flex-wrap gap-1 justify-end mt-1">
                              {b.receipts.map((file: string, idx: number) => (
                                <a 
                                  key={idx} 
                                  href={`/uploads/room-booking/money-receipt/${file}`} 
                                  target="_blank" 
                                  rel="noreferrer"
                                  className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5"
                                >
                                  <FileText size={10} /> Receipt {idx + 1}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="p-5 flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <BedDouble size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-900">Room {b.roomNumberSnapshot}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500">
                          <Calendar size={12} />
                          <span>{formatDate(b.checkIn)} &rarr; {formatDate(b.checkOut)}</span>
                          <span className="font-medium text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">{b.nights} nights</span>
                        </div>
                      </div>
                    </div>

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
                                <p className="text-gray-600">{formatDate(g.checkIn)} - {formatDate(g.checkOut)}</p>
                                <p className="font-semibold text-gray-900">Nu. {g.totalAmount?.toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-2">
                        <CreditCard size={16} className={isUnpaid ? "text-red-500" : isPendingVerification ? "text-amber-500" : "text-green-500"} />
                        <span className="text-sm font-medium text-gray-700">Total Amount</span>
                      </div>
                      <span className={`font-bold ${isUnpaid ? "text-red-600" : "text-gray-900"}`}>
                        Nu. {b.totalAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex items-center gap-3">
                    {isUnpaid && (
                      <button onClick={() => handlePayClick(b)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-[#0057ff] hover:bg-[#0046cc] text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                        <CreditCard size={16} /> Pay Now
                      </button>
                    )}
                    {isPendingVerification && (
                      <button disabled className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-bold cursor-not-allowed">
                        <Clock size={16} /> Verifying Payment
                      </button>
                    )}
                    {isPaid && (
                      <a href={`/api/room-booking/bookings/${b.bookingRef}/pdf`} target="_blank" rel="noreferrer" className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <FileText size={16} /> Download Receipt
                      </a>
                    )}
                    {["CONFIRMED", "PENDING_APPROVAL"].includes(b.bookingStatus) && (
                      <button onClick={() => handleCancel(b.bookingRef)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-red-200 hover:bg-red-50 text-red-600 rounded-lg text-sm font-medium transition-colors shadow-sm">
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

      {selectedBooking && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative shadow-2xl animate-in zoom-in-95">
            <button onClick={() => setSelectedBooking(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-700">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pay Bill via mBop</h2>
            <p className="text-sm text-gray-500 mb-6">
              Amount to pay: <strong className="text-black">Nu. {selectedBooking.totalAmount}</strong>
            </p>
            
            {/* UPDATED QR CODE SECTION WITH ACC DETAILS */}
            <div className="flex flex-col items-center mb-6 bg-gray-50/50 p-4 rounded-xl border border-gray-100">
              <div className="w-56 h-56 bg-white border border-gray-200 rounded-lg flex items-center justify-center mb-3 p-2 shadow-sm overflow-hidden">
                 <img 
                   src="/uploads/room-booking/QR-Code/bob-QR-code.jpg"
                   alt="mBop Payment QR Code" 
                   className="w-full h-full object-contain" 
                 />
              </div>
              <p className="text-xs text-gray-500 font-medium mb-3">Scan this QR code with the mBop app to pay</p>
              
              {/* ACCOUNT DETAILS */}
              <div className="text-center space-y-1">
                <p className="text-sm font-bold text-gray-800">
                  ACC No: <span className="font-mono text-blue-600">206637082</span>
                </p>
                <p className="text-xs text-gray-600 font-medium">
                  Account Holder: <span className="text-gray-900">Sonam Lhamo</span>
                </p>
              </div>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">mBop Journey Number</label>
                <input type="text" required value={journeyNo} onChange={(e) => setJourneyNo(e.target.value)} placeholder="e.g. 123456789" className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black" />
              </div>

              {/* ATTACHMENT UPLOAD SECTION */}
              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Upload Receipt / Screenshot (Optional)</label>
                  <label className="cursor-pointer text-blue-600 hover:text-blue-800 transition flex items-center gap-1 text-sm font-medium">
                    <Upload size={16} /> Add File
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFileSelect} 
                      accept="image/*,.pdf" 
                      className="hidden" 
                    />
                  </label>
                </div>
                
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2 max-h-32 overflow-y-auto">
                    {attachments.map((file, idx) => (
                      <div key={idx} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-medium border border-blue-100">
                        <FileText size={14} className="text-blue-600" />
                        <span className="truncate max-w-[150px]">{file.name}</span>
                        <button 
                          type="button" 
                          onClick={() => handleRemoveFile(idx)} 
                          className="text-blue-500 hover:text-blue-800 transition ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="w-full bg-black text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex justify-center mt-2">
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Payment Details"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}