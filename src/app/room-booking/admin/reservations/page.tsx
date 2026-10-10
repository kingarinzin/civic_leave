"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, X, Lock } from "lucide-react";

interface Reservation {
  _id: string;
  roomId: string;
  bedIds: string[];
  reservationReasonCode: string;
  reservedFrom: string;
  reservedUntil: string;
  reservedNote: string | null;
  roomSnapshot: { roomNumber?: string; roomTypeCode?: string } | null;
  reasonName?: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  beds: { _id: string; bedLabel: string; status: string; bedTypeCode: string }[];
}

interface Reason {
  _id: string;
  code: string;
  name: string;
}

export default function AdminReservationsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    roomId: "",
    bedIds: [] as string[],
    reservationReasonCode: "APIC",
    reservedFrom: "",
    reservedUntil: "",
    reservedNote: "",
    wholeRoom: true,
  });

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [resRes, roomsRes, reasonsRes] = await Promise.all([
        fetch("/api/room-booking/reservations", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/rooms", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/reservation-reasons", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const resData = await resRes.json();
      const roomsData = await roomsRes.json();
      const reasonsData = await reasonsRes.json();
      setReservations(resData.reservations || []);
      setRooms(roomsData.rooms || []);
      setReasons(reasonsData.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedRoom = rooms.find((r) => r._id === form.roomId);
  const availableBeds = selectedRoom?.beds.filter((b) => b.status === "AVAILABLE") || [];

  const toggleBed = (bedId: string) => {
    setForm((f) => ({
      ...f,
      bedIds: f.bedIds.includes(bedId)
        ? f.bedIds.filter((id) => id !== bedId)
        : [...f.bedIds, bedId],
    }));
  };

  const handleSubmit = async () => {
    if (!form.roomId || !form.reservedFrom || !form.reservedUntil) {
      notify("Room and dates are required", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        roomId: form.roomId,
        bedIds: form.wholeRoom ? [] : form.bedIds,
        reservationReasonCode: form.reservationReasonCode,
        reservedFrom: form.reservedFrom,
        reservedUntil: form.reservedUntil,
        reservedNote: form.reservedNote,
      };

      const res = await fetch("/api/room-booking/reservations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed");
      }
      notify("Reservation created", "success");
      setShowForm(false);
      setForm({
        roomId: "",
        bedIds: [],
        reservationReasonCode: "APIC",
        reservedFrom: "",
        reservedUntil: "",
        reservedNote: "",
        wholeRoom: true,
      });
      fetchAll();
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleRelease = async (id: string) => {
    if (!confirm("Release this reservation?")) return;
    try {
      const res = await fetch(`/api/room-booking/reservations/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Failed");
        return;
      }
      fetchAll();
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
          <h1 className="text-2xl font-bold text-gray-900">Reservations</h1>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-sm"
          >
            {showForm ? <X size={14} /> : <Plus size={14} />}
            {showForm ? "Cancel" : "New Reservation"}
          </button>
        </div>

        {showForm && (
          <div className="bg-white rounded-xl border p-5 mb-6 space-y-4">
            <h2 className="font-semibold">Create Reservation</h2>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium">Room *</label>
                <select
                  value={form.roomId}
                  onChange={(e) => setForm({ ...form, roomId: e.target.value, bedIds: [] })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                >
                  <option value="">-- Select --</option>
                  {rooms.map((r) => (
                    <option key={r._id} value={r._id}>{r.roomNumber}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Reason *</label>
                <select
                  value={form.reservationReasonCode}
                  onChange={(e) => setForm({ ...form, reservationReasonCode: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                >
                  {reasons.map((r) => (
                    <option key={r.code} value={r.code}>{r.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">From *</label>
                <input
                  type="date"
                  value={form.reservedFrom}
                  onChange={(e) => setForm({ ...form, reservedFrom: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Until *</label>
                <input
                  type="date"
                  value={form.reservedUntil}
                  onChange={(e) => setForm({ ...form, reservedUntil: e.target.value })}
                  className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  checked={form.wholeRoom}
                  onChange={() => setForm({ ...form, wholeRoom: true, bedIds: [] })}
                />
                Whole Room
              </label>
              <label className="flex items-center gap-2 text-sm mt-1">
                <input
                  type="radio"
                  checked={!form.wholeRoom}
                  onChange={() => setForm({ ...form, wholeRoom: false })}
                />
                Specific Beds
              </label>
            </div>

            {!form.wholeRoom && form.roomId && (
              <div className="border rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-2">Select beds to reserve:</p>
                <div className="space-y-1">
                  {availableBeds.map((b) => (
                    <label key={b._id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={form.bedIds.includes(b._id)}
                        onChange={() => toggleBed(b._id)}
                      />
                      Bed {b.bedLabel} ({b.bedTypeCode})
                    </label>
                  ))}
                  {availableBeds.length === 0 && (
                    <p className="text-xs text-gray-500">No available beds in this room.</p>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Note (optional)</label>
              <input
                value={form.reservedNote}
                onChange={(e) => setForm({ ...form, reservedNote: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={14} /> : <Lock size={14} />}
                Reserve
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : reservations.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No reservations yet.
          </div>
        ) : (
          <div className="space-y-3">
            {reservations.map((r) => (
              <div key={r._id} className="bg-white rounded-xl border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold">{r.roomSnapshot?.roomNumber}</h3>
                      <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                        {r.reasonName || r.reservationReasonCode}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600">
                      {new Date(r.reservedFrom).toDateString()} → {new Date(r.reservedUntil).toDateString()}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {r.bedIds.length} bed(s): {r.bedIds.join(", ")}
                    </p>
                    {r.reservedNote && (
                      <p className="text-xs text-gray-600 mt-1">Note: {r.reservedNote}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRelease(r._id)}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                    title="Release"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
