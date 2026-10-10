"use client";

import { useEffect, useState } from "react";

export interface VerifiedFamily {
  _id: string;
  fullName: string;
  relationshipCode: string;
  cid: string;
}

interface Props {
  value: string; // selected familyRegistryId
  onChange: (item: VerifiedFamily | null) => void;
}

export default function VerifiedFamilySelector({ value, onChange }: Props) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const [items, setItems] = useState<VerifiedFamily[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/room-booking/family/my", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setItems(
          (data.items || []).filter((i: any) => i.status === "VERIFIED"),
        );
      } finally {
        setLoading(false);
      }
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">
        Select Verified Family Member *
      </label>
      <select
        value={value}
        onChange={(e) => {
          const id = e.target.value;
          const found = items.find((i) => i._id === id) || null;
          onChange(found);
        }}
        disabled={loading}
        className="w-full border border-gray-300 rounded-md px-3 py-2 mt-1"
      >
        <option value="">-- Select --</option>
        {items.map((i) => (
          <option key={i._id} value={i._id}>
            {i.fullName} ({i.relationshipCode}) — {i.cid}
          </option>
        ))}
      </select>
      {items.length === 0 && !loading && (
        <p className="text-xs text-amber-600 mt-1">
          No verified family members. Register one first.
        </p>
      )}
    </div>
  );
}