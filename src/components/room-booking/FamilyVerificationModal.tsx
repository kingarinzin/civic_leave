"use client";

import { useState } from "react";
import { X, Check, AlertCircle } from "lucide-react";

interface Props {
  mode: "VERIFY" | "REJECT" | "REVOKE";
  familyName: string;
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}

export default function FamilyVerificationModal({
  mode,
  familyName,
  onClose,
  onConfirm,
}: Props) {
  const [remarks, setRemarks] = useState("");
  const isActionRequired = mode === "REJECT" || mode === "REVOKE";

  const handleConfirm = () => {
    if (isActionRequired && !remarks.trim()) {
      alert("Remarks are required");
      return;
    }
    onConfirm(remarks);
  };

  const title =
    mode === "VERIFY"
      ? "Verify Family Member"
      : mode === "REJECT"
        ? "Reject Family Member"
        : "Revoke Family Member";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          <p className="text-sm text-gray-700 mb-4">
            {mode === "VERIFY" && (
              <>
                You are about to verify <b>{familyName}</b>. Once verified, the
                record will be <b>locked</b>.
              </>
            )}
            {mode === "REJECT" && (
              <>
                Reject <b>{familyName}</b>? Officer will be notified.
              </>
            )}
            {mode === "REVOKE" && (
              <>
                Revoke verification for <b>{familyName}</b>? Officer will lose
                the family rate for this person.
              </>
            )}
          </p>

          <label className="text-sm font-medium text-gray-700">
            Remarks {isActionRequired && "*"}
          </label>
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
            placeholder={isActionRequired ? "Required" : "Optional"}
          />

          {isActionRequired && (
            <div className="flex items-center gap-1.5 text-xs text-amber-700 mt-2">
              <AlertCircle size={12} /> Remarks will be shown to the officer.
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-5 py-3 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-md text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-md text-sm text-white ${
              mode === "VERIFY"
                ? "bg-green-600"
                : mode === "REJECT"
                  ? "bg-red-600"
                  : "bg-gray-700"
            }`}
          >
            <Check size={14} />
            {mode === "VERIFY" ? "Verify" : mode === "REJECT" ? "Reject" : "Revoke"}
          </button>
        </div>
      </div>
    </div>
  );
}