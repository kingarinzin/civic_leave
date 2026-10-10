// src/components/room-booking/PendingBillBanner.tsx
"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export default function PendingBillBanner() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [total, setTotal] = useState<number>(0);
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/ledger/pending", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setTotal(data.total || 0);
        setCount(data.count || 0);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-2 text-sm text-gray-500">
        <Loader2 className="animate-spin" size={14} />
        Checking pending bills...
      </div>
    );
  }

  if (count === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 text-sm text-amber-800">
        <AlertTriangle size={16} />
        <span>
          You have <b>{count}</b> pending bill{count > 1 ? "s" : ""} totaling{" "}
          <b>Nu. {total}</b>
        </span>
      </div>
      <button
        onClick={() => router.push("/room-booking/ledger")}
        className="text-xs px-3 py-1.5 bg-amber-600 text-white rounded-md font-medium hover:bg-amber-700"
      >
        Settle Now
      </button>
    </div>
  );
}