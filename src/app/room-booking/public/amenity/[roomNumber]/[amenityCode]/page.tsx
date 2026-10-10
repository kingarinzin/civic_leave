"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

export default function PublicAmenityIssuePage() {
  const params = useParams();
  const roomNumber = params?.roomNumber as string;
  const amenityCode = params?.amenityCode as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    description: "",
    reportedBy: "",
  });

  useEffect(() => {
    if (!roomNumber) return;
    // Just verify the room exists
    async function verify() {
      try {
        const res = await fetch(`/api/room-booking/public/room/${roomNumber}`);
        if (!res.ok) throw new Error("Room not found");
        setLoading(false);
      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    }
    verify();
  }, [roomNumber]);

  const handleSubmit = async () => {
    if (!form.description.trim()) {
      setError("Please describe the issue");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/room-booking/public/amenity-issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomNumber,
          amenityCode,
          description: form.description,
          reportedBy: form.reportedBy || "Anonymous",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="animate-spin" size={32} />
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border p-8 text-center">
        <CheckCircle2 className="mx-auto text-green-500 mb-3" size={48} />
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Issue Reported
        </h1>
        <p className="text-sm text-gray-600 mb-6">
          Thank you. Our team has been notified and will address this shortly.
        </p>
        <a
          href={`/room-booking/public/room/${roomNumber}`}
          className="inline-flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm"
        >
          <ArrowLeft size={14} /> Back to Room
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <a
        href={`/room-booking/public/room/${roomNumber}`}
        className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-black"
      >
        <ArrowLeft size={14} /> Back to Room
      </a>

      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 text-red-700 rounded-lg">
            <AlertCircle size={20} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              Report an Issue
            </h1>
            <p className="text-sm text-gray-500">
              Room {roomNumber} · {amenityCode}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">
              Describe the issue *
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={4}
              placeholder="e.g. WiFi not connecting, Hot water not working..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">
              Your Name (optional)
            </label>
            <input
              value={form.reportedBy}
              onChange={(e) =>
                setForm({ ...form, reportedBy: e.target.value })
              }
              placeholder="Leave blank to report anonymously"
              className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1 text-sm"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || !form.description.trim()}
          className="w-full mt-6 flex items-center justify-center gap-2 px-4 py-3 bg-black text-white rounded-md text-sm disabled:opacity-50"
        >
          {submitting ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          Submit Report
        </button>
      </div>
    </div>
  );
}