"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  CalendarDays, 
  BedDouble, 
  Users,
  Building2,
  UserCheck,
  Plus,
  X,
  Edit3
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function BookingWizard({
  room,
  beds,
  preselectedBedIds,
  isInsideModal = false,
  onCloseModal,
}: any) {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Core Form State
  const [selectedBedIds, setSelectedBedIds] = useState<string[]>(preselectedBedIds);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [purpose, setPurpose] = useState("");

  // --- UNIFIED GUEST LIST STATE ---
  const [guests, setGuests] = useState<any[]>([]);
  
  // Tracks which category form is currently open (Defaults to ACC_STAFF)
  const [activeTab, setActiveTab] = useState("ACC_STAFF"); 
  
  // Tracks which guest ID is currently being edited
  const [editingGuestId, setEditingGuestId] = useState<string | null>(null);

  // Family Members Data
  const [familyMembers, setFamilyMembers] = useState<any[]>([]);

  // Fetch Family Members on mount
  useEffect(() => {
    async function loadFamily() {
      try {
        const res = await fetch("/api/room-booking/family/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setFamilyMembers((data.items || []).filter((f: any) => f.status === "VERIFIED"));
      } catch (err) {
        console.error("Failed to load family", err);
      }
    }
    loadFamily();
  }, [token]);

  // Calculate Tier Rate
  const getTierKey = (type: string) => {
    switch(type) {
      case "ACC_STAFF": return "tier2";
      case "FAMILY": return "tier3";
      case "CO_AGENCY": return "tier4";
      case "STAKEHOLDER": return "tier5";
      default: return "tier2";
    }
  };

  const totalNights = checkIn && checkOut 
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24))) 
    : 0;

  // Calculate cost per guest
  let totalCost = 0;
  const guestCosts = guests.map(guest => {
    const tierKey = getTierKey(guest.type);
    
    // Calculate base rate for 1 night for this guest
    const bedRatePerNight = selectedBedIds.reduce((sum, bedId) => {
      const bed = beds.find((b: any) => b._id === bedId);
      return sum + Number(bed?.rates?.[tierKey] || 0);
    }, 0);
    
    const guestTotal = bedRatePerNight * (totalNights || 1);
    totalCost += guestTotal;

    return { ...guest, bedRatePerNight, total: guestTotal };
  });

  const isStep1Valid = () => {
    if (selectedBedIds.length === 0) return false;
    if (guests.length === 0) return false;
    
    const manualGuests = guests.filter(g => g.type === "CO_AGENCY" || g.type === "STAKEHOLDER");
    if (manualGuests.some(g => !g.fullName?.trim() || g.fullName === "Unknown Guest")) return false;
    
    return true;
  };

  const handleCancel = () => {
    if (isInsideModal && onCloseModal) onCloseModal();
    else router.push("/room-booking");
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const formattedGuests = guests.map(g => ({
        occupantType: g.type,
        fullName: g.fullName,
        familyRegistryId: g.familyId,
        agencyName: g.agencyName,
        designation: g.designation,
        contactNo: g.contactNo,
      }));

      const res = await fetch("/api/room-booking/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          roomId: room._id,
          bedIds: selectedBedIds,
          checkIn,
          checkOut,
          purpose,
          guests: formattedGuests, 
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Booking failed.");
      }

      alert("🎉 Booking Successful!");
      if (isInsideModal && onCloseModal) {
        onCloseModal();
        router.refresh();
      } else {
        router.push("/room-booking/my-bookings");
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- HELPERS ---
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    
    if (tabId === "ACC_STAFF") {
      const hasStaff = guests.some(g => g.type === "ACC_STAFF");
      if (!hasStaff) {
        setGuests(prev => [
          ...prev, 
          { id: "staff_self", type: "ACC_STAFF", fullName: "Myself (ACC Staff)" }
        ]);
      }
    }
  };

  const addFamilyMember = (fam: any) => {
    if (guests.some(g => g.familyId === fam._id)) return;
    setGuests([...guests, {
      id: Date.now().toString(),
      type: "FAMILY",
      familyId: fam._id,
      fullName: fam.fullName,
      relationship: fam.relationshipCode
    }]);
  };

  const addManualGuest = (type: "CO_AGENCY" | "STAKEHOLDER") => {
    const newId = Date.now().toString();
    setGuests([...guests, {
      id: newId,
      type,
      fullName: "",
      agencyName: "",
      contactNo: ""
    }]);
    setEditingGuestId(newId); 
  };

  const removeGuest = (id: string) => {
    setGuests(guests.filter(g => g.id !== id));
    if (editingGuestId === id) setEditingGuestId(null);
  };

  const updateGuestField = (id: string, field: string, value: string) => {
    setGuests(guests.map(g => g.id === id ? { ...g, [field]: value } : g));
  };

  const finishEditing = () => {
    const currentGuest = guests.find(g => g.id === editingGuestId);
    if (currentGuest && !currentGuest.fullName?.trim()) {
       updateGuestField(editingGuestId!, "fullName", "Unknown Guest");
    }
    setEditingGuestId(null);
  };

  const getPillColor = (type: string) => {
    switch(type) {
      case "ACC_STAFF": return "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200";
      case "FAMILY": return "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100";
      case "CO_AGENCY": return "bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100";
      case "STAKEHOLDER": return "bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className={`w-full ${isInsideModal ? "" : "max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"}`}>
      
      {/* Header */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Complete your booking</h2>
            <p className="text-sm text-gray-500">Room {room.roomNumber} · {room.roomTypeName}</p>
          </div>
        </div>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          {[1, 2, 3, 4].map((num) => (
            <div key={num} className="flex flex-col items-center gap-2 bg-white px-2">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                step > num ? "bg-blue-600 text-white" : 
                step === num ? "bg-blue-600 text-white ring-4 ring-blue-100" : 
                "bg-gray-100 text-gray-400"
              }`}>
                {step > num ? <CheckCircle2 size={18} /> : num}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[400px]">
        
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in">
            
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Guests (Select Tier)</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { id: "ACC_STAFF", label: "Staff", icon: UserCheck },
                  { id: "FAMILY", label: "Family", icon: Users },
                  { id: "CO_AGENCY", label: "Co-Agency", icon: Building2 },
                  { id: "STAKEHOLDER", label: "Stakeholder", icon: Users },
                ].map((type) => (
                  <button
                    key={type.id}
                    onClick={() => handleTabChange(type.id)}
                    className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                      activeTab === type.id ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <type.icon size={20} className="mb-1" />
                    <span className="text-xs font-bold">{type.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
              {activeTab === "ACC_STAFF" && (
                <div className="text-center text-sm text-gray-500 py-4">
                  {guests.some(g => g.type === "ACC_STAFF") 
                    ? "You have been added as an ACC Staff guest." 
                    : "Click the Staff tab again to add yourself as a guest."}
                </div>
              )}

              {activeTab === "FAMILY" && (
                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-gray-700">Select Verified Family Members</label>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {familyMembers.length === 0 ? (
                      <p className="text-sm text-gray-500">No verified family members found.</p>
                    ) : (
                      familyMembers.map((f) => {
                        const isAdded = guests.some(g => g.familyId === f._id);
                        return (
                          <label key={f._id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${isAdded ? "bg-blue-50 border-blue-200" : "bg-white border-gray-200 hover:bg-gray-50"}`}>
                            <input 
                              type="checkbox" 
                              checked={isAdded}
                              onChange={(e) => e.target.checked ? addFamilyMember(f) : removeGuest(guests.find(g => g.familyId === f._id)?.id)}
                              className="w-4 h-4 accent-blue-600 rounded" 
                            />
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{f.fullName}</p>
                              <p className="text-xs text-gray-500">{f.relationshipCode} · CID: {f.cid}</p>
                            </div>
                          </label>
                        );
                      })
                    )}
                  </div>
                </div>
              )}

              {activeTab === "CO_AGENCY" && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Add co-agency officers.</span>
                  <button onClick={() => addManualGuest("CO_AGENCY")} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition">
                    <Plus size={14} /> Add Co-Agency
                  </button>
                </div>
              )}

              {activeTab === "STAKEHOLDER" && (
                <div className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-600">Add stakeholders.</span>
                  <button onClick={() => addManualGuest("STAKEHOLDER")} className="flex items-center gap-1 text-xs font-bold text-blue-600 bg-blue-100 px-3 py-1.5 rounded-full hover:bg-blue-200 transition">
                    <Plus size={14} /> Add Stakeholder
                  </button>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center justify-between">
                <span>Selected Guests</span>
                <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold">{guests.length} Total</span>
              </h3>
              
              <div className="flex flex-wrap gap-2 mb-4">
                {guests.length === 0 && (
                  <span className="text-sm text-gray-400 italic">No guests added yet. Please click a tier to add.</span>
                )}
                {guests.map((g) => (
                  <div 
                    key={g.id} 
                    onClick={() => {
                      if (g.type !== "FAMILY" && g.type !== "ACC_STAFF") {
                        setEditingGuestId(g.id);
                      }
                    }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition ${
                      g.type !== "FAMILY" && g.type !== "ACC_STAFF" ? "cursor-pointer" : ""
                    } ${getPillColor(g.type)} ${editingGuestId === g.id ? "ring-2 ring-black" : ""}`}
                  >
                    <span>{g.fullName || `New ${g.type.replace("_", " ")}`}</span>
                    
                    {g.type !== "FAMILY" && g.type !== "ACC_STAFF" && (
                      <Edit3 size={12} className="opacity-50" />
                    )}

                    <button onClick={(e) => { e.stopPropagation(); removeGuest(g.id); }} className="hover:bg-black/10 rounded-full p-0.5 transition">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {editingGuestId && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm animate-in fade-in">
                  {(() => {
                    const g = guests.find(x => x.id === editingGuestId);
                    if (!g) return null;
                    
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getPillColor(g.type)}`}>{g.type.replace("_", " ")}</span>
                            <span className="text-xs font-semibold text-gray-600">Editing Details</span>
                          </div>
                          <button onClick={finishEditing} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100">
                            Done
                          </button>
                        </div>

                        <input 
                          type="text" 
                          placeholder="Full Name *" 
                          value={g.fullName || ""} 
                          onChange={(e) => updateGuestField(g.id, "fullName", e.target.value)}
                          className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
                          autoFocus
                        />
                        
                        {g.type === "CO_AGENCY" && (
                          <div className="grid grid-cols-2 gap-2">
                            <input 
                              type="text" 
                              placeholder="Agency Name" 
                              value={g.agencyName || ""} 
                              onChange={(e) => updateGuestField(g.id, "agencyName", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
                            />
                            <input 
                              type="text" 
                              placeholder="Contact No" 
                              value={g.contactNo || ""} 
                              onChange={(e) => updateGuestField(g.id, "contactNo", e.target.value)}
                              className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
                            />
                          </div>
                        )}

                        {g.type === "STAKEHOLDER" && (
                          <input 
                            type="text" 
                            placeholder="Organization / Designation" 
                            value={g.agencyName || ""} 
                            onChange={(e) => updateGuestField(g.id, "agencyName", e.target.value)}
                            className="w-full border border-gray-300 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-blue-600 outline-none" 
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Select Beds</h3>
              <div className="grid grid-cols-1 gap-3">
                {beds.map((bed: any) => {
                  const isSelected = selectedBedIds.includes(bed._id);
                  return (
                    <label key={bed._id} className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                        isSelected ? "border-blue-600 bg-blue-50/30" : "border-gray-200 bg-white hover:border-gray-300"
                      }`}>
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-full ${isSelected ? "bg-blue-600 text-white" : "bg-gray-100"}`}>
                          <BedDouble size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">Bed {bed.bedLabel}</p>
                        </div>
                      </div>
                      <input type="checkbox" checked={isSelected} onChange={(e) => {
                        if (e.target.checked) setSelectedBedIds([...selectedBedIds, bed._id]);
                        else setSelectedBedIds(selectedBedIds.filter((id: string) => id !== bed._id));
                      }} className="w-5 h-5 accent-blue-600" />
                    </label>
                  );
                })}
              </div>
            </div>

          </div>
        )}

        {step === 2 && (
          <div className="animate-in fade-in">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">When are you staying?</h3>
            <DatePicker
              selected={checkIn}
              onChange={(dates: any) => {
                const [start, end] = dates;
                setCheckIn(start);
                setCheckOut(end);
              }}
              startDate={checkIn}
              endDate={checkOut}
              selectsRange
              inline
              monthsShown={2}
              minDate={new Date()}
              calendarClassName="custom-calendar"
            />
            {totalNights > 0 && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl font-medium">
                Stay length: {totalNights} nights
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="animate-in fade-in">
            <h3 className="text-lg font-semibold mb-4">Purpose of Stay</h3>
            <textarea 
              value={purpose} 
              onChange={(e) => setPurpose(e.target.value)} 
              className="w-full border rounded-xl p-4 h-32 focus:ring-2 focus:ring-blue-600 outline-none" 
              placeholder="Reason for stay..."
            ></textarea>
          </div>
        )}

        {/* STEP 4: REVIEW WITH EXPLICIT RATE X NIGHTS BREAKDOWN */}
        {step === 4 && (
          <div className="animate-in fade-in py-6">
            <div className="text-center mb-6">
              <CheckCircle2 size={48} className="text-green-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold text-gray-900">Review & Confirm</h3>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 max-w-md mx-auto space-y-4">
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dates</span>
                <span className="font-semibold">
                  {checkIn?.toLocaleDateString()} to {checkOut?.toLocaleDateString()} ({totalNights} nights)
                </span>
              </div>

              <div className="border-t border-gray-200 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Pricing Breakdown</p>
                
                <div className="space-y-3">
                  {guestCosts.map((g, idx) => (
                    <div key={idx} className="flex justify-between items-start text-sm text-gray-700">
                      <div className="flex flex-col">
                        <span className="font-semibold text-gray-900">{g.fullName}</span>
                        {/* CLEAR BREAKDOWN: Rate x Nights */}
                        <span className="text-xs text-gray-500">
                          Nu. {g.bedRatePerNight.toLocaleString()} / night × {totalNights || 1} nights
                        </span>
                      </div>
                      <span className="font-semibold mt-1">Nu. {g.total.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 flex justify-between items-center">
                <span className="font-bold text-gray-900">Total Cost</span>
                <span className="font-bold text-blue-600 text-xl">Nu. {totalCost.toLocaleString()}</span>
              </div>

            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-gray-100 flex items-center justify-between">
        <button onClick={step === 1 ? handleCancel : () => setStep(step - 1)} className="px-5 py-2.5 font-semibold text-gray-600">
          {step === 1 ? "Cancel" : "Back"}
        </button>
        {step < 4 ? (
          <button onClick={() => setStep(step + 1)} disabled={!isStep1Valid() || (step === 2 && (!checkIn || !checkOut))} className="px-8 py-2.5 font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">
            Continue
          </button>
        ) : (
          <button onClick={handleSubmit} disabled={loading} className="px-8 py-2.5 font-bold text-white bg-green-600 rounded-lg disabled:opacity-50">
            {loading ? <Loader2 className="animate-spin" /> : "Confirm Booking"}
          </button>
        )}
      </div>
    </div>
  );
}