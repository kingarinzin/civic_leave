"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload, QrCode, Trash2, Plus, BedDouble } from "lucide-react";

const AVAILABLE_AMENITIES = [
  "Chair", "WiFi", "Air Conditioning", "Room Heater", "Hot Water", 
  "Smart TV", "Bathtub", "Mini Fridge", "Balcony", "Work Desk", "Wardrobe"
];

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams();
  const roomId = params?.id as string;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    photos: [] as { url: string; key: string; isPrimary: boolean }[],
    beds: [] as any[],
  });

  const [qrUrl, setQrUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadRoom() {
      try {
        const res = await fetch(`/api/room-booking/rooms/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load room");
        const data = await res.json();
        
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
          photos: data.room.photos || [],
          beds: data.room.beds || [],
        });
        setQrUrl(data.room.qrCodeUrl || null);
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

  const addBed = () => {
    const newBed = {
      _id: `new_${Date.now()}`,
      bedLabel: `${form.beds.length + 1}`,
      bedTypeCode: "SINGLE",
      status: "AVAILABLE",
      rates: { tier1: 0, tier2: 0, tier3: 0, tier4: 0, tier5: 0 }
    };
    setForm(prev => ({ ...prev, beds: [...prev.beds, newBed] }));
  };

  const removeBed = (bedId: string) => {
    if (!confirm("Are you sure you want to remove this bed?")) return;
    setForm(prev => ({ ...prev, beds: prev.beds.filter(b => b._id !== bedId) }));
  };

  const updateBed = (bedId: string, field: string, value: string) => {
    setForm(prev => ({
      ...prev,
      beds: prev.beds.map(b => b._id === bedId ? { ...b, [field]: value } : b)
    }));
  };

  const handleRegenerateQr = async () => {
    try {
      const res = await fetch(`/api/room-booking/rooms/${roomId}/qrcode`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to regenerate QR");
      const data = await res.json();
      setQrUrl(data.url);
      alert("QR Code regenerated!");
    } catch (err) {
      alert("Error regenerating QR Code");
    }
  };

  // --- PHOTO HANDLERS ---
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      // Hitting the exact API route you provided
      const res = await fetch(`/api/room-booking/rooms/${roomId}/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Upload failed");
      }
      
      const data = await res.json();
      
      // Since the API returns the photo object, we just append it to our state
      setForm(prev => ({ ...prev, photos: [...prev.photos, data.photo] }));
      alert("Photo uploaded successfully!");
    } catch (err: any) {
      alert(err.message || "Error uploading photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removePhoto = async (key: string, index: number) => {
    if (!confirm("Delete this photo?")) return;
    
    try {
      // Hitting the exact DELETE route you provided
      const res = await fetch(`/api/room-booking/rooms/${roomId}/upload?key=${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!res.ok) throw new Error("Failed to delete photo");
      
      // Remove it from the UI
      setForm(prev => {
        const newPhotos = prev.photos.filter((_, i) => i !== index);
        // If we deleted the primary photo, make the first one primary
        if (prev.photos[index].isPrimary && newPhotos.length > 0) {
          newPhotos[0].isPrimary = true;
        }
        return { ...prev, photos: newPhotos };
      });
    } catch (err) {
      alert("Error deleting photo");
    }
  };

  const setPrimaryPhoto = (index: number) => {
    setForm(prev => ({
      ...prev,
      photos: prev.photos.map((p, i) => ({ ...p, isPrimary: i === index }))
    }));
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
          {/* Main Details Card */}
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

            {/* AMENITIES */}
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

          {/* ROOM PHOTOS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Room Photos ({form.photos.length})</h3>
              
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handleFileUpload} 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50 transition shadow-sm disabled:opacity-50"
              >
                {uploading ? <Loader2 className="animate-spin" size={14} /> : <Upload size={14} />} 
                {uploading ? "Uploading..." : "Upload Photo"}
              </button>
            </div>
            
            {form.photos.length === 0 ? (
              <div className="p-8 text-center text-gray-500 border-2 border-dashed rounded-lg">
                No photos uploaded yet.
              </div>
            ) : (
              <div className="flex flex-wrap gap-4">
                {form.photos.map((photo, idx) => (
                  <div key={idx} className="w-48 h-32 rounded-lg overflow-hidden relative border group shadow-sm">
                    <img src={photo.url} className="w-full h-full object-cover" />
                    
                    <div 
                      onClick={() => setPrimaryPhoto(idx)}
                      className={`absolute top-2 left-2 text-[10px] px-2 py-0.5 rounded cursor-pointer transition ${
                        photo.isPrimary 
                          ? "bg-black/80 text-white font-bold" 
                          : "bg-white/80 text-gray-600 hover:bg-white"
                      }`}
                    >
                      {photo.isPrimary ? "Primary" : "Set Primary"}
                    </div>

                    {/* DELETE BUTTON CALLING YOUR API */}
                    <button 
                      onClick={() => removePhoto(photo.key, idx)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition shadow-sm hover:bg-red-600"
                      title="Delete Photo"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* BEDS */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Beds ({form.beds.length})</h3>
              <button 
                onClick={addBed}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium hover:bg-gray-200 transition"
              >
                <Plus size={14} /> Add Bed
              </button>
            </div>
            
            <div className="space-y-3">
              {form.beds.map((bed) => (
                <div key={bed._id} className="flex items-center justify-between p-3 border rounded-lg bg-gray-50/50">
                  <div className="flex items-center gap-3">
                    <BedDouble className="text-gray-400" size={18} />
                    <div className="flex flex-col">
                      <input 
                        type="text" 
                        value={bed.bedLabel} 
                        onChange={(e) => updateBed(bed._id, "bedLabel", e.target.value)}
                        className="text-sm font-medium bg-transparent border-b border-transparent hover:border-gray-300 focus:border-black outline-none w-24"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Rates: T1: {bed.rates?.tier1 || 0} · T2: {bed.rates?.tier2 || 0}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <select 
                      value={bed.bedTypeCode}
                      onChange={(e) => updateBed(bed._id, "bedTypeCode", e.target.value)}
                      className="text-xs border rounded px-2 py-1 bg-white outline-none focus:border-black"
                    >
                      <option value="SINGLE">SINGLE</option>
                      <option value="DOUBLE">DOUBLE</option>
                      <option value="KING">KING</option>
                    </select>
                    <span className={`text-[10px] px-2 py-1 rounded-full ${bed.status === "AVAILABLE" ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-700"}`}>
                      {bed.status}
                    </span>
                    <button onClick={() => removeBed(bed._id)} className="text-red-500 hover:bg-red-50 p-1.5 rounded transition">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}
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
            
            <div className="flex flex-col items-center gap-3">
               <div className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center overflow-hidden">
                 {qrUrl ? (
                   <img src={qrUrl} alt="Room QR" className="w-full h-full object-contain p-2" />
                 ) : (
                   <span className="text-xs text-gray-400 text-center px-2">QR Code<br/>Generation</span>
                 )}
               </div>
               {qrUrl ? (
                 <a href={qrUrl} download={`QR-${form.roomNumber}.png`} className="text-xs text-blue-600 hover:underline">Download QR</a>
               ) : (
                 <button onClick={handleRegenerateQr} className="text-xs text-blue-600 hover:underline">Generate QR</button>
               )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}