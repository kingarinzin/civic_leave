"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Wallet, CheckCircle2, X, RefreshCw } from "lucide-react";

interface LedgerItem {
  _id: string;
  bookingRef: string;
  description: string;
  amount: number;
  status: "UNPAID" | "PENDING_VERIFICATION" | "PAID";
  createdAt: string;
}

export default function MyLedgerPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [ledger, setLedger] = useState<LedgerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Payment Modal State
  const [selectedBill, setSelectedBill] = useState<LedgerItem | null>(null);
  const [journeyNo, setJourneyNo] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadLedger = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/ledger", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load pending bills");
      const data = await res.json();
      setLedger(data.ledger || []);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLedger();
  }, [token]);

  const handlePaySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBill || !journeyNo) return alert("Please enter the Journey Number");

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/room-booking/ledger/${selectedBill._id}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          method: "MBOB",
          referenceNumber: journeyNo,
        }),
      });

      if (!res.ok) throw new Error("Payment submission failed");

      alert("Payment submitted successfully! Waiting for Admin verification.");
      setSelectedBill(null);
      setJourneyNo("");
      loadLedger(); // Refresh the list to show the new status
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 relative">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/room-booking")}
              className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Wallet className="text-gray-700" /> Pending Bills & Ledger
              </h1>
              <p className="text-sm text-gray-500">
                You must settle pending bills via mBop before booking a new room.
              </p>
            </div>
          </div>
          
          <button 
            onClick={loadLedger} 
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition shadow-sm"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {/* Content */}
        {loading && ledger.length === 0 ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-gray-400" size={32} />
          </div>
        ) : error ? (
          <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
            {error}
          </div>
        ) : ledger.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <CheckCircle2 className="mx-auto text-green-500 mb-3" size={40} />
            <h3 className="text-lg font-medium text-gray-900">No Pending Bills</h3>
            <p className="text-gray-500 mt-1">Your account is fully settled.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Date</th>
                  <th className="px-6 py-4">Booking Ref</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Amount</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ledger.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 font-medium">{item.bookingRef}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.status === "PAID" ? "bg-green-100 text-green-700" : 
                        item.status === "PENDING_VERIFICATION" ? "bg-amber-100 text-amber-700" :
                        "bg-red-100 text-red-700"
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      Nu. {item.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {/* ONLY SHOW PAY NOW IF UNPAID */}
                      {item.status === "UNPAID" && (
                        <button
                          onClick={() => setSelectedBill(item)}
                          className="px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800 transition"
                        >
                          Pay Now
                        </button>
                      )}
                      {item.status === "PAID" && (
                        <span className="text-xs text-gray-400 font-medium">Settled</span>
                      )}
                      {item.status === "PENDING_VERIFICATION" && (
                        <span className="text-xs text-amber-600 font-medium">Verifying...</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal with QR Code */}
      {selectedBill && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl w-full max-w-md p-6 relative">
            <button 
              onClick={() => setSelectedBill(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-700"
            >
              <X size={20} />
            </button>
            
            <h2 className="text-xl font-bold text-gray-900 mb-1">Pay Bill via mBop</h2>
            <p className="text-sm text-gray-500 mb-6">
              Amount to pay: <strong className="text-black">Nu. {selectedBill.amount}</strong>
            </p>

            <div className="flex flex-col items-center mb-6">
              <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center mb-2">
                 {/* REPLACE THIS WITH YOUR ACTUAL QR IMAGE */}
                 <span className="text-gray-400 text-sm text-center px-4">Bank QR Code<br/>Goes Here</span>
              </div>
              <p className="text-xs text-gray-500 text-center">
                Scan this QR in your mBop app and transfer exactly Nu. {selectedBill.amount}
              </p>
            </div>

            <form onSubmit={handlePaySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  mBop Journey Number
                </label>
                <input
                  type="text"
                  required
                  value={journeyNo}
                  onChange={(e) => setJourneyNo(e.target.value)}
                  placeholder="e.g. 123456789"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-black"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-black text-white rounded-md py-2.5 text-sm font-medium hover:bg-gray-800 disabled:opacity-50 flex justify-center"
              >
                {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : "Submit Journey Number"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}