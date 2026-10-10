"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, CheckCircle2, AlertCircle, Calendar, Home } from "lucide-react";

interface BookingPublic {
  bookingRef: string;
  roomNumberSnapshot: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  occupantSnapshot: { fullName: string; occupantType: string };
  bookingStatus: string;
}

export default function PublicCheckInPage() {
  const params = useParams();
  const bookingRef = params?.ref as string;

  const [booking, setBooking] = useState<BookingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!bookingRef) return;
    async function load() {
      try {
        // Reuse a public-safe subset — but the existing endpoint requires auth.
        // So we create a lightweight public endpoint or just verify ref exists.
        const res = await fetch(`/api/room-booking/bookings/${bookingRef}`);
        if (!res.ok) {
          throw new Error("Booking not found");
        }
        const data = await res.json();
        setBooking({
          bookingRef: data.booking.bookingRef,
          roomNumberSnapshot: data.booking.roomNumberSnapshot,
          checkIn: data.booking.checkIn,
          checkOut: data.booking.checkOut,
          nights: data.booking.nights,
          occupantSnapshot: data.booking.occupantSnapshot,
          bookingStatus: data.booking.bookingStatus,
        });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bookingRef]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <AlertCircle className="mx-auto text-red-500 mb-3" size={32} />
        <p className="text-gray-700">{error || "Booking not found"}</p>
      </div>
    );
  }

  const isCheckedIn = booking.bookingStatus === "CHECKED_IN";
  const isConfirmed = booking.bookingStatus === "CONFIRMED";

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border p-6 text-center">
        <div
          className={`inline-flex items-center justify-center w-16 h-16 rounded-full mb-3 ${
            isCheckedIn
              ? "bg-green-100 text-green-700"
              : isConfirmed
                ? "bg-blue-100 text-blue-700"
                : "bg-gray-100 text-gray-500"
          }`}
        >
          {isCheckedIn ? <CheckCircle2 size={32} /> : <Home size={32} />}
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {booking.bookingRef}
        </h1>
        <p className="text-sm text-gray-500">
          {isCheckedIn ? "You are checked in ✅" : booking.bookingStatus}
        </p>
      </div>

      <div className="bg-white rounded-xl border p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Home size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Room</p>
            <p className="font-semibold">{booking.roomNumberSnapshot}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Stay</p>
            <p className="font-semibold text-sm">
              {new Date(booking.checkIn).toDateString()} →{" "}
              {new Date(booking.checkOut).toDateString()}
            </p>
            <p className="text-xs text-gray-500">
              {booking.nights} night{booking.nights > 1 ? "s" : ""}
            </p>
          </div>
        </div>

        <div className="pt-3 border-t">
          <p className="text-xs text-gray-500 uppercase">Occupant</p>
          <p className="font-semibold">{booking.occupantSnapshot.fullName}</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-800">
        <p className="font-medium mb-1">ℹ️ What to do next</p>
        <p>
          {isConfirmed &&
            "Please proceed to the room. Your check-in will be confirmed by the reception."}
          {isCheckedIn &&
            "Enjoy your stay! Please keep this page bookmarked for check-out."}
          {!isConfirmed &&
            !isCheckedIn &&
            "Contact the reception for assistance."}
        </p>
      </div>
    </div>
  );
}