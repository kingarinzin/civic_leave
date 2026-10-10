"use client";

import { useEffect, useState } from "react";
import { Bell, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

interface Notification {
  _id: string;
  action: string;
  details: any;
  createdAt: string;
}

export default function NotificationBell() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/notifications", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data = await res.json();
        setItems(data.notifications || []);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const count = items.length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 hover:bg-gray-100 rounded-full"
        title="Notifications"
      >
        <Bell size={18} />
        {count > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-12 w-80 bg-white border rounded-xl shadow-lg z-50 max-h-96 overflow-y-auto">
            <div className="px-4 py-3 border-b">
              <p className="font-semibold text-sm">Notifications</p>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="animate-spin" size={20} />
              </div>
            ) : items.length === 0 ? (
              <p className="text-center text-gray-500 text-sm py-6">
                No new notifications
              </p>
            ) : (
              <div className="divide-y">
                {items.slice(0, 20).map((n) => (
                  <div key={n._id} className="px-4 py-3 hover:bg-gray-50">
                    <p className="text-xs font-semibold text-gray-800">
                      {n.action.replace(/_/g, " ")}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {new Date(n.createdAt).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <button
              onClick={() => {
                setOpen(false);
                router.push("/room-booking/my-bookings");
              }}
              className="w-full text-center text-xs text-blue-600 py-2 border-t hover:bg-gray-50"
            >
              View All
            </button>
          </div>
        </>
      )}
    </div>
  );
}