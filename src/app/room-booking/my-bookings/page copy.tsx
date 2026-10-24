"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, FileText, XCircle, Calendar } from "lucide-react";

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
  occupantSnapshot: { fullName: string; occupantType: string };
  room?: { roomNumber: string };
}

const STATUS_STYLE: Record<string, string> = {
  CONFIRMED: "bg-green-100 text-green-700",
  PENDING_APPROVAL: "bg-amber-100 text-amber-700",
  CANCELLED: "bg-red-100 text-red-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  CHECKED_OUT: "bg-gray-200 text-gray-700",
};

export default function MyBookingsPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("");

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
    if (!confirm("Cancel this booking?")) return;
    const reason = prompt("Reason (optional):") || "";
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Bookings</h1>
            <p className="text-sm text-gray-500 mt-1">
              View and manage your room bookings.
            </p>
          </div>
          <button
            onClick={() => router.push("/room-booking")}
            className="px-4 py-2 bg-black text-white rounded-md text-sm"
          >
            + Book New Room
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {["", "CONFIRMED", "PENDING_APPROVAL", "CHECKED_IN", "CHECKED_OUT", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filter === s ? "bg-black text-white" : "bg-white border text-gray-700"
              }`}
            >
              {s || "All"}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No bookings found.
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b) => (
              <div
                key={b._id}
                className="bg-white rounded-xl border border-gray-200 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{b.bookingRef}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${STATUS_STYLE[b.bookingStatus] || "bg-gray-100 text-gray-600"}`}
                      >
                        {b.bookingStatus}
                      </span>
                      {b.paymentStatus === "UNPAID" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                          Unpaid
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p>
                        <b>Room:</b> {b.roomNumberSnapshot}
                      </p>
                      <p>
                        <b>Occupant:</b> {b.occupantSnapshot?.fullName} ({b.occupantSnapshot?.occupantType})
                      </p>
                      <p className="flex items-center gap-1.5">
                        <Calendar size={12} />
                        {new Date(b.checkIn).toDateString()} → {new Date(b.checkOut).toDateString()} ({b.nights} night{b.nights > 1 ? "s" : ""})
                      </p>
                      <p>
                        <b>Total:</b> Nu. {b.totalAmount}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 min-w-[140px]">
                    <a
                      href={`/api/room-booking/bookings/${b.bookingRef}/pdf`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-xs font-medium"
                    >
                      <FileText size={14} /> PDF
                    </a>
                    {["CONFIRMED", "PENDING_APPROVAL"].includes(b.bookingStatus) && (
                      <button
                        onClick={() => handleCancel(b.bookingRef)}
                        className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-md text-xs font-medium"
                      >
                        <XCircle size={14} /> Cancel
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}