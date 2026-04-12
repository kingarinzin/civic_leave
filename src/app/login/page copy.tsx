"use client";

import Image from "next/image";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const returnTo = searchParams.get("returnTo");
  const expired = searchParams.get("expired");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Login failed");
        return;
      }

      localStorage.setItem("token", data.token);
      localStorage.setItem("isAdmin", data.isAdmin ? "true" : "false");

      if (returnTo) {
        router.push(returnTo);
        return;
      }

      router.push(data.isAdmin ? "/admin/pending-users" : "/dashboard/leave");
    } catch {
      setMessage("Server error");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="bg-white border border-gray-200 rounded-2xl p-8 w-full max-w-md">
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
          <h4 className="text-3xl font-semibold text-black">Anti-Corruption Commission</h4>
          <p className="text-gray-500 mt-1">Sign in to your account</p>
        </div>

        {expired === "true" && (
          <div className="bg-gray-100 border border-gray-300 text-gray-800 px-4 py-3 rounded-md mb-4 text-sm">
            <strong>Session Expired:</strong> Your session has expired. Please
            log in again.
          </div>
        )}

        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            required
            onChange={(e) => setEmail(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            required
            onChange={(e) => setPassword(e.target.value)}
            className="p-3 border border-gray-300 rounded-md focus:outline-none focus:border-black transition"
          />
          <button
            type="submit"
            className="p-3 bg-black text-white rounded-md font-semibold hover:bg-gray-900 transition cursor-pointer"
          >
            Sign In
          </button>
        </form>

        {message && <p className="text-center mt-4 text-red-500">{message}</p>}

        <p className="text-center mt-4 text-sm">
          <a href="/forgot-password" className="text-black hover:underline">
            Forgot Password?
          </a>
        </p>

        <p className="text-center mt-4 text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <a href="/signup" className="text-black hover:underline">
            Sign Up
          </a>
        </p>

        <p className="text-center mt-6 text-xs text-gray-400">
          © {new Date().getFullYear()} Anti-Corruption Commission
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <div className="text-black">Loading...</div>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
