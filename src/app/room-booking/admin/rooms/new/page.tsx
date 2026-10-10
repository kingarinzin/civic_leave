"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, Save, Plus, Trash2 } from "lucide-react";

interface MasterItem { _id: string; code: string; name: string; }

interface BedInput {
  bedLabel: string;
  bedTypeCode: string;
  rates: { tier1: number; tier2: number; tier3: number; tier4: number; tier5: number };
}

export default function NewRoomPage() {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [roomTypes, setRoomTypes] = useState<MasterItem[]>([]);
  const [bedTypes, setBedTypes] = useState<MasterItem[]>([]);
  const [amenities, setAmenities] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    roomNumber: "",
    roomName: "",
    roomTypeCode: "STANDARD",
    floor: 1,
    areaSqm: 20,
    description: "",
    amenities: [] as string[],
    wifiPassword: "",
    emergencyContact: "",
  });

  const [beds, setBeds] = useState<BedInput[]>([
    { bedLabel: "A", bedTypeCode: "SINGLE", rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 } },
  ]);

  useEffect(() => {
    async function load() {
      const [typesRes, bedsRes, amenRes] = await Promise.all([
        fetch("/api/room-booking/master/room-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/bed-types", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/room-booking/master/amenities", { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      setRoomTypes((await typesRes.json()).items || []);
      setBedTypes((await bedsRes.json()).items || []);
      setAmenities((await amenRes.json()).items || []);
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const addBed = () => {
    const labels = "ABCDEFGHIJ";
    setBeds([...beds, {
      bedLabel: labels[beds.length] || String(beds.length + 1),
      bedTypeCode: "SINGLE",
      rates: { tier1: 100, tier2: 200, tier3: 200, tier4: 600, tier5: 1000 },
    }]);
  };

  const removeBed = (idx: number) => setBeds(beds.filter((_, i) => i !== idx));

  const updateBed = (idx: number, patch: Partial<BedInput>) => {
    setBeds(beds.map((b, i) => i === idx ? { ...b, ...patch } : b));
  };

  const handleSubmit = async () => {
    if (!form.roomNumber || !form.roomTypeCode) {
      notify("Room number and type required", "error");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/room-booking/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...form, beds }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Create failed");
      }
      notify("Room created", "success");
      setTimeout(() => router.push("/room-booking/admin/rooms"), 1200);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin" size={28} /></div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white ${notification.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {notification.message}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4">
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-xl border p-6 mb-6">
          <h1 className="text-xl font-bold mb-4">Add New Room</h1>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium">Room Number *</label>
              <input value={form.roomNumber} onChange={(e) => setForm({ ...form, roomNumber: e.target.value })} placeholder="PRO-106" className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Room Name</label>
              <input value={form.roomName} onChange={(e) => setForm({ ...form, roomName: e.target.value })} className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Room Type *</label>
              <select value={form.roomTypeCode} onChange={(e) => setForm({ ...form, roomTypeCode: e.target.value })} className="w-full border rounded-md px-3 py-2 mt-1 text-sm">
                {roomTypes.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Floor</label>
              <input type="number" value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">Area (sq.m)</label>
              <input type="number" value={form.areaSqm} onChange={(e) => setForm({ ...form, areaSqm: Number(e.target.value) })} className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
            <div>
              <label className="text-sm font-medium">WiFi Password</label>
              <input value={form.wifiPassword} onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })} className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium">Description</label>
              <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border rounded-md px-3 py-2 mt-1 text-sm" />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-sm font-medium mb-2 block">Amenities</label>
            <div className="flex flex-wrap gap-2">
              {amenities.map((a) => {
                const isActive = form.amenities.includes(a.code);
                return (
                  <button key={a.code} onClick={() => setForm({ ...form, amenities: isActive ? form.amenities.filter((x) => x !== a.code) : [...form.amenities, a.code] })} className={`text-xs px-2.5 py-1 rounded-full border ${isActive ? "bg-black text-white border-black" : "bg-white text-gray-700"}`}>
                    {a.name}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Beds ({beds.length})</h2>
            <button onClick={addBed} className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs">
              <Plus size={14} /> Add Bed
            </button>
          </div>

          <div className="space-y-3">
            {beds.map((bed, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="grid grid-cols-3 gap-2 mb-2">
                  <input value={bed.bedLabel} onChange={(e) => updateBed(idx, { bedLabel: e.target.value })} placeholder="Label" className="border rounded px-2 py-1 text-sm" />
                  <select value={bed.bedTypeCode} onChange={(e) => updateBed(idx, { bedTypeCode: e.target.value })} className="border rounded px-2 py-1 text-sm">
                    {bedTypes.map((b) => <option key={b.code} value={b.code}>{b.name}</option>)}
                  </select>
                  <button onClick={() => removeBed(idx)} disabled={beds.length === 1} className="text-red-600 border rounded text-xs disabled:opacity-30"><Trash2 size={12} className="mx-auto" /></button>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {(["tier1", "tier2", "tier3", "tier4", "tier5"] as const).map((t) => (
                    <input key={t} type="number" value={bed.rates[t]} onChange={(e) => updateBed(idx, { rates: { ...bed.rates, [t]: Number(e.target.value) } })} placeholder={t} className="border rounded px-2 py-1 text-xs" />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-end mt-6">
            <button onClick={handleSubmit} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50">
              {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
              Create Room
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}