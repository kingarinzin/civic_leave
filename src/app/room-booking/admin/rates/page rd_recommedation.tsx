"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, DollarSign } from "lucide-react";

interface RateRow {
  _id: string;
  roomId: string;
  roomNumber: string;
  bedLabel: string;
  bedTypeCode: string;
  roomTypeCode: string | null;
  rates: {
    tier1: number;
    tier2: number;
    tier3: number;
    tier4: number;
    tier5: number;
  };
}

const TIERS = [
  { key: "tier1", label: "T1 · Resident" },
  { key: "tier2", label: "T2 · ACC Staff" },
  { key: "tier3", label: "T3 · Family" },
  { key: "tier4", label: "T4 · Co-Agency" },
  { key: "tier5", label: "T5 · Stakeholder" },
] as const;

export default function AdminRatesPage() {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [rows, setRows] = useState<RateRow[]>([]);
  const [original, setOriginal] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const notify = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/rates", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setRows(data.rates || []);
        setOriginal(JSON.parse(JSON.stringify(data.rates || [])));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRate = (bedId: string, tier: string, value: number) => {
    setRows((rs) =>
      rs.map((r) =>
        r._id === bedId
          ? { ...r, rates: { ...r.rates, [tier]: value } }
          : r,
      ),
    );
  };

  const hasChanges = JSON.stringify(rows) !== JSON.stringify(original);

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = rows
        .filter((r, i) => JSON.stringify(r.rates) !== JSON.stringify(original[i].rates))
        .map((r) => ({ bedId: r._id, rates: r.rates }));

      if (updates.length === 0) {
        notify("No changes to save", "error");
        return;
      }

      const res = await fetch("/api/room-booking/rates", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ updates }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }
      const data = await res.json();
      notify(`Updated ${data.updated} beds`, "success");
      setOriginal(JSON.parse(JSON.stringify(rows)));
    } catch (err: any) {
      notify(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" size={28} />
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

      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign size={22} /> Room Rates
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Edit per-bed rates for all 5 tiers. Changes are saved in bulk.
            </p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-md text-sm disabled:opacity-50"
          >
            {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
            Save Changes
          </button>
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Room</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Bed</th>
                  <th className="px-4 py-3 text-left text-xs uppercase text-gray-600">Type</th>
                  {TIERS.map((t) => (
                    <th key={t.key} className="px-3 py-3 text-left text-xs uppercase text-gray-600">
                      {t.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((r) => (
                  <tr key={r._id} className="hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{r.roomNumber}</td>
                    <td className="px-4 py-2">{r.bedLabel}</td>
                    <td className="px-4 py-2 text-xs text-gray-600">{r.bedTypeCode}</td>
                    {TIERS.map((t) => (
                      <td key={t.key} className="px-2 py-2">
                        <input
                          type="number"
                          value={r.rates[t.key as keyof typeof r.rates]}
                          onChange={(e) =>
                            updateRate(r._id, t.key, Number(e.target.value))
                          }
                          className="w-20 border border-gray-200 rounded px-2 py-1 text-sm"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {hasChanges && (
          <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded mt-4">
            ⚠️ You have unsaved changes. Click <b>Save Changes</b> to apply.
          </p>
        )}
      </div>
    </div>
  );
}