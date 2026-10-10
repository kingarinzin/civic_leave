"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Save, Upload } from "lucide-react";

interface MasterItem {
  _id: string;
  code: string;
  name: string;
}

export default function RegisterFamilyPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [relationships, setRelationships] = useState<MasterItem[]>([]);
  const [proofTypes, setProofTypes] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState({
    fullName: "",
    relationshipCode: "",
    relationshipOther: "",
    cid: "",
    dateOfBirth: "",
    contactNo: "",
    proofDocumentTypeCode: "",
    proofDocumentUrl: "",
    remarks: "",
  });

  useEffect(() => {
    async function loadMasters() {
      try {
        const [relRes, proofRes] = await Promise.all([
          fetch("/api/room-booking/master/relationships", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/room-booking/master/proof-types", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const relData = await relRes.json();
        const proofData = await proofRes.json();
        setRelationships(relData.items || []);
        setProofTypes(proofData.items || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadMasters();
  }, [token]);

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleSubmit = async () => {
    if (!form.fullName || !form.relationshipCode || !form.cid) {
      notify("Full Name, Relationship and CID are required", "error");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/room-booking/family", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Submission failed");
      }

      notify("Submitted for verification", "success");
      setTimeout(() => router.push("/room-booking/family/my-family"), 1200);
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={32} />
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

      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-black mb-4"
        >
          <ArrowLeft size={16} /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h1 className="text-xl font-bold text-gray-900 mb-1">
            Register Family Member
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Submit details for admin verification. Once verified, you can book
            accommodation at the family rate.
          </p>

          <div className="space-y-4">
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
                placeholder="e.g. Kinley Wangmo"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Relationship *
              </label>
              <select
                value={form.relationshipCode}
                onChange={(e) =>
                  setForm({ ...form, relationshipCode: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              >
                <option value="">-- Select relationship --</option>
                {relationships.map((r) => (
                  <option key={r._id} value={r.code}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>

            {form.relationshipCode === "OTHER" && (
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Specify Relationship
                </label>
                <input
                  value={form.relationshipOther}
                  onChange={(e) =>
                    setForm({ ...form, relationshipOther: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-gray-700">
                CID Number *
              </label>
              <input
                value={form.cid}
                onChange={(e) => setForm({ ...form, cid: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                placeholder="e.g. 11002003456"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={(e) =>
                    setForm({ ...form, dateOfBirth: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Contact Number
                </label>
                <input
                  value={form.contactNo}
                  onChange={(e) =>
                    setForm({ ...form, contactNo: e.target.value })
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Proof Type
              </label>
              <select
                value={form.proofDocumentTypeCode}
                onChange={(e) =>
                  setForm({ ...form, proofDocumentTypeCode: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
              >
                <option value="">-- Select proof --</option>
                {proofTypes.map((p) => (
                  <option key={p._id} value={p.code}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Proof Document URL
              </label>
              <input
                value={form.proofDocumentUrl}
                onChange={(e) =>
                  setForm({ ...form, proofDocumentUrl: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                placeholder="https://... or /uploads/..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Upload proof via document module and paste URL here.
              </p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Remarks
              </label>
              <textarea
                value={form.remarks}
                onChange={(e) =>
                  setForm({ ...form, remarks: e.target.value })
                }
                className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border rounded-md text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              Submit for Verification
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}