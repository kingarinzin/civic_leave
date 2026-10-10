"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2, Home, BedDouble, Users, Lock, DollarSign, ShieldCheck,
  Wallet, FileText, BarChart3, ScrollText, BookOpen,
} from "lucide-react";

interface Stats {
  rooms: number;
  beds: number;
  residents: number;
  reservations: number;
  pendingFamily: number;
  pendingApprovals: number;
  unpaidBills: number;
  unpaidTotal: number;
}

export default function AdminRoomBookingDashboard() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [healthRes, familyRes, approvalsRes, ledgerRes, resRes, resvRes] = await Promise.all([
          fetch("/api/room-booking/health").then((r) => r.json()),
          fetch("/api/room-booking/family?status=PENDING", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          fetch("/api/room-booking/approvals?status=PENDING", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          fetch("/api/room-booking/ledger?status=UNPAID", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          fetch("/api/room-booking/residents?status=ACTIVE", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
          fetch("/api/room-booking/reservations", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
        ]);

        setStats({
          rooms: healthRes.counts?.rooms || 0,
          beds: healthRes.counts?.beds || 0,
          residents: (resRes.residents || []).length,
          reservations: (resvRes.reservations || []).length,
          pendingFamily: (familyRes.items || []).length,
          pendingApprovals: (approvalsRes.approvals || []).length,
          unpaidBills: ledgerRes.totals?.count || 0,
          unpaidTotal: ledgerRes.totals?.unpaid || 0,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  const cards = [
    { title: "Rooms", value: stats?.rooms || 0, icon: Home, link: "/room-booking/admin/rooms", color: "bg-blue-50 text-blue-700" },
    { title: "Beds", value: stats?.beds || 0, icon: BedDouble, link: "/room-booking/admin/beds", color: "bg-indigo-50 text-indigo-700" },
    { title: "Residents", value: stats?.residents || 0, icon: Users, link: "/room-booking/admin/residents", color: "bg-purple-50 text-purple-700" },
    { title: "Reservations", value: stats?.reservations || 0, icon: Lock, link: "/room-booking/admin/reservations", color: "bg-amber-50 text-amber-700" },
    { title: "Family Pending", value: stats?.pendingFamily || 0, icon: ShieldCheck, link: "/room-booking/admin/family-verifications", color: "bg-emerald-50 text-emerald-700", badge: stats?.pendingFamily ? "action" : null },
    { title: "Approvals Pending", value: stats?.pendingApprovals || 0, icon: FileText, link: "/room-booking/approvals", color: "bg-violet-50 text-violet-700", badge: stats?.pendingApprovals ? "action" : null },
    { title: "Unpaid Bills", value: stats?.unpaidBills || 0, icon: Wallet, link: "/room-booking/admin/ledger", color: "bg-red-50 text-red-700", badge: stats?.unpaidBills ? "action" : null },
    { title: "Unpaid Total", value: `Nu. ${stats?.unpaidTotal || 0}`, icon: DollarSign, link: "/room-booking/admin/ledger", color: "bg-rose-50 text-rose-700" },
  ];

  const quickLinks = [
    { title: "Manage Rooms", icon: Home, link: "/room-booking/admin/rooms" },
    { title: "Manage Beds", icon: BedDouble, link: "/room-booking/admin/beds" },
    { title: "Masters", icon: BookOpen, link: "/room-booking/admin/masters" },
    { title: "Rates", icon: DollarSign, link: "/room-booking/admin/rates" },
    { title: "Family Verifications", icon: ShieldCheck, link: "/room-booking/admin/family-verifications" },
    { title: "Ledger", icon: Wallet, link: "/room-booking/admin/ledger" },
    { title: "Waivers", icon: FileText, link: "/room-booking/admin/waivers" },
    { title: "Reports", icon: BarChart3, link: "/room-booking/reports" },
    { title: "Audit Log", icon: ScrollText, link: "/room-booking/admin/audit" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Room Booking Admin</h1>
        <p className="text-sm text-gray-500 mb-6">Overview of the accommodation module</p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {cards.map((c) => (
            <button
              key={c.title}
              onClick={() => router.push(c.link)}
              className="bg-white rounded-xl border border-gray-200 p-4 text-left hover:shadow-md transition"
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-2 rounded-lg ${c.color}`}>
                  <c.icon size={16} />
                </div>
                {c.badge && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <p className="text-2xl font-bold text-gray-900">{c.value}</p>
              <p className="text-xs text-gray-500 mt-1">{c.title}</p>
            </button>
          ))}
        </div>

        {/* Quick links */}
        <h2 className="text-sm font-semibold text-gray-700 uppercase mb-3">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {quickLinks.map((q) => (
            <button
              key={q.title}
              onClick={() => router.push(q.link)}
              className="flex items-center gap-3 bg-white rounded-lg border border-gray-200 p-3 text-left hover:border-black transition"
            >
              <q.icon size={16} />
              <span className="text-sm font-medium">{q.title}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}