"use client";

import { useEffect, useState } from "react";
import { Loader2, Check, X, ShieldOff } from "lucide-react";

interface FamilyItem {
  _id: string;
  fullName: string;
  relationshipCode: string;
  cid: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  staffSnapshot: { name?: string; email?: string };
  proofDocumentUrl?: string;
  createdAt: string;
}

export default function FamilyVerificationsPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<FamilyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"PENDING" | "VERIFIED" | "REJECTED" | "REVOKED" | "ALL">("PENDING");
  const [processing, setProcessing] = useState<string | null>(null);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const url = filter === "ALL"
        ? "/api/room-booking/family"
        : `/api/room-booking/family?status=${filter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setItems(data.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleAction = async (id: string, action: "VERIFY" | "REJECT" | "REVOKE") => {
    let remarks = "";
    if (action === "REJECT") {
      remarks = prompt("Reason for rejection?") || "";
      if (!remarks) return;
    }
    if (action === "REVOKE") {
      remarks = prompt("Reason for revoking?") || "";
      if (!remarks) return;
    }

    setProcessing(id);
    try {
      const res = await fetch(`/api/room-booking/family/${id}/verify`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, remarks }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Action failed");
        return;
      }
      fetchItems();
    } catch {
      alert("Action failed");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          Family Verifications
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          Review family member submissions from officers.
        </p>

        <div className="flex gap-2 mb-4">
          {(["PENDING", "VERIFIED", "REJECTED", "REVOKED", "ALL"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium ${
                filter === f ? "bg-black text-white" : "bg-white border text-gray-700"
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin" size={28} />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-xl border p-12 text-center text-gray-500">
            No items in this category.
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <div key={item._id} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900">{item.fullName}</h3>
                      <span className="text-xs px-2 py-0.5 bg-gray-100 rounded">
                        {item.relationshipCode}
                      </span>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                          item.status === "VERIFIED" ? "bg-green-100 text-green-700" :
                          item.status === "REJECTED" ? "bg-red-100 text-red-700" :
                          "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><b>Officer:</b> {item.staffSnapshot?.name} ({item.staffSnapshot?.email})</p>
                      <p><b>CID:</b> {item.cid}</p>
                      {item.proofDocumentUrl && (
                        <p>
                          <b>Proof:</b>{" "}
                          <a href={item.proofDocumentUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">
                            View Document
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {item.status === "PENDING" && (
                      <>
                        <button
                          onClick={() => handleAction(item._id, "VERIFY")}
                          disabled={processing === item._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-md text-xs"
                        >
                          <Check size={14} /> Verify
                        </button>
                        <button
                          onClick={() => handleAction(item._id, "REJECT")}
                          disabled={processing === item._id}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs"
                        >
                          <X size={14} /> Reject
                        </button>
                      </>
                    )}
                    {item.status === "VERIFIED" && (
                      <button
                        onClick={() => handleAction(item._id, "REVOKE")}
                        disabled={processing === item._id}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-md text-xs"
                      >
                        <ShieldOff size={14} /> Revoke
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}