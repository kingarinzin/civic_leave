"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  CalendarDays, 
  BedDouble, 
  FileText,
  ShieldCheck
} from "lucide-react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface BookingWizardProps {
  room: any;
  beds: any[];
  preselectedBedIds: string[];
  isInsideModal?: boolean;
  onCloseModal?: () => void;
}

export default function BookingWizard({
  room,
  beds,
  preselectedBedIds,
  isInsideModal = false,
  onCloseModal,
}: BookingWizardProps) {
  const router = useRouter();
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [selectedBedIds, setSelectedBedIds] = useState<string[]>(preselectedBedIds);
  const [checkIn, setCheckIn] = useState<Date | null>(null);
  const [checkOut, setCheckOut] = useState<Date | null>(null);
  const [purpose, setPurpose] = useState("");

  const handleCancel = () => {
    if (isInsideModal && onCloseModal) {
      onCloseModal();
    } else {
      router.push("/room-booking");
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    try {
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
        }),
      });

      if (!res.ok) throw new Error("Booking failed. Please try again.");

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

  // Calculate nights for summary
  const nights = checkIn && checkOut 
    ? Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 3600 * 24))) 
    : 0;

  const totalCost = selectedBedIds.reduce((sum, bedId) => {
    const bed = beds.find((b) => b._id === bedId);
    return sum + ((bed?.rates?.tier2 || 0) * (nights || 1));
  }, 0);

  return (
    <div className={`w-full ${isInsideModal ? "" : "max-w-3xl mx-auto bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"}`}>
      
      {/* Header / Progress Bar */}
      <div className="px-6 pt-6 pb-4 border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Complete your booking</h2>
            <p className="text-sm text-gray-500">Room {room.roomNumber} · {room.roomTypeName}</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-sm font-medium text-green-600 bg-green-50 px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} /> Secure Booking
          </div>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-100 -z-10 rounded-full"></div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-black -z-10 rounded-full transition-all duration-300" style={{ width: `${((step - 1) / 3) * 100}%` }}></div>
          
          {[
            { num: 1, label: "Beds", icon: BedDouble },
            { num: 2, label: "Dates", icon: CalendarDays },
            { num: 3, label: "Details", icon: FileText },
            { num: 4, label: "Confirm", icon: CheckCircle2 }
          ].map((s) => {
            const Icon = s.icon;
            const isActive = step === s.num;
            const isCompleted = step > s.num;
            return (
              <div key={s.num} className="flex flex-col items-center gap-2 bg-white px-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                  isCompleted ? "bg-green-500 text-white" : 
                  isActive ? "bg-black text-white ring-4 ring-gray-100" : 
                  "bg-gray-100 text-gray-400"
                }`}>
                  {isCompleted ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                </div>
                <span className={`text-xs font-semibold ${isActive || isCompleted ? "text-gray-900" : "text-gray-400"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 min-h-[300px]">
        
        {/* STEP 1: Select Bed */}
        {step === 1 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select available beds</h3>
            <div className="grid grid-cols-1 gap-3">
              {beds.map((bed) => {
                const isSelected = selectedBedIds.includes(bed._id);
                const isAvailable = bed.status === "AVAILABLE";
                return (
                  <label 
                    key={bed._id} 
                    className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      !isAvailable ? "opacity-50 cursor-not-allowed bg-gray-50 border-transparent" :
                      isSelected ? "border-black bg-gray-50 shadow-sm" : "border-gray-200 hover:border-gray-300 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-full ${isSelected ? "bg-black text-white" : "bg-gray-100 text-gray-500"}`}>
                        <BedDouble size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">Bed {bed.bedLabel} <span className="text-sm font-normal text-gray-500">({bed.bedTypeCode})</span></p>
                        <p className="text-sm text-gray-600 font-medium">Nu. {bed.rates?.tier2 || 0} / night</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      {isAvailable ? (
                         <input 
                         type="checkbox" 
                         className="w-5 h-5 accent-black rounded cursor-pointer"
                         checked={isSelected}
                         onChange={(e) => {
                           if (e.target.checked) setSelectedBedIds([...selectedBedIds, bed._id]);
                           else setSelectedBedIds(selectedBedIds.filter(id => id !== bed._id));
                         }}
                       />
                      ) : (
                        <span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-1 rounded">Occupied</span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 2: Custom Airbnb-Style Date Picker */}
        {step === 2 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">When are you staying?</h3>
            
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 w-full">
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
            </div>

            {nights > 0 && (
              <div className="mt-4 p-4 bg-blue-50 text-blue-800 rounded-xl flex items-center gap-2 text-sm font-medium animate-in fade-in">
                <CalendarDays size={18} /> Your stay is {nights} night{nights > 1 ? "s" : ""} long.
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Details */}
        {step === 3 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Additional Details</h3>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Purpose of Stay <span className="text-red-500">*</span></label>
              <textarea 
                value={purpose} 
                onChange={(e) => setPurpose(e.target.value)} 
                className="w-full border border-gray-300 rounded-xl p-4 text-sm h-32 focus:ring-2 focus:ring-black outline-none transition-shadow bg-white resize-none" 
                placeholder="Please provide a brief reason for your stay (e.g., Official duty, transit, etc.)..."
              ></textarea>
            </div>
          </div>
        )}

        {/* STEP 4: Confirm */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 text-center py-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 size={40} className="text-green-600" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Review your booking</h3>
            <p className="text-sm text-gray-500 mb-8 max-w-sm mx-auto">
              Please review the details below before confirming your reservation.
            </p>
            
            <div className="bg-gray-50 rounded-2xl p-6 text-left border border-gray-200 max-w-md mx-auto space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Room</span>
                <span className="font-semibold">{room.roomNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Beds Selected</span>
                <span className="font-semibold">{selectedBedIds.length} Bed(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Dates</span>
                <span className="font-semibold">
                  {checkIn?.toLocaleDateString()} to {checkOut?.toLocaleDateString()}
                </span>
              </div>
              <div className="border-t border-gray-200 pt-3 mt-3 flex justify-between">
                <span className="font-bold text-gray-900">Total Cost</span>
                <span className="font-bold text-green-600 text-lg">Nu. {totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Sticky Footer Actions */}
      <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between mt-auto">
        <button
          onClick={step === 1 ? handleCancel : () => setStep(step - 1)}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          {step === 1 ? "Cancel" : <><ArrowLeft size={18} /> Back</>}
        </button>

        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={(step === 1 && selectedBedIds.length === 0) || (step === 2 && (!checkIn || !checkOut))}
            className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-black hover:bg-gray-800 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            Continue <ArrowRight size={18} />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-8 py-2.5 text-sm font-bold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all shadow-md disabled:opacity-50 disabled:shadow-none"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : "Confirm Booking"}
          </button>
        )}
      </div>
    </div>
  );
}