"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, ArrowLeft, Save, Plus, Trash2, X, Check } from "lucide-react";
import RoomPhotoUploader, { RoomPhoto } from "@/components/room-booking/RoomPhotoUploader";
import BedStatusBadge from "@/components/room-booking/BedStatusBadge";

interface Bed {
  _id: string;
  bedLabel: string;
  bedTypeCode: string;
  status: string;
  rates: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
  notes?: string | null;
}

interface Room {
  _id: string;
  roomNumber: string;
  roomName: string;
  roomTypeCode: string;
  roomTypeName: string;
  floor: number;
  areaSqm: number;
  description: string;
  amenities: string[];
  wifiPassword: string;
  emergencyContact: string;
  photos: RoomPhoto[];
  beds: Bed[];
  status: string;
}

interface MasterItem {
  _id: string;
  code: string;
  name: string;
}

export default function AdminEditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [room, setRoom] = useState<Room | null>(null);
  const [roomTypes, setRoomTypes] = useState<MasterItem[]>([]);
  const [bedTypes, setBedTypes] = useState<MasterItem[]>([]);
  const [amenities, setAmenities] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [bedForm, setBedForm] = useState({
    bedLabel: "",
    bedTypeCode: "SINGLE",
    rates: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 },
  });
  const [showBedForm, setShowBedForm] = useState(false);

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [roomRes, typesRes, bedsRes, amenRes] = await Promise.all([
        fetch(`/api/room-booking/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/room-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/bed-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/amenities", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const roomData = await roomRes.json();
      const typesData = await typesRes.json();
      const bedsData = await bedsRes.json();
      const amenData = await amenRes.json();
      setRoom(roomData.room);
      setRoomTypes(typesData.items || []);
      setBedTypes(bedsData.items || []);
      setAmenities(amenData.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (roomId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const handleSaveRoom = async () => {
    if (!room) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/room-booking/rooms/${roomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomNumber: room.roomNumber,
          roomName: room.roomName,
          roomTypeCode: room.roomTypeCode,
          floor: room.floor,
          areaSqm: room.areaSqm,
          description: room.description,
          amenities: room.amenities,
          wifiPassword: room.wifiPassword,
          emergencyContact: room.emergencyContact,
          status: room.status,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      notify("Room updated", "success");
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (code: string) => {
    if (!room) return;
    setRoom({
      ...room,
      amenities: room.amenities.includes(code)
        ? room.amenities.filter((a) => a !== code)
        : [...room.amenities, code],
    });
  };

  const handleAddBed = async () => {
    if (!bedForm.bedLabel) {
      notify("Bed label required", "error");
      return;
    }
    try {
      const res = await fetch("/api/room-booking/beds", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId,
          bedLabel: bedForm.bedLabel,
          bedTypeCode: bedForm.bedTypeCode,
          rates: bedForm.rates,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Add failed");
      }
      notify("Bed added", "success");
      setBedForm({ bedLabel: "", bedTypeCode: "SINGLE", rates: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 } });
      setShowBedForm(false);
      load();
    } catch (err: any) {
      notify(err.message, "error");
    }
  };

  const handleDeleteBed = async (bedId: string) => {
    if (!confirm("Delete this bed?")) return;
    try {
      const res = await fetch(`/api/room-booking/beds/${bedId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Delete failed");
        return;
      }
      load();
    } catch {
      alert("Delete failed");
    }
  };

  if (loading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={28} />
      </div>
    );
  }

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

      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.push("/room-booking/admin/rooms")}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-xl border p-6 mb-6">
          <h1 className="text-xl font-bold mb-4">Edit Room {room.roomNumber}</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Room Number</label>
              <input
                value={room.roomNumber}
                onChange={(e) => setRoom({ ...room, roomNumber: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Room Name</label>
              <input
                value={room.roomName}
                onChange={(e) => setRoom({ ...room, roomName: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Room Type</label>
              <select
                value={room.roomTypeCode}
                onChange={(e) => setRoom({ ...room, roomTypeCode: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              >
                {roomTypes.map((t) => (
                  <option key={t.code} value={t.code}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select
                value={room.status}
                onChange={(e) => setRoom({ ...room, status: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              >
                <option value="ACTIVE">Active</option>
                <option value="MAINTENANCE">Maintenance</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Floor</label>
              <input
                type="number"
                value={room.floor}
                onChange={(e) => setRoom({ ...room, floor: Number(e.target.value) })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Area (sq.m)</label>
              <input
                type="number"
                value={room.areaSqm}
                onChange={(e) => setRoom({ ...room, areaSqm: Number(e.target.value) })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">WiFi Password</label>
              <input
                value={room.wifiPassword}
                onChange={(e) => setRoom({ ...room, wifiPassword: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Emergency Contact</label>
              <input
                value={room.emergencyContact}
                onChange={(e) => setRoom({ ...room, emergencyContact: e.target.value })}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                value={room.description}
                onChange={(e) => setRoom({ ...room, description: e.target.value })}
                rows={2}
                className="w-full border rounded-md px-3 py-2 mt-1 text-sm"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const isActive = room.amenities.includes(a.code);
                return (
                  <button
                    key={a.code}
                    onClick={() => toggleAmenity(a.code)}
                    className={`text-xs px-2.5 py-1 rounded-full border ${
                      isActive ? "bg-black text-white border-black" : "bg-white text-gray-700"
                    }`}
                  >
                    {isActive && <Check size={10} className="inline mr-1" />}
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end mt-6">
            <button
              onClick={handleSaveRoom}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Save Room
            </button>
          </div>
        </div>

        {/* Photos */}
        <div className="mb-6">
          <RoomPhotoUploader
            roomId={room._id}
            photos={room.photos || []}
            onChange={(photos) => setRoom({ ...room, photos })}
          />
        </div>

        {/* Beds */}
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Beds ({room.beds.length})</h2>
            <button
              onClick={() => setShowBedForm(!showBedForm)}
              className="flex items-center gap-2 px-3 py-1.5 border rounded-md text-xs"
            >
              {showBedForm ? <X size={14} /> : <Plus size={14} />}
              {showBedForm ? "Cancel" : "Add Bed"}
            </button>
          </div>

          {showBedForm && (
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium">Label</label>
                  <input
                    value={bedForm.bedLabel}
                    onChange={(e) => setBedForm({ ...bedForm, bedLabel: e.target.value })}
                    placeholder="A / B / 1 / 2"
                    className="w-full border rounded px-2 py-1.5 text-sm mt-1"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Type</label>
                  <select
                    value={bedForm.bedTypeCode}
                    onChange={(e) => setBedForm({ ...bedForm, bedTypeCode: e.target.value })}
                    className="w-full border rounded px-2 py-1.5 text-sm mt-1"
                  >
                    {bedTypes.map((b) => (
                      <option key={b.code} value={b.code}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <p className="text-xs font-medium mb-2">Rates (per night)</p>
                <div className="grid grid-cols-5 gap-2">
                  {(["tier1", "tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
                    <input
                      key={t}
                      type="number"
                      value={bedForm.rates[t]}
                      onChange={(e) =>
                        setBedForm({ ...bedForm, rates: { ...bedForm.rates, [t]: Number(e.target.value) } })
                      }
                      placeholder={t}
                      className="border rounded px-2 py-1 text-xs"
                    />
                  ))}
                </div>
              </div>
              <div className="flex justify-end mt-3">
                <button
                  onClick={handleAddBed}
                  className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-md text-xs"
                >
                  <Plus size={12} /> Add
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {room.beds.map((b) => (
              <div key={b._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium text-sm">Bed {b.bedLabel} · {b.bedTypeCode}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    T1: {b.rates?.tier1} · T2: {b.rates?.tier2} · T3: {b.rates?.tier3} · T4: {b.rates?.tier4} · T5: {b.rates?.tier5}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <BedStatusBadge status={b.status} size="sm" />
                  <button
                    onClick={() => handleDeleteBed(b._id)}
                    disabled={b.status === "OCCUPIED"}
                    className="p-1.5 hover:bg-red-50 text-red-600 rounded disabled:opacity-30"
                    title="Delete"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}