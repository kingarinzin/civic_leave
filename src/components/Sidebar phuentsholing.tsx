"use client";

import Image from "next/image";
import { useRouter, usePathname } from "next/navigation";
import { Layers, Calendar, Clock, Briefcase } from "lucide-react";
import {
  Shield,
  Settings,
  Users,
  LogOut,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState } from "react";

function normalizeRole(rawRole?: string): string {
  const normalized = (rawRole || "Officer")
    .toLowerCase()
    .replace(/[\s_-]/g, "");

  const roleMap: Record<string, string> = {
    officer: "Officer",
    divisionhead: "DivisionHead",
    departmenthead: "DepartmentHead",
    commissioner: "Commissioner",
    chairperson: "Chairperson",
    secretaryservice: "SecretaryService",
    admin: "Admin",
  };

  return roleMap[normalized] || "Officer";
}

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userRole, setUserRole] = useState("Officer");
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [openSection, setOpenSection] = useState<"master" | "leave" | "hrs" | null>(
    null,
  );

  const getEmailFromToken = (token: string): string => {
    try {
      const [, payload] = token.split(".");
      if (!payload) return "";
      const decoded = JSON.parse(atob(payload));
      return typeof decoded?.email === "string" ? decoded.email : "";
    } catch {
      return "";
    }
  };

  useEffect(() => {
    async function loadProfile() {
      const token = localStorage.getItem("token");
      if (!token) return;

      const tokenEmail = getEmailFromToken(token);
      if (tokenEmail) {
        setUserEmail(tokenEmail);
      }

      const storedIsAdmin = localStorage.getItem("isAdmin") === "true";
      setIsAdminUser(storedIsAdmin);

      try {
        const res = await fetch("/api/user/profile", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) return;

        const data = await res.json();
        if (!data || typeof data !== "object") return;

        const profile = data as {
          name?: string;
          email?: string;
          role?: string;
        };

        const resolvedName = (profile.name || "").trim();
        setUserName(resolvedName);
        setUserEmail(profile.email || tokenEmail || "");
        setUserRole(normalizeRole(profile.role));
      } catch (err) {
        console.error("Profile load error:", err);
      }
    }

    loadProfile();
  }, [pathname]);

  const isAdmin =
    isAdminUser || userRole === "Admin" || pathname.startsWith("/admin/");

  const hrsAllowedEmails = [
    "yangzom@acc.org.bt",
    "skhando@acc.org.bt",
    "bdorj@acc.org.bt",
    "tshewangrinzin@acc.org.bt",
    "chekiw@acc.org.bt",
    "gyeltshencipo@acc.org.bt"
  ];
  const showHRS = isAdmin || hrsAllowedEmails.includes(userEmail);

  const isMasterActive =
    pathname === "/admin/department" || pathname === "/division";
  const isLeaveActive =
    pathname.startsWith("/dashboard/leave") ||
    pathname === "/admin/leave-type" ||
    pathname === "/admin/leave-balances" ||
    pathname === "/admin/commissioner-assignments" ||
    pathname === "/admin/individual-leave-balance" ||
    pathname === "/admin/my-leave";

  const isHRSActive =
    pathname.startsWith("/admin/hr/training-type") ||
    pathname.startsWith("/admin/hr/program-title") ||
    pathname.startsWith("/admin/hr/training-log") ||       // <-- added
    pathname.startsWith("/admin/hr/institution") ||
    pathname.startsWith("/admin/hr/funding-agency") ||
    pathname.startsWith("/admin/hr/funding-modality") ||
    pathname.startsWith("/dashboard/hr/employee");

  const canHandleLeaveApprovals =
    isAdmin ||
    [
      "DivisionHead",
      "DepartmentHead",
      "Commissioner",
      "Chairperson",
      "SecretaryService",
    ].includes(userRole);

  const displayedOpenSection =
    openSection ||
    (isMasterActive
      ? "master"
      : isLeaveActive || (!isAdmin && canHandleLeaveApprovals)
        ? "leave"
        : isHRSActive
        ? "hrs"
        : null);

  const toggleSection = (section: "master" | "leave" | "hrs") => {
    setOpenSection(displayedOpenSection === section ? null : section);
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const navButtonClass = (isActive: boolean) =>
    `w-full flex items-center gap-3 px-4 py-3 rounded-md transition ${
      isActive ? "bg-black text-white" : "text-black hover:bg-gray-100"
    }`;

  const navSubButtonClass = (isActive: boolean) =>
    `w-full text-left px-4 py-2 rounded-md transition ${
      isActive ? "bg-black text-white" : "text-gray-700 hover:bg-gray-100"
    }`;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen fixed top-0 left-0 flex flex-col text-sm">
      <div className="px-4 py-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
          <span className="text-sm font-semibold text-gray-700">
            {userName ? userName.charAt(0).toUpperCase() : "U"}
          </span>
        </div>
        <p className="text-lg text-gray-700 font-medium truncate">
          {userName || "User"}
        </p>
      </div>

      <nav className="flex-1 px-4 py-3 space-y-2 overflow-y-auto min-h-0">
        {isAdmin ? (
          <>
            {/* Master */}
            <button
              onClick={() => toggleSection("master")}
              className={navButtonClass(isMasterActive)}
            >
              <Layers size={18} />
              <span className="flex-1 text-left">Master</span>
              {displayedOpenSection === "master" ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {displayedOpenSection === "master" && (
              <div className="ml-8 mt-1 space-y-1">
                <button
                  onClick={() => router.push("/admin/department")}
                  className={navSubButtonClass(
                    pathname === "/admin/department",
                  )}
                >
                  Department
                </button>
                <button
                  onClick={() => router.push("/division")}
                  className={navSubButtonClass(pathname === "/division")}
                >
                  Division
                </button>
              </div>
            )}

            {/* Leave */}
            <button
              onClick={() => toggleSection("leave")}
              className={navButtonClass(isLeaveActive)}
            >
              <Calendar size={18} />
              <span className="flex-1 text-left">Leave</span>
              {displayedOpenSection === "leave" ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {displayedOpenSection === "leave" && (
              <div className="ml-8 mt-1 space-y-1">
                {canHandleLeaveApprovals && (
                  <button
                    onClick={() => router.push("/dashboard/leave/approvals")}
                    className={navSubButtonClass(
                      pathname.startsWith("/dashboard/leave/approvals"),
                    )}
                  >
                    Leave Approvals
                  </button>
                )}
                <button
                  onClick={() => router.push("/admin/leave-type")}
                  className={navSubButtonClass(
                    pathname === "/admin/leave-type",
                  )}
                >
                  Leave Type
                </button>
                <button
                  onClick={() => router.push("/admin/leave-balances")}
                  className={navSubButtonClass(
                    pathname === "/admin/leave-balances",
                  )}
                >
                  Leave Balance
                </button>
                <button
                  onClick={() => router.push("/dashboard/leave/holidays")}
                  className={navSubButtonClass(
                    pathname === "/dashboard/leave/holidays",
                  )}
                >
                  Holiday List
                </button>
                <button
                  onClick={() => router.push("/admin/commissioner-assignments")}
                  className={navSubButtonClass(
                    pathname === "/admin/commissioner-assignments",
                  )}
                >
                  Commissioner Mapping
                </button>
              </div>
            )}

            {/* Admin-only buttons */}
            <button
              onClick={() => router.push("/admin/pending-users")}
              className={navButtonClass(pathname === "/admin/pending-users")}
            >
              <Clock size={18} />
              Pending Approvals
            </button>
            <button
              onClick={() => router.push("/dashboard/weekly-plan")}
              className={navButtonClass(pathname === "/dashboard/weekly-plan")}
            >
              <Clock size={18} />
              Weekly Plan
            </button>
            <button
              onClick={() => router.push("/admin/all-users")}
              className={navButtonClass(pathname === "/admin/all-users")}
            >
              <Users size={18} />
              All Users
            </button>
            <button
              onClick={() => router.push("/settings")}
              className={navButtonClass(pathname === "/settings")}
            >
              <Settings size={18} />
              Settings
            </button>
          </>
        ) : (
          <>
            {/* Non-admin Leave */}
            <button
              onClick={() => toggleSection("leave")}
              className={navButtonClass(isLeaveActive)}
            >
              <Shield size={18} />
              <span className="flex-1 text-left">Leave</span>
              {displayedOpenSection === "leave" ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {displayedOpenSection === "leave" && (
              <div className="ml-8 mt-1 space-y-1">
                <button
                  onClick={() => router.push("/dashboard/leave")}
                  className={navSubButtonClass(
                    pathname.startsWith("/dashboard/leave") &&
                      !pathname.startsWith("/dashboard/leave/approvals"),
                  )}
                >
                  Apply Leave
                </button>
                {canHandleLeaveApprovals && (
                  <button
                    onClick={() => router.push("/dashboard/leave/approvals")}
                    className={navSubButtonClass(
                      pathname.startsWith("/dashboard/leave/approvals"),
                    )}
                  >
                    Leave Approvals
                  </button>
                )}
              </div>
            )}
            <button
              onClick={() => router.push("/settings")}
              className={navButtonClass(pathname === "/settings")}
            >
              <Settings size={18} />
              Settings
            </button>
          </>
        )}

        {/* ─── SECRETARIAT SERVICES ─── */}
        <button
          onClick={() => router.push("/secretariat-services")}
          className={navButtonClass(pathname === "/secretariat-services")}
        >
          <Briefcase size={18} />
          Secretariat Services
        </button>

        {/* ─── HRS MODULE (updated) ─── */}
        {showHRS && (
          <>
            <button
              onClick={() => {
                router.push("/dashboard/hr/employee");
                setOpenSection("hrs");
              }}
              className={navButtonClass(isHRSActive)}
            >
              <Clock size={18} />
              <span className="flex-1 text-left">HRS</span>
              {displayedOpenSection === "hrs" ? (
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
              )}
            </button>
            {displayedOpenSection === "hrs" && (
              <div className="ml-8 mt-1 space-y-1">
                <button
                  onClick={() => router.push("/admin/hr/training-type")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/training-type"
                  )}
                >
                  Training Type
                </button>
                <button
                  onClick={() => router.push("/admin/hr/program-title")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/program-title"
                  )}
                >
                  Program Catelogue
                </button>
                {/* ─── NEW: Training Log ─── */}
                <button
                  onClick={() => router.push("/admin/hr/training-log")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/training-log"
                  )}
                >
                  Training Log
                </button>
                <button
                  onClick={() => router.push("/admin/hr/institution")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/institution"
                  )}
                >
                  Institution
                </button>
                <button
                  onClick={() => router.push("/admin/hr/funding-agency")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/funding-agency"
                  )}
                >
                  Funding Agency
                </button>
                <button
                  onClick={() => router.push("/admin/hr/funding-modality")}
                  className={navSubButtonClass(
                    pathname === "/admin/hr/funding-modality"
                  )}
                >
                  Funding Modality
                </button>
              </div>
            )}
          </>
        )}
      </nav>

      {/* Logout */}
      <div className="px-4 py-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-md text-black hover:bg-gray-100"
        >
          <LogOut size={18} className="text-red-500" />
          <span className="text-red-500">Logout</span>
        </button>
      </div>

      <div className="px-4 py-4">
        © {new Date().getFullYear()} ANTI-CORRUPTION COMMISSION
      </div>
    </aside>
  );
}