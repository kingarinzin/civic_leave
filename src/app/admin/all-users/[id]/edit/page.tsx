"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Save, ArrowLeft } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Department {
  _id: string;
  name: string;
}

interface Division {
  _id: string;
  name: string;
}

// Helper: get initials from full name (same as on AllUsersPage)
function getInitials(name: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Helper: generate consistent pastel color based on name
function getAvatarColor(name: string): string {
  const colors = [
    "bg-red-100 text-red-700",
    "bg-blue-100 text-blue-700",
    "bg-green-100 text-green-700",
    "bg-yellow-100 text-yellow-700",
    "bg-purple-100 text-purple-700",
    "bg-pink-100 text-pink-700",
    "bg-indigo-100 text-indigo-700",
    "bg-orange-100 text-orange-700",
    "bg-teal-100 text-teal-700",
    "bg-cyan-100 text-cyan-700",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return colors[Math.abs(hash) % colors.length];
}

export default function EditUserPage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [form, setForm] = useState({
    name: "",
    cid: "",
    designation: "",
    phone: "",
    email: "",
    departmentName: "",
    divisionName: "",
    role: "Officer",
    isActive: true,
  });
  const [notification, setNotification] = useState<{ message: string; type: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    const fetchData = async () => {
      try {
        // Fetch user, departments, divisions in parallel
        const [userRes, deptRes, divRes] = await Promise.all([
          fetch(`/api/admin/all-users/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/departments", {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch("/api/divisions", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        // Handle authentication error
        if (userRes.status === 401) {
          localStorage.clear();
          router.push("/login");
          return;
        }

        // Parse JSON responses
        const userData = await userRes.json();
        let deptData = await deptRes.json();
        let divData = await divRes.json();

        // Extract arrays from potential wrapper objects
        const extractArray = (data: any, fallback: any[] = []): any[] => {
          if (Array.isArray(data)) return data;
          if (data && Array.isArray(data.departments)) return data.departments;
          if (data && Array.isArray(data.divisions)) return data.divisions;
          if (data && Array.isArray(data.data)) return data.data;
          console.warn("Unexpected API response format:", data);
          return fallback;
        };

        const departmentsList = extractArray(deptData);
        const divisionsList = extractArray(divData);

        setDepartments(departmentsList);
        setDivisions(divisionsList);

        // Populate form if user exists
        if (!userData.user) {
          throw new Error("User data not found in response");
        }

        const user = userData.user;
        setForm({
          name: user.name || "",
          cid: user.cid || "",
          designation: user.designation || "",
          phone: user.phone || "",
          email: user.email || "",
          departmentName: user.departmentName || "",
          divisionName: user.divisionName || "",
          role: user.role || "Officer",
          isActive: user.isActive !== undefined ? user.isActive : true,
        });
      } catch (err: any) {
        console.error("Fetch error:", err);
        setNotification({ message: err.message || "Failed to load data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      const target = e.target as HTMLInputElement;
      setForm({ ...form, [name]: target.checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/admin/all-users/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setNotification({ message: "User updated successfully", type: "success" });
        setTimeout(() => router.push("/admin/all-users"), 1500);
      } else {
        setNotification({ message: data.error || "Update failed", type: "error" });
      }
    } catch (err) {
      console.error(err);
      setNotification({ message: "Something went wrong", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar />
      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 w-full">
        {/* Header with back button and avatar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-100 transition"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
            {form.name && (
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold ${getAvatarColor(
                  form.name
                )}`}
              >
                {getInitials(form.name)}
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Edit User</h1>
              <p className="text-sm text-gray-500">
                Update user details, role, and account status.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-sm bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <span className="font-medium">User ID:</span>
            <span className="text-gray-500">{id}</span>
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              notification.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {notification.message}
          </div>
        )}

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <form onSubmit={handleSubmit}>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Full Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                {/* CID */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CID Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="cid"
                    value={form.cid}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                {/* Designation */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Designation
                  </label>
                  <input
                    name="designation"
                    value={form.designation}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address
                  </label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent transition"
                  />
                </div>

                {/* Department */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department
                  </label>
                  <select
                    name="departmentName"
                    value={form.departmentName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept._id} value={dept.name}>
                        {dept.name}
                      </option>
                    ))}
                  </select>
                  {departments.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No departments found. Please add departments first.</p>
                  )}
                </div>

                {/* Division */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Division
                  </label>
                  <select
                    name="divisionName"
                    value={form.divisionName}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="">-- Select Division --</option>
                    {divisions.map((div) => (
                      <option key={div._id} value={div.name}>
                        {div.name}
                      </option>
                    ))}
                  </select>
                  {divisions.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">No divisions found. Please add divisions first.</p>
                  )}
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Role
                  </label>
                  <select
                    name="role"
                    value={form.role}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent bg-white"
                  >
                    <option value="Officer">Officer</option>
                    <option value="DivisionHead">Division Head</option>
                    <option value="DepartmentHead">Department Head</option>
                    <option value="Commissioner">Commissioner</option>
                    <option value="Chairperson">Chairperson</option>
                    <option value="SecretaryService">Secretary Service</option>
                  </select>
                </div>

                {/* Active Checkbox */}
                <div className="flex items-center gap-2 mt-2">
                  <input
                    type="checkbox"
                    name="isActive"
                    checked={form.isActive}
                    onChange={handleChange}
                    className="h-4 w-4 rounded border-gray-300 focus:ring-black"
                  />
                  <label className="text-sm font-medium text-gray-700">
                    Account Active (user can log in)
                  </label>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 bg-black text-white rounded-lg flex items-center gap-2 hover:bg-gray-800 transition disabled:opacity-50"
              >
                {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}