"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X, UserCheck } from "lucide-react";

interface Approval {
  _id: string;
  bookingId: string;
  status: string;
  createdAt: string;
  requestedBySnapshot: { name?: string; email?: string; role?: string } | null;
  bookingSnapshot: {
    bookingRef: string;
    occupantName: string;
    occupantAgency: string;
    checkIn: string;
    checkOut: string;
    totalAmount: number;
    roomNumber: string;
  } | null;
}

export default function ApprovalsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "APPROVED" | "REJECTED">("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room-booking/approvals?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.approvals || []);
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

  const handleAction = async (id: string, action: "APPROVE" | "REJECT") => {
    const remarks = prompt(
      action === "REJECT" ? "Reason for rejection?" : "Remarks (optional):",
    );
    if (action === "REJECT" && !remarks) return;

    setProcessing(id);
    try {
      const res = await fetch(`/api/room-booking/approvals/${id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Action failed");
        return;
      }
      load();
    } catch {
      alert("Action failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-2 mb-1">
          <UserCheck size={22} />
          <h1 className="text-2xl font-bold text-gray-900">APIC Approvals</h1>
        </div>
        <p className="text-sm text-gray-500 mb-6">
          Approve or reject stakeholder bookings (Tier 5).
        </p>

        <div className="flex gap-2 mb-4">
          {(["PENDING", "APPROVED", "REJECTED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filter === f ? "bg-black text-white" : "bg-white border text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No {filter.toLowerCase()} approvals.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((a) => (
              <div key={a._id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">
                        {a.bookingSnapshot?.bookingRef}
                      </h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          a.status === "PENDING"
                            ? "bg-amber-100 text-amber-700"
                            : a.status === "APPROVED"
                              ? "bg-green-100 text-green-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {a.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><b>Requested By:</b> {a.requestedBySnapshot?.name} ({a.requestedBySnapshot?.role})</p>
                      <p><b>Stakeholder:</b> {a.bookingSnapshot?.occupantName} ({a.bookingSnapshot?.occupantAgency})</p>
                      <p><b>Room:</b> {a.bookingSnapshot?.roomNumber}</p>
                      <p><b>Dates:</b> {new Date(a.bookingSnapshot?.checkIn || "").toDateString()} → {new Date(a.bookingSnapshot?.checkOut || "").toDateString()}</p>
                      <p><b>Total:</b> Nu. {a.bookingSnapshot?.totalAmount}</p>
                    </div>
                  </div>
                  {a.status === "PENDING" && (
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={() => handleAction(a._id, "APPROVE")}
                        disabled={processing === a._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs"
                      >
                        <Check size={14} /> Approve
                      </button>
                      <button
                        onClick={() => handleAction(a._id, "REJECT")}
                        disabled={processing === a._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs"
                      >
                        <X size={14} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}