"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload, QrCode, Trash2 } from "lucide-react";

const AVAILABLE_AMENITIES = [
  "Chair",
  "WiFi",
  "Air Conditioning",
  "Room Heater",
  "Hot Water",
  "Smart TV",
  "Bathtub",
  "Mini Fridge",
  "Balcony",
  "Work Desk",
  "Wardrobe",
];

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Form State
  const [form, setForm] = useState({
    roomNumber: "",
    roomName: "",
    roomTypeCode: "STANDARD",
    floor: 1,
    areaSqm: 20,
    wifiPassword: "",
    emergencyContact: "",
    description: "",
    amenities: [] as string[],
  });

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(`/api/room-booking/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load room");
        const data = await res.json();
        
        // Populate the form with existing data
        setForm({
          roomNumber: data.room.roomNumber || "",
          roomName: data.room.roomName || "",
          roomTypeCode: data.room.roomTypeCode || "STANDARD",
          floor: data.room.floor || 1,
          areaSqm: data.room.areaSqm || 20,
          wifiPassword: data.room.wifiPassword || "",
          emergencyContact: data.room.emergencyContact || "",
          description: data.room.description || "",
          amenities: data.room.amenities || [],
        });
      } catch (err) {
        console.error(err);
        alert("Error loading room details");
      } finally {
        setLoading(false);
      }
    }
    if (roomId) loadRoom();
  }, [roomId, token]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/room-booking/rooms/${roomId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error("Failed to save room");
      alert("Room updated successfully!");
      router.refresh();
    } catch (err) {
      alert("Error saving room");
    } finally {
      setSaving(false);
    }
  };

  const toggleAmenity = (amenity: string) => {
    setForm((prev) => {
      const isSelected = prev.amenities.includes(amenity);
      if (isSelected) {
        return { ...prev, amenities: prev.amenities.filter((a) => a !== amenity) };
      } else {
        return { ...prev, amenities: [...prev.amenities, amenity] };
      }
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-gray-400" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Room {form.roomNumber}
            </h1>
          </div>
        </div>

        <div className="space-y-6">
          {/* Main Form Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Number</label>
                <input
                  type="text"
                  value={form.roomNumber}
                  onChange={(e) => setForm({ ...form, roomNumber: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Room Name</label>
                <input
                  type="text"
                  value={form.roomName}
                  onChange={(e) => setForm({ ...form, roomName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Floor</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">WiFi Password</label>
                <input
                  type="text"
                  value={form.wifiPassword}
                  onChange={(e) => setForm({ ...form, wifiPassword: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>

            {/* RESTORED AMENITIES SECTION */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <label className="block text-sm font-medium text-gray-700 mb-3">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_AMENITIES.map((amenity) => {
                  const isSelected = form.amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                        isSelected
                          ? "bg-black text-white border-black"
                          : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      {isSelected && "✓ "}
                      {amenity}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2 bg-black text-white rounded-md text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                Save Room
              </button>
            </div>
          </div>

          {/* QR CODE SECTION */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <QrCode size={20} /> Room QR Code
              </h3>
              <p className="text-sm text-gray-500 mt-1">
                This QR code is used by guests to quickly view room amenities and check-in details.
              </p>
            </div>
            
            {/* Display the QR code image. Ensure your database returns 'qrCodeUrl' */}
            <div className="flex flex-col items-center gap-3">
               <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                 {/* Replace the span below with an actual img tag if you have the QR URL in your DB */}
                 {/* <img src={`/api/room-booking/rooms/${roomId}/qrcode`} alt="Room QR" className="w-full h-full p-2" /> */}
                 <span className="text-xs text-gray-400 text-center px-2">QR Code<br/>Generation</span>
               </div>
               <button className="text-xs text-blue-600 hover:underline">Download QR</button>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}