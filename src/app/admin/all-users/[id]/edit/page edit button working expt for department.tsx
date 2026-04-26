"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Department {
  _id: string;
  name: string;
}

interface Division {
  _id: string;
  name: string;
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

        if (userRes.status === 401) {
          localStorage.clear();
          router.push("/login");
          return;
        }

        // Parse responses
        const userData = await userRes.json();
        const deptData = await deptRes.json();
        const divData = await divRes.json();

        // Validate user data exists
        if (!userData.user) {
          throw new Error("User data not found in response");
        }

        // Safely set form with fallbacks
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

        // Set departments and divisions (handle both array and object responses)
        setDepartments(Array.isArray(deptData) ? deptData : deptData.departments || []);
        setDivisions(Array.isArray(divData) ? divData : divData.divisions || []);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setNotification({ message: err.message || "Failed to load data", type: "error" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, router]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
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
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar />
      <main className="flex-1 ml-0 md:ml-64 p-6">
        <h1 className="text-2xl font-bold mb-6">Edit User</h1>

        {notification && (
          <div
            className={`mb-4 p-3 rounded ${
              notification.type === "success"
                ? "bg-green-100 text-green-800 border border-green-200"
                : "bg-red-100 text-red-800 border border-red-200"
            }`}
          >
            {notification.message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="max-w-3xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:border-black"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CID
              </label>
              <input
                name="cid"
                value={form.cid}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Designation
              </label>
              <input
                name="designation"
                value={form.designation}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                required
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Department
              </label>
              <select
                name="departmentName"
                value={form.departmentName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Division
              </label>
              <select
                name="divisionName"
                value={form.divisionName}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="">Select Division</option>
                {divisions.map((div) => (
                  <option key={div._id} value={div.name}>
                    {div.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="Officer">Officer</option>
                <option value="DivisionHead">Division Head</option>
                <option value="DepartmentHead">Department Head</option>
                <option value="Commissioner">Commissioner</option>
                <option value="Chairperson">Chairperson</option>
                <option value="SecretaryService">Secretary Service</option>
              </select>
            </div>
            <div className="flex items-center gap-2 mt-6">
              <input
                type="checkbox"
                name="isActive"
                checked={form.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <label className="text-sm font-medium text-gray-700">Active</label>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-black text-white rounded-md flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}