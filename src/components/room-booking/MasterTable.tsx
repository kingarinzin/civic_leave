"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Save, X, Loader2, Search } from "lucide-react";

export interface MasterItem {
  _id: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  category?: string;
  sortOrder?: number;
  isActive?: boolean;
  requiresProof?: boolean;
}

interface MasterTableProps {
  type: string;
  title: string;
  columns: { key: keyof MasterItem; label: string }[];
}

export default function MasterTable({ type, title, columns }: MasterTableProps) {
  const [items, setItems] = useState<MasterItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editData, setEditData] = useState<MasterItem | null>(null);
  const [search, setSearch] = useState("");
  const [notification, setNotification] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState<Partial<MasterItem>>({
    code: "",
    name: "",
    description: "",
    sortOrder: 999,
    isActive: true,
  });

  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/room-booking/master/${type}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setItems(data.items || []);
    } catch {
      showNotification("Failed to load items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const showNotification = (message: string, kind: "success" | "error") => {
    setNotification({ message, type: kind });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type: inputType } = e.target as HTMLInputElement;
    setForm((prev) => ({
      ...prev,
      [name]:
        inputType === "checkbox"
          ? (e.target as HTMLInputElement).checked
          : name === "sortOrder"
            ? Number(value)
            : value,
    }));
  };

  const handleSave = async () => {
    if (!form.code || !form.name) {
      showNotification("Code and Name are required", "error");
      return;
    }
    setSaving(true);
    try {
      const url = editData
        ? `/api/room-booking/master/${type}/${editData._id}`
        : `/api/room-booking/master/${type}`;
      const method = editData ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Save failed");
      }

      showNotification(
        editData ? "Updated successfully" : "Added successfully",
        "success",
      );
      await fetchItems();
      setForm({
        code: "",
        name: "",
        description: "",
        sortOrder: 999,
        isActive: true,
      });
      setEditData(null);
      setShowForm(false);
    } catch (err: any) {
      showNotification(err.message, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: MasterItem) => {
    setEditData(item);
    setForm({
      code: item.code,
      name: item.name,
      description: item.description || "",
      sortOrder: item.sortOrder ?? 999,
      isActive: item.isActive !== false,
    });
    setShowForm(true);
  };

  const handleDelete = async (item: MasterItem) => {
    if (!confirm(`Deactivate "${item.name}"?`)) return;
    try {
      const res = await fetch(`/api/room-booking/master/${type}/${item._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Delete failed");
      showNotification("Deactivated", "success");
      await fetchItems();
    } catch {
      showNotification("Delete failed", "error");
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white ${
            notification.type === "success" ? "bg-green-600" : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true);
              setEditData(null);
              setForm({
                code: "",
                name: "",
                description: "",
                sortOrder: 999,
                isActive: true,
              });
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-black text-white rounded-md text-xs font-medium hover:bg-gray-800"
          >
            <Plus size={14} /> Add
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-700">Code *</label>
              <input
                name="code"
                value={form.code || ""}
                onChange={handleFormChange}
                placeholder="UPPERCASE_CODE"
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">Name *</label>
              <input
                name="name"
                value={form.name || ""}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-700">
                Sort Order
              </label>
              <input
                name="sortOrder"
                type="number"
                value={form.sortOrder ?? 999}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs font-medium text-gray-700">
                Description
              </label>
              <input
                name="description"
                value={form.description || ""}
                onChange={handleFormChange}
                className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowForm(false);
                setEditData(null);
              }}
              className="flex items-center gap-1 px-3 py-1.5 border rounded-md text-xs"
            >
              <X size={14} /> Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-3 py-1.5 bg-black text-white rounded-md text-xs disabled:opacity-50"
            >
              {saving ? (
                <Loader2 className="animate-spin" size={14} />
              ) : (
                <Save size={14} />
              )}
              {editData ? "Update" : "Save"}
            </button>
          </div>
        </div>
      )}

      <div className="relative mb-3">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          size={16}
        />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search..."
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm"
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="animate-spin text-gray-400" size={24} />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((c) => (
                  <th
                    key={String(c.key)}
                    className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-gray-600">
                  Status
                </th>
                <th className="px-3 py-2 text-right text-xs font-semibold uppercase text-gray-600">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={columns.length + 2}
                    className="text-center py-6 text-gray-500"
                  >
                    No items found
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50">
                    {columns.map((c) => (
                      <td key={String(c.key)} className="px-3 py-2 text-gray-700">
                        {String(item[c.key] ?? "-")}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      {item.isActive !== false ? (
                        <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-gray-200 text-gray-600 text-xs">
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(item)}
                          className="p-1.5 hover:bg-gray-200 rounded"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-1.5 hover:bg-red-50 text-red-600 rounded"
                          title="Deactivate"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}