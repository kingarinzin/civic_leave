"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle2, UserCheck, Shield, ShieldCheck } from "lucide-react";

export default function AdminApproversPage() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const [approvers, setApprovers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/room-booking/admin/approvers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setApprovers(data.approvers || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const handleToggleApprover = async (userId: string, currentStatus: boolean) => {
    try {
      const res = await fetch("/api/room-booking/admin/approvers/toggle", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      load();
    } catch (err) {
      alert("Error updating approver");
    }
  };

  const handleToggleRoomAdmin = async (userId: string, currentStatus: boolean) => {
    if (!confirm("Are you sure you want to change Room Admin access for this user?")) return;
    
    try {
      const res = await fetch("/api/room-booking/admin/approvers/toggle-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId, isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update");
      load();
    } catch (err) {
      alert("Error updating room admin");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 lg:p-6 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <UserCheck className="text-gray-700" /> Approval Authority & Admins
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Assign the active approver for Tier 4 & 5 room bookings, and manage Room Admin access.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Email</th>
                <th className="px-6 py-4 text-left text-xs font-bold uppercase text-gray-500">Role</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-500">Approver</th>
                <th className="px-6 py-4 text-center text-xs font-bold uppercase text-gray-500">Room Admin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {approvers.map((user) => (
                <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    {user.name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs font-bold">
                      {user.role || "Officer"}
                    </span>
                  </td>
                  
                  {/* APPROVER TOGGLE */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleApprover(user._id, user.isRoomBookingApprover)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm ${
                        user.isRoomBookingApprover
                          ? "bg-green-100 text-green-700 border border-green-200"
                          : "bg-white border border-gray-300 text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      {user.isRoomBookingApprover ? "Active Approver" : "Make Approver"}
                    </button>
                  </td>

                  {/* ROOM ADMIN TOGGLE */}
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleToggleRoomAdmin(user._id, user.isRoomBookingAdmin)}
                      className={`px-3 py-1.5 rounded-md text-xs font-bold transition shadow-sm flex items-center gap-1.5 mx-auto ${
                        user.isRoomBookingAdmin
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-white border border-blue-300 text-blue-600 hover:bg-blue-50"
                      }`}
                    >
                      <ShieldCheck size={14} /> 
                      {user.isRoomBookingAdmin ? "Room Admin" : "Make Admin"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}