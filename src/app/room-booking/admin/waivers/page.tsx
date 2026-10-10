"use client";

import { useEffect, useState } from "react";
import { Loader2, Gift, Search } from "lucide-react";

interface Waiver {
  _id: string;
  bookingRef: string;
  roomNumberSnapshot: string;
  totalAmount: number;
  waiverReasonCode: string | null;
  waiverNote: string | null;
  bookedBySnapshot: { name?: string; email?: string } | null;
  createdAt: string;
}

export default function AdminWaiversPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [waivers, setWaivers] = useState<Waiver[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/bookings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        const all: Waiver[] = data.bookings || [];
        setWaivers(all.filter((b: any) => b.paymentStatus === "WAIVED"));
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = waivers.filter((w) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      w.bookingRef.toLowerCase().includes(s) ||
      (w.bookedBySnapshot?.name || "").toLowerCase().includes(s)
    );
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mb-1">
          <Gift size={22} /> Waivers
        </h1>
        <p className="text-sm text-gray-500 mb-6">Bookings with waived charges</p>

        <div className="relative mb-4 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search..."
            className="w-full pl-10 pr-4 py-2 border rounded-lg text-sm"
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin" size={28} /></div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">No waivers granted.</div>
        ) : (
          <div className="space-y-3">
            {filtered.map((w) => (
              <div key={w._id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold">{w.bookingRef}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      <b>Officer:</b> {w.bookedBySnapshot?.name || "-"}
                    </p>
                    <p className="text-sm text-gray-600">
                      <b>Room:</b> {w.roomNumberSnapshot}
                    </p>
                    <p className="text-sm text-gray-600">
                      <b>Amount Waived:</b> Nu. {w.totalAmount}
                    </p>
                    <p className="text-sm text-gray-600">
                      <b>Reason:</b> {w.waiverReasonCode || "-"}
                    </p>
                    {w.waiverNote && (
                      <p className="text-xs text-gray-500 mt-1">{w.waiverNote}</p>
                    )}
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-700">
                    WAIVED
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
