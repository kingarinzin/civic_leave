"use client";

import { CheckCircle2, XCircle, Clock, ShieldOff } from "lucide-react";
import type { ReactNode } from "react";

export interface FamilyRegistryItem {
  _id: string;
  fullName: string;
  relationshipCode: string;
  cid: string;
  status: "PENDING" | "VERIFIED" | "REJECTED" | "REVOKED";
  rejectedReason?: string;
  revokedReason?: string;
  createdAt: string;
}

const STATUS_STYLE: Record<string, { bg: string; icon: ReactNode }> = {
  PENDING: { bg: "bg-amber-100 text-amber-700", icon: <Clock size={12} /> },
  VERIFIED: { bg: "bg-green-100 text-green-700", icon: <CheckCircle2 size={12} /> },
  REJECTED: { bg: "bg-red-100 text-red-700", icon: <XCircle size={12} /> },
  REVOKED: { bg: "bg-gray-200 text-gray-700", icon: <ShieldOff size={12} /> },
};

interface Props {
  items: FamilyRegistryItem[];
  onDelete?: (id: string) => void;
  showActions?: boolean;
}

export default function FamilyRegistryTable({
  items,
  onDelete,
  showActions = true,
}: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
              Name
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
              Relationship
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
              CID
            </th>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-gray-600">
              Status
            </th>
            {showActions && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase text-gray-600">
                Actions
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.length === 0 ? (
            <tr>
              <td
                colSpan={showActions ? 5 : 4}
                className="text-center py-8 text-gray-500"
              >
                No records
              </td>
            </tr>
          ) : (
            items.map((item) => {
              const s = STATUS_STYLE[item.status];
              return (
                <tr key={item._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {item.fullName}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {item.relationshipCode}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{item.cid}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${s.bg}`}
                    >
                      {s.icon}
                      {item.status}
                    </span>
                    {item.status === "REJECTED" && item.rejectedReason && (
                      <p className="text-xs text-red-600 mt-1">
                        {item.rejectedReason}
                      </p>
                    )}
                  </td>
                  {showActions && (
                    <td className="px-4 py-3 text-right">
                      {onDelete && item.status !== "VERIFIED" && (
                        <button
                          onClick={() => onDelete(item._id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Delete
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}