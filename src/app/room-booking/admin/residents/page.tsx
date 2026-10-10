"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Check, X } from "lucide-react";

interface Resident {
  _id: string;
  staffId: string;
  roomId: string;
  bedId: string | null;
  rateType: string;
  rateValue: number;
  status: string;
  residentSince: string;
  staffSnapshot: { name?: string; email?: string; cid?: string } | null;
  roomSnapshot: { roomNumber?: string; roomTypeCode?: string } | null;
  bedSnapshot: { bedLabel?: string; bedTypeCode?: string } | null;
}

interface Room {
  _id: string;
  roomNumber: string;
  beds: { _id: string; bedLabel: string; status: string; bedTypeCode: string }[];
}

export default function AdminResidentsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [residents, setResidents] = useState<Resident[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    staffId: "",
    roomId: "",
    bedId: "",
    rateType: "MONTHLY",
    rateValue: 3000,
  });

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resRes, roomsRes] = await Promise.all([
        fetch("/api/room-booking/residents", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/rooms", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const resData = await resRes.json();
      const roomsData = await roomsRes.json();
      setResidents(resData.residents || []);
      setRooms(roomsData.rooms || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoom = rooms.find((r) => r._id === form.roomId);
  const availableBeds = selectedRoom?.beds.filter((b) => b.status === "AVAILABLE") || [];

  const handleSubmit = async () => {
    if (!form.staffId || !form.roomId || !form.bedId || !form.rateValue) {
      notify("All fields are required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/room-booking/residents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      notify("Resident assigned", "success");
      setShowForm(false);
      setForm({ staffId: "", roomId: "", bedId: "", rateType: "MONTHLY", rateValue: 3000 });
      fetchData();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (id: string) => {
    if (!confirm("Release this resident? The bed will become AVAILABLE.")) return;
    try {
      const res = await fetch(`/api/room-booking/residents/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed");
        return;
      }
      fetchData();
    } catch {
      alert("Failed");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Residents</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-sm"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "Assign Resident"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border p-5 mb-6">
            <h2 className="font-semibold mb-4">Assign New Resident</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Staff User ID (MongoDB _id)</label>
                <input
                  value={form.staffId}
                  onChange={(e) => setForm({ ...form, staffId: e.target.value })}
                  placeholder="65f1a2b3..."
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Room</label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value, bedId: "" })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                >
                  <option value="">-- Select --</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>
                      {r.roomNumber}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Bed</label>
                <select
                  value={form.bedId}
                  onChange={(e) => setForm({ ...form, bedId: e.target.value })}
                  disabled={!form.roomId}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                >
                  <option value="">-- Select --</option>
                  {availableBeds.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.bedLabel} ({b.bedTypeCode})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rate Type</label>
                <select
                  value={form.rateType}
                  onChange={(e) => setForm({ ...form, rateType: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="NIGHTLY_FLAT">Nightly (Flat)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Rate Value (Nu.)</label>
                <input
                  type="number"
                  value={form.rateValue}
                  onChange={(e) => setForm({ ...form, rateValue: Number(e.target.value) })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                />
              </div>
            </div>
            <div className="flex justify-end mt-4">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />}
                Assign
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : residents.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No residents yet.
          </div>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Resident</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Room / Bed</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Rate</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Since</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-xs uppercase text-gray-600">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {residents.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{r.staffSnapshot?.name || "-"}</p>
                      <p className="text-xs text-gray-500">{r.staffSnapshot?.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      {r.roomSnapshot?.roomNumber} / Bed {r.bedSnapshot?.bedLabel}
                    </td>
                    <td className="px-4 py-3">
                      Nu. {r.rateValue} / {r.rateType === "MONTHLY" ? "month" : "night"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {new Date(r.residentSince).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {r.status === "ACTIVE" && (
                        <button
                          onClick={() => handleRelease(r._id)}
                          className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                          title="Release"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}