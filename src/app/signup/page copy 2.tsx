"use client";

import Image from "next/image";
import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SuccessModal from "@/components/SuccessModal";

type Department = {
  _id: string;
  name: string;
};

type Division = {
  _id: string;
  name: string;
  departmentId: string | { _id?: string };
};

const fallbackDepartments: Department[] = [{ _id: "dept1", name: "dept1" }];
const fallbackDivisions: Division[] = [
  { _id: "div1", name: "div1", departmentId: "dept1" },
];

function getEntityId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null && "_id" in value) {
    const maybeId = (value as { _id?: unknown })._id;
    return maybeId ? String(maybeId) : "";
  }
  return String(value);
}

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get("returnTo");

  const [name, setName] = useState("");
  const [cid, setCid] = useState("");
  const [designation, setDesignation] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [departments, setDepartments] = useState<Department[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);

  const [message, setMessage] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await fetch("/api/departments");
        const data: unknown = await res.json();

        if (!res.ok || !Array.isArray(data) || data.length === 0) {
          setDepartments(fallbackDepartments);
          setDepartmentId((current) => current || fallbackDepartments[0]._id);
          return;
        }

        setDepartments(data as Department[]);
      } catch {
        setDepartments(fallbackDepartments);
        setDepartmentId((current) => current || fallbackDepartments[0]._id);
      }
    };

    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchDivisions = async () => {
      if (!departmentId) {
        setDivisions([]);
        setDivisionId("");
        return;
      }

      try {
        const res = await fetch("/api/divisions");
        const data: unknown = await res.json();

        if (!res.ok || !Array.isArray(data)) {
          const availableDivisions =
            departmentId === fallbackDepartments[0]._id
              ? fallbackDivisions
              : [];
          setDivisions(availableDivisions);
          setDivisionId(availableDivisions[0]?._id || "");
          return;
        }

        const filtered = (data as Division[]).filter((div) => {
          const divisionDepartmentId = getEntityId(div.departmentId);
          return divisionDepartmentId === departmentId;
        });

        if (
          filtered.length === 0 &&
          departmentId === fallbackDepartments[0]._id
        ) {
          setDivisions(fallbackDivisions);
          setDivisionId(fallbackDivisions[0]._id);
          return;
        }

        setDivisions(filtered);
        setDivisionId(filtered[0]?._id || "");
      } catch {
        const availableDivisions =
          departmentId === fallbackDepartments[0]._id ? fallbackDivisions : [];
        setDivisions(availableDivisions);
        setDivisionId(availableDivisions[0]?._id || "");
      }
    };

    fetchDivisions();
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage("Passwords do not match");
      return;
    }

    if (
      !name ||
      !cid ||
      !designation ||
      !phone ||
      !email ||
      !departmentId ||
      !divisionId
    ) {
      setMessage("All fields are required");
      return;
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          cid,
          designation,
          phone,
          email,
          departmentId,
          divisionId,
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Signup failed");
        return;
      }

      setShowSuccessModal(true);
    } catch {
      setMessage("Server error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4 py-6">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md overflow-y-auto max-h-[95vh]">
        <div className="flex justify-center items-center mb-6">
          <Image
            src="/civicleave-logo.svg"
            alt="CivicLeave"
            width={220}
            height={64}
            className="h-16 w-auto"
            priority
          />
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-semibold text-black">Create Account</h1>
          <p className="text-gray-500 mt-1">Sign up to get started</p>
        </div>

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-1">
            Personal Information
          </h2>

          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <input
            type="text"
            placeholder="CID Number"
            value={cid}
            onChange={(e) => setCid(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <input
            type="text"
            placeholder="Designation"
            value={designation}
            onChange={(e) => setDesignation(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <input
            type="tel"
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
            Organization Details
          </h2>

          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition bg-white"
          >
            <option value="">
              {departments.length
                ? "Select Department"
                : "No departments available"}
            </option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={divisionId}
            onChange={(e) => setDivisionId(e.target.value)}
            disabled={!departmentId || !divisions.length}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition bg-white disabled:bg-gray-100 disabled:text-gray-500"
          >
            <option value="">
              {!departmentId
                ? "Select Department First"
                : divisions.length
                  ? "Select Division"
                  : "No divisions found for selected department"}
            </option>
            {divisions.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>

          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2">
            Account Security
          </h2>

          <input
            type="password"
            name="newPassword"
            autoComplete="new-password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <input
            type="password"
            name="confirmNewPassword"
            autoComplete="new-password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />

          <button
            type="submit"
            className="p-3 bg-black text-white rounded-md font-semibold hover:bg-gray-900 transition"
          >
            Sign Up
          </button>
        </form>

        {message && <p className="text-center mt-4 text-red-500">{message}</p>}

        <p className="text-center mt-6 text-sm text-gray-500">
          Already have an account?{" "}
          <a
            href={
              returnTo
                ? `/login?returnTo=${encodeURIComponent(returnTo)}`
                : "/login"
            }
            className="text-black hover:underline"
          >
            Login
          </a>
        </p>

        <p className="text-center mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} Anti-Corruption Commission
        </p>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="Registration Submitted!"
        message="Your account has been sent for approval. You will receive an email notification once approved."
        onClose={() => {
          setShowSuccessModal(false);
          const loginPath = returnTo
            ? `/login?returnTo=${encodeURIComponent(returnTo)}`
            : "/login";
          router.push(loginPath);
        }}
        buttonText="Go to Login"
      />
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-black">Loading...</div>
        </div>
      }
    >
      <SignupForm />
    </Suspense>
  );
}
