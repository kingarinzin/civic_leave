"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ArrowLeft, ArrowRight, Check, Calendar } from "lucide-react";
import VerifiedFamilySelector, { VerifiedFamily } from "./VerifiedFamilySelector";

interface Bed {
  _id: string;
  bedLabel: string;
  bedTypeCode: string;
  status: string;
  rates: Record<string, number>;
  roomId: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  roomTypeCode: string;
  roomTypeName: string;
  floor: number;
}

interface Props {
  room: Room;
  beds: Bed[];
  preselectedBedIds?: string[];
}

const OCCUPANT_TYPES = [
  { code: "ACC_STAFF", label: "Self (ACC Staff)", tier: "tier2" },
  { code: "FAMILY", label: "Family (Verified)", tier: "tier3" },
  { code: "CO_AGENCY", label: "Co-Agency Officer", tier: "tier4" },
];

export default function BookingWizard({
  room,
  beds,
  preselectedBedIds = [],
}: Props) {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState({
    occupantType: "ACC_STAFF",
    familyRegistryId: "",
    familyMember: null as VerifiedFamily | null,
    fullName: "",
    idType: "EMPLOYEE_ID",
    idNumber: "",
    agencyName: "",
    designation: "",
    contactNo: "",
    email: "",
    selectedBedIds: preselectedBedIds as string[],
    checkIn: "",
    checkOut: "",
    purpose: "",
    caseRefNo: "",
    paymentMode: "PAYROLL_DEDUCTION",
    declaration: false,
  });

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const selectedBeds = beds.filter((b) => form.selectedBedIds.includes(b._id));

  const tierKey =
    form.occupantType === "ACC_STAFF"
      ? "tier2"
      : form.occupantType === "FAMILY"
        ? "tier3"
        : form.occupantType === "CO_AGENCY"
          ? "tier4"
          : "tier5";

  const ratePerBed = selectedBeds.reduce(
    (sum, b) => sum + Number(b.rates?.[tierKey] || 0),
    0,
  );

  const nights = (() => {
    if (!form.checkIn || !form.checkOut) return 0;
    const diff =
      (new Date(form.checkOut).getTime() - new Date(form.checkIn).getTime()) /
      (1000 * 60 * 60 * 24);
    return Math.max(0, Math.ceil(diff));
  })();

  const totalAmount = ratePerBed * nights;

  const toggleBed = (bedId: string) => {
    setForm((f) => ({
      ...f,
      selectedBedIds: f.selectedBedIds.includes(bedId)
        ? f.selectedBedIds.filter((id) => id !== bedId)
        : [...f.selectedBedIds, bedId],
    }));
  };

  const canProceedStep1 = form.selectedBedIds.length > 0;
  const canProceedStep2 =
    form.occupantType === "FAMILY"
      ? !!form.familyMember
      : form.occupantType === "ACC_STAFF"
        ? true
        : !!form.fullName && !!form.idNumber && !!form.agencyName;
  const canProceedStep3 =
    !!form.checkIn && !!form.checkOut && nights > 0 && !!form.purpose;

  const handleSubmit = async () => {
    if (!form.declaration) {
      notify("Please accept the declaration", "error");
      return;
    }
    setSaving(true);
    try {
      const occupant: any = {
        occupantType: form.occupantType,
        fullName: form.fullName,
        idType: form.idType,
        idNumber: form.idNumber,
      };
      if (form.occupantType === "FAMILY") {
        occupant.familyRegistryId = form.familyRegistryId;
        if (form.familyMember) {
          occupant.fullName = form.familyMember.fullName;
          occupant.idNumber = form.familyMember.cid;
        }
      }
      if (form.occupantType === "CO_AGENCY") {
        occupant.agencyName = form.agencyName;
        occupant.designation = form.designation;
        occupant.contactNo = form.contactNo;
        occupant.email = form.email;
      }

      const payload = {
        occupant,
        roomId: room._id,
        bedIds: form.selectedBedIds,
        bookingScope:
          form.selectedBedIds.length === beds.length ? "WHOLE_ROOM" : "SINGLE_BED",
        checkIn: form.checkIn,
        checkOut: form.checkOut,
        purpose: form.purpose,
        caseRefNo: form.caseRefNo || null,
        paymentMode: form.paymentMode,
      };

      const res = await fetch("/api/room-booking/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Booking failed");
      }

      const data = await res.json();
      notify("Booking created! Ref: " + data.bookingRef, "success");
      setTimeout(() => router.push("/room-booking/my-bookings"), 1500);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg text-white ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2 mb-8">
        {[1, 2, 3, 4].map((n) => (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                step >= n ? "bg-black text-white" : "bg-gray-200 text-gray-500"
              }`}
            >
              {step > n ? <Check size={14} /> : n}
            </div>
            {n < 4 && (
              <div
                className={`w-12 h-0.5 ${
                  step > n ? "bg-black" : "bg-gray-200"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        {/* STEP 1 — Select Bed */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold mb-1">Select Bed</h2>
            <p className="text-sm text-gray-500 mb-4">
              Room {room.roomNumber} · {room.roomTypeName} · Floor {room.floor}
            </p>
            <div className="space-y-2">
              {beds.map((b) => {
                const isSelected = form.selectedBedIds.includes(b._id);
                const isAvailable = b.status === "AVAILABLE";
                return (
                  <button
                    key={b._id}
                    onClick={() => isAvailable && toggleBed(b._id)}
                    disabled={!isAvailable}
                    className={`w-full flex items-center justify-between p-4 border rounded-lg text-left ${
                      isSelected
                        ? "border-black bg-gray-50"
                        : isAvailable
                          ? "border-gray-200 hover:border-gray-400"
                          : "border-gray-100 bg-gray-50 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    <div>
                      <p className="font-medium">
                        Bed {b.bedLabel} — {b.bedTypeCode}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {isAvailable
                          ? `Nu. ${b.rates?.[tierKey] ?? 0}/night`
                          : b.status}
                      </p>
                    </div>
                    {isSelected && <Check size={18} className="text-black" />}
                  </button>
                );
              })}
            </div>
            {selectedBeds.length === beds.length && beds.length > 1 && (
              <p className="text-xs text-green-700 bg-green-50 p-2 rounded mt-3">
                ✓ Whole room selected ({beds.length} beds)
              </p>
            )}
          </div>
        )}

        {/* STEP 2 — Occupant */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Occupant Details</h2>
              <p className="text-sm text-gray-500 mb-4">Who is staying?</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Occupant Type
              </label>
              <select
                value={form.occupantType}
                onChange={(e) =>
                  setForm({
                    ...form,
                    occupantType: e.target.value,
                    familyMember: null,
                    familyRegistryId: "",
                  })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              >
                {OCCUPANT_TYPES.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {form.occupantType === "ACC_STAFF" && (
              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                Booking for yourself at ACC staff rate.
              </p>
            )}

            {form.occupantType === "FAMILY" && (
              <VerifiedFamilySelector
                value={form.familyRegistryId}
                onChange={(member) =>
                  setForm({
                    ...form,
                    familyMember: member,
                    familyRegistryId: member?._id || "",
                  })
                }
              />
            )}

            {form.occupantType === "CO_AGENCY" && (
              <>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Full Name *
                  </label>
                  <input
                    value={form.fullName}
                    onChange={(e) =>
                      setForm({ ...form, fullName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Agency Name *
                  </label>
                  <input
                    value={form.agencyName}
                    onChange={(e) =>
                      setForm({ ...form, agencyName: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      CID/ID *
                    </label>
                    <input
                      value={form.idNumber}
                      onChange={(e) =>
                        setForm({ ...form, idNumber: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Designation
                    </label>
                    <input
                      value={form.designation}
                      onChange={(e) =>
                        setForm({ ...form, designation: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Contact
                    </label>
                    <input
                      value={form.contactNo}
                      onChange={(e) =>
                        setForm({ ...form, contactNo: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Email
                    </label>
                    <input
                      value={form.email}
                      onChange={(e) =>
                        setForm({ ...form, email: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* STEP 3 — Dates */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Stay Details</h2>
              <p className="text-sm text-gray-500 mb-4">
                Dates, purpose, and payment
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Check-in *
                </label>
                <input
                  type="date"
                  value={form.checkIn}
                  onChange={(e) =>
                    setForm({ ...form, checkIn: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Check-out *
                </label>
                <input
                  type="date"
                  value={form.checkOut}
                  onChange={(e) =>
                    setForm({ ...form, checkOut: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                />
              </div>
            </div>

            {nights > 0 && (
              <p className="text-sm text-gray-600">
                <Calendar size={14} className="inline mr-1" />
                {nights} night{nights > 1 ? "s" : ""}
              </p>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                Purpose of Stay *
              </label>
              <textarea
                value={form.purpose}
                onChange={(e) =>
                  setForm({ ...form, purpose: e.target.value })
                }
                rows={2}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Case Reference No. (optional)
              </label>
              <input
                value={form.caseRefNo}
                onChange={(e) =>
                  setForm({ ...form, caseRefNo: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Payment Mode
              </label>
              <select
                value={form.paymentMode}
                onChange={(e) =>
                  setForm({ ...form, paymentMode: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              >
                <option value="PAYROLL_DEDUCTION">Payroll Deduction</option>
                <option value="M_BOB">M-BOB</option>
                <option value="CASH">Cash</option>
              </select>
            </div>
          </div>
        )}

        {/* STEP 4 — Review */}
        {step === 4 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold mb-1">Review &amp; Confirm</h2>
              <p className="text-sm text-gray-500 mb-4">
                Verify details before submitting
              </p>
            </div>

            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <p>
                <b>Room:</b> {room.roomNumber} · {room.roomTypeName}
              </p>
              <p>
                <b>Beds:</b> {selectedBeds.map((b) => b.bedLabel).join(", ")}
              </p>
              <p>
                <b>Occupant:</b>{" "}
                {form.occupantType === "FAMILY"
                  ? `${form.familyMember?.fullName} (${form.familyMember?.relationshipCode})`
                  : form.occupantType === "ACC_STAFF"
                    ? "Self (ACC Staff)"
                    : `${form.fullName} (${form.agencyName})`}
              </p>
              <p>
                <b>Check-in:</b> {form.checkIn}
              </p>
              <p>
                <b>Check-out:</b> {form.checkOut} ({nights} nights)
              </p>
              <p>
                <b>Purpose:</b> {form.purpose}
              </p>
              <p>
                <b>Payment Mode:</b> {form.paymentMode}
              </p>
              <hr className="my-2" />
              <p>
                <b>Rate per bed:</b> Nu. {ratePerBed}/night
              </p>
              <p className="text-lg">
                <b>Total:</b> Nu. {totalAmount}
              </p>
            </div>

            <label className="flex items-start gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={form.declaration}
                onChange={(e) =>
                  setForm({ ...form, declaration: e.target.checked })
                }
                className="mt-0.5"
              />
              <span>
                I confirm the information is true. I take responsibility for
                this booking and any charges. False information will lead to
                disciplinary action.
              </span>
            </label>
          </div>
        )}

        {/* Nav buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t">
          <button
            onClick={() => (step === 1 ? router.back() : setStep(step - 1))}
            className="flex items-center gap-1.5 px-4 py-2 border rounded-md text-sm"
          >
            <ArrowLeft size={14} />
            {step === 1 ? "Cancel" : "Back"}
          </button>

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={
                (step === 1 && !canProceedStep1) ||
                (step === 2 && !canProceedStep2) ||
                (step === 3 && !canProceedStep3)
              }
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              Next <ArrowRight size={14} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={saving || !form.declaration}
              className="flex items-center gap-1.5 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Check size={14} />
              )}
              Confirm Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}