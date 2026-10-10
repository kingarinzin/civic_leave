"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface FamilyItem {
  _id: string;
  fullName: string;
  relationshipCode: string;
  cid: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  rejectedReason?: string;
  revokedReason?: string;
  createdAt: string;
}

const STATUS_ICON = {
  PENDING: <Clock size={14} className="text-amber-600" />,
  VERIFIED: <CheckCircle2 size={14} className="text-green-600" />,
  REJECTED: <XCircle size={14} className="text-red-600" />,
  REVOKED: <XCircle size={14} className="text-gray-600" />,
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  VERIFIED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  REVOKED: "bg-gray-200 text-gray-700",
};

export default function MyFamilyPage() {
  const router = useRouter();
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<FamilyItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/room-booking/family/my", {
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
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this record?")) return;
    try {
      const res = await fetch(`/api/room-booking/family/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Delete failed");
        return;
      }
      fetchItems();
    } catch {
      alert("Delete failed");
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
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Family</h1>
            <p className="text-sm text-gray-500 mt-1">
              Register family members to book accommodation at the family rate.
            </p>
          </div>
          <button
            onClick={() => router.push("/room-booking/family/register")}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm"
          >
            <Plus size={16} /> Register New
          </button>
        </div>

        {items.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <p className="text-gray-500 mb-4">No family members registered yet.</p>
            <button
              onClick={() => router.push("/room-booking/family/register")}
              className="px-4 py-2 bg-black text-white rounded-md text-sm"
            >
              Register First Family Member
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Relationship</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">CID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{item.fullName}</td>
                    <td className="px-4 py-3 text-gray-700">{item.relationshipCode}</td>
                    <td className="px-4 py-3 text-gray-700">{item.cid}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[item.status]}`}>
                        {STATUS_ICON[item.status]}
                        {item.status}
                      </span>
                      {item.status === "REJECTED" && item.rejectedReason && (
                        <p className="text-xs text-red-600 mt-1">{item.rejectedReason}</p>
                      )}
                      {item.status === "REVOKED" && item.revokedReason && (
                        <p className="text-xs text-gray-600 mt-1">{item.revokedReason}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status !== "VERIFIED" && (
                        <button
                          onClick={() => handleDelete(item._id)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}