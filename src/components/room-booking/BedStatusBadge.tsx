// src/components/room-booking/BedStatusBadge.tsx
"use client";

export type BedStatus = "AVAILABLE" | "OCCUPIED" | "RESERVED" | "MAINTENANCE";

interface Props {
  status: BedStatus | string;
  size?: "sm" | "md";
}

const STATUS_STYLES: Record<
  string,
  { bg: string; text: string; dot: string; label: string }
> = {
  AVAILABLE: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", label: "Available" },
  OCCUPIED: { bg: "bg-gray-200", text: "text-gray-700", dot: "bg-gray-500", label: "Occupied" },
  RESERVED: { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", label: "Reserved" },
  MAINTENANCE: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", label: "Maintenance" },
};

export default function BedStatusBadge({ status, size = "md" }: Props) {
  const s = STATUS_STYLES[status] || {
    bg: "bg-gray-100",
    text: "text-gray-600",
    dot: "bg-gray-400",
    label: status,
  };

  const padding = size === "sm" ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs";

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${s.bg} ${s.text} ${padding}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  );
}