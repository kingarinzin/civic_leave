"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, XCircle, FileText } from "lucide-react";

interface LedgerItem {
  _id: string;
  // We add multiple optional fields here to catch whatever your DB uses
  bookingRef?: string;
  reference?: string;
  bookingReference?: string;
  staffName?: string;
  description: string;
  amount: number;
  status: "UNPAID" | "PENDING_VERIFICATION" | "PAID";
  paymentMethod?: string;
  paymentReference?: string;
  createdAt: string;
}

export default function AdminLedgerPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "ALL" | "UNPAID" | "PENDING_VERIFICATION" | "PAID"
  >("PENDING_VERIFICATION");

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room-booking/admin/ledger?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load ledger items");
      const data = await res.json();
      setItems(data.ledger || []);
    } catch (err) {
      console.error("Failed to load ledger:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleVerify = async (id: string, action: "APPROVE" | "REJECT") => {
    const confirmMsg = action === "APPROVE" 
      ? "Are you sure you want to mark this as PAID?" 
      : "Are you sure you want to reject this payment?";
      
    if (!confirm(confirmMsg)) return;

    try {
      const res = await fetch(`/api/room-booking/admin/ledger/${id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action }),
      });
      
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed to verify payment");
        return;
      }
      
      load(); // Refresh list
    } catch (err) {
      alert("Failed to update payment status");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-gray-700" /> Payment Verification
          </h1>
          <p className="text-sm text-gray-500">
            Verify mBop Journey Numbers and clear user bills.
          </p>
        </div>

        <div className="flex gap-2 mb-4">
          {(["PENDING_VERIFICATION", "UNPAID", "PAID", "ALL"] as const).map(
            (f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                  filter === f
                    ? "bg-black text-white"
                    : "bg-white border text-gray-700"
                }`}
              >
                {f.replace("_", " ")}
              </button>
            )
          )}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gray-400" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No bills found for this filter.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Booking Ref</th>
                  <th className="px-6 py-4">Amount</th>
                  <th className="px-6 py-4">mBop Journey No.</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {items.map((item) => {
                  // Safely fallback through different possible DB field names
                  const displayRef = item.bookingRef || item.reference || item.bookingReference || "N/A";

                  return (
                    <tr key={item._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-500">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        {displayRef}
                      </td>
                      <td className="px-6 py-4 font-medium">
                        Nu. {item.amount?.toLocaleString() || 0}
                      </td>
                      <td className="px-6 py-4 text-blue-600 font-mono">
                        {item.paymentReference || "N/A"}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            item.status === "PAID"
                              ? "bg-green-100 text-green-700"
                              : item.status === "PENDING_VERIFICATION"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-red-100 text-red-700"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 flex justify-center gap-2">
                        {/* If PENDING_VERIFICATION: Show Approve/Reject */}
                        {item.status === "PENDING_VERIFICATION" && (
                          <>
                            <button
                              onClick={() => handleVerify(item._id, "APPROVE")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs hover:bg-green-700"
                            >
                              <CheckCircle2 size={14} /> Approve
                            </button>
                            <button
                              onClick={() => handleVerify(item._id, "REJECT")}
                              className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs hover:bg-red-700"
                            >
                              <XCircle size={14} /> Reject
                            </button>
                          </>
                        )}

                        {/* If UNPAID: Show Manual Override */}
                        {item.status === "UNPAID" && (
                          <button
                            onClick={() => handleVerify(item._id, "APPROVE")}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700"
                          >
                            <CheckCircle2 size={14} /> Mark as Paid
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}