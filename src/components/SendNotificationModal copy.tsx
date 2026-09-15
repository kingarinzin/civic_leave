"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  X,
  Send,
  Users,
  Building2,
  GitBranch,
  Loader2,
  ChevronRight,
  ChevronDown,
  Search,
  Mail,
  AlertCircle,
} from "lucide-react";

interface SendNotificationModalProps {
  docId: string;
  onClose: () => void;
  onSent: (result: any) => void;
}

interface DepartmentOption {
  id: string;
  name: string;
}

interface DivisionOption {
  id: string;
  name: string;
  departmentId?: string;
}

interface OfficerOption {
  _id: string;
  name?: string;
  email?: string;
  departmentName?: string;
  divisionName?: string;
  isActive?: boolean;
}

const trimName = (s?: string) => (s || "").trim().replace(/\s+/g, " ");

export default function SendNotificationModal({
  docId,
  onClose,
  onSent,
}: SendNotificationModalProps) {
  // ─── Data ─────────────────────────────────────────
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [officers, setOfficers] = useState<OfficerOption[]>([]);

  // ─── Loading / error ──────────────────────────────
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // ─── Selection ────────────────────────────────────
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>([]);
  const [selectedOfficers, setSelectedOfficers] = useState<string[]>([]);

  // ─── Shortcuts ────────────────────────────────────
  const [testEmail, setTestEmail] = useState("");
  const [sendToAll, setSendToAll] = useState(false);

  // ─── UI state ─────────────────────────────────────
  const [expandedDepts, setExpandedDepts] = useState<Record<string, boolean>>({});
  const [expandedDivs, setExpandedDivs] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // ─── Sending state ────────────────────────────────
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  // ─── Load dropdowns + officers ────────────────────
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setLoadError("");
      try {
        const token = localStorage.getItem("token");

        const [dropdownRes, usersRes] = await Promise.all([
          fetch("/api/meetings/documents_dropdowns"),
          fetch("/api/admin/all-users", {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!dropdownRes.ok) throw new Error("Failed to load dropdowns");
        if (!usersRes.ok) throw new Error("Failed to load users");

        const dropdownData = await dropdownRes.json();
        const usersData = await usersRes.json();
        if (cancelled) return;

        const depts: DepartmentOption[] = (dropdownData.departments || []).map(
          (d: any) => ({ id: String(d.id || d._id), name: trimName(d.name) })
        );
        const divs: DivisionOption[] = (dropdownData.divisions || []).map(
          (d: any) => ({
            id: String(d.id || d._id),
            name: trimName(d.name),
            departmentId: d.departmentId ? String(d.departmentId) : undefined,
          })
        );
        const offs: OfficerOption[] = (usersData.users || [])
          .filter((u: any) => u.isActive !== false)
          .map((u: any) => ({
            _id: String(u._id),
            name: u.name || "",
            email: u.email || "",
            departmentName: trimName(u.departmentName),
            divisionName: trimName(u.divisionName),
            isActive: u.isActive !== false,
          }));

        setDepartments(depts);
        setDivisions(divs);
        setOfficers(offs);
      } catch (err: any) {
        if (!cancelled) {
          console.error("SendNotificationModal load error:", err);
          setLoadError(err.message || "Failed to load data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Grouping ─────────────────────────────────────
  const divisionsByDept = useMemo(() => {
    const map: Record<string, DivisionOption[]> = {};
    for (const d of divisions) {
      const key = d.departmentId || "__orphan__";
      if (!map[key]) map[key] = [];
      map[key].push(d);
    }
    for (const k of Object.keys(map))
      map[k].sort((a, b) => a.name.localeCompare(b.name));
    return map;
  }, [divisions]);

  const officersByDeptDiv = useMemo(() => {
    const map: Record<string, OfficerOption[]> = {};
    for (const o of officers) {
      const key = `${o.departmentName || ""}||${o.divisionName || ""}`;
      if (!map[key]) map[key] = [];
      map[key].push(o);
    }
    for (const k of Object.keys(map))
      map[k].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return map;
  }, [officers]);

  const officersForDivision = (deptName: string, divName: string) =>
    officersByDeptDiv[`${deptName}||${divName}`] || [];

  // ─── Cascade helpers ──────────────────────────────
  const toggleDeptExpanded = (id: string) =>
    setExpandedDepts((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleDivExpanded = (id: string) =>
    setExpandedDivs((prev) => ({ ...prev, [id]: !prev[id] }));

  const allOfficersForDept = (dept: DepartmentOption): string[] => {
    const divs = divisionsByDept[dept.id] || [];
    const out: string[] = [];
    for (const d of divs) {
      for (const o of officersForDivision(dept.name, d.name)) out.push(o._id);
    }
    return out;
  };

  const allOfficersForDiv = (deptName: string, divName: string): string[] =>
    officersForDivision(deptName, divName).map((o) => o._id);

  const toggleDepartment = (dept: DepartmentOption) => {
    const officerIds = allOfficersForDept(dept);
    const divIds = (divisionsByDept[dept.id] || []).map((d) => d.id);
    const isFullySelected =
      officerIds.length > 0 &&
      officerIds.every((id) => selectedOfficers.includes(id));

    if (isFullySelected) {
      setSelectedOfficers((prev) => prev.filter((id) => !officerIds.includes(id)));
      setSelectedDivisions((prev) => prev.filter((id) => !divIds.includes(id)));
      setSelectedDepartments((prev) => prev.filter((id) => id !== dept.id));
    } else {
      setSelectedOfficers((prev) =>
        Array.from(new Set([...prev, ...officerIds]))
      );
      setSelectedDivisions((prev) =>
        Array.from(new Set([...prev, ...divIds]))
      );
      setSelectedDepartments((prev) =>
        prev.includes(dept.id) ? prev : [...prev, dept.id]
      );
    }
  };

  const toggleDivision = (dept: DepartmentOption, div: DivisionOption) => {
    const officerIds = allOfficersForDiv(dept.name, div.name);
    const isFullySelected =
      officerIds.length > 0 &&
      officerIds.every((id) => selectedOfficers.includes(id));

    let newOfficerSelection: string[];
    if (isFullySelected) {
      newOfficerSelection = selectedOfficers.filter(
        (id) => !officerIds.includes(id)
      );
      setSelectedDivisions((prev) => prev.filter((id) => id !== div.id));
    } else {
      newOfficerSelection = Array.from(
        new Set([...selectedOfficers, ...officerIds])
      );
      setSelectedDivisions((prev) =>
        prev.includes(div.id) ? prev : [...prev, div.id]
      );
    }
    setSelectedOfficers(newOfficerSelection);

    const deptOfficerIds = allOfficersForDept(dept);
    const deptAllSelected =
      deptOfficerIds.length > 0 &&
      deptOfficerIds.every((id) => newOfficerSelection.includes(id));
    setSelectedDepartments((prev) =>
      deptAllSelected
        ? prev.includes(dept.id)
          ? prev
          : [...prev, dept.id]
        : prev.filter((id) => id !== dept.id)
    );
  };

  const toggleOfficer = (officer: OfficerOption) => {
    const isSelected = selectedOfficers.includes(officer._id);
    setSelectedOfficers((prev) =>
      isSelected
        ? prev.filter((id) => id !== officer._id)
        : [...prev, officer._id]
    );
  };

  const stateOfOfficerIds = (
    ids: string[]
  ): "checked" | "unchecked" | "partial" => {
    if (ids.length === 0) return "unchecked";
    const sel = ids.filter((id) => selectedOfficers.includes(id)).length;
    if (sel === 0) return "unchecked";
    if (sel === ids.length) return "checked";
    return "partial";
  };

  // ─── Filtering by search ──────────────────────────
  const officerMatches = (o: OfficerOption) => {
    if (!searchTerm.trim()) return true;
    const t = searchTerm.toLowerCase();
    return (
      (o.name || "").toLowerCase().includes(t) ||
      (o.email || "").toLowerCase().includes(t) ||
      (o.departmentName || "").toLowerCase().includes(t) ||
      (o.divisionName || "").toLowerCase().includes(t)
    );
  };

  const isDeptVisible = (dept: DepartmentOption): boolean => {
    if (!searchTerm.trim()) return true;
    if (dept.name.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    const divs = divisionsByDept[dept.id] || [];
    return divs.some((d) =>
      officersForDivision(dept.name, d.name).some(officerMatches)
    );
  };

  const visibleOfficers = (deptName: string, divName: string) =>
    officersForDivision(deptName, divName).filter(officerMatches);

  // ─── Shortcut handlers ────────────────────────────
  const shortcutsActive = !!testEmail.trim() || sendToAll;

  const handleShortcutToggleAll = () => {
    const next = !sendToAll;
    setSendToAll(next);
    if (next) {
      setTestEmail("");
      // clear selections when switching to all
      setSelectedDepartments([]);
      setSelectedDivisions([]);
      setSelectedOfficers([]);
    }
  };

  const handleShortcutTestEmailChange = (val: string) => {
    setTestEmail(val);
    if (val.trim()) {
      setSendToAll(false);
      setSelectedDepartments([]);
      setSelectedDivisions([]);
      setSelectedOfficers([]);
    }
  };

  // ─── Preview list ─────────────────────────────────
  const selectedOfficerObjects = useMemo(
    () => officers.filter((o) => selectedOfficers.includes(o._id)),
    [officers, selectedOfficers]
  );

  // ─── Can send? ────────────────────────────────────
  const canSend =
    !sending &&
    (!!testEmail.trim() || sendToAll || selectedOfficers.length > 0);

  // ─── Send ─────────────────────────────────────────
  const handleSend = async () => {
    setSendError("");
    if (!canSend) return;

    // Build payload
    const payload: Record<string, any> = {};
    let mode = "";

    if (testEmail.trim()) {
      if (!testEmail.includes("@")) {
        setSendError("Please enter a valid email address");
        return;
      }
      payload.testEmail = testEmail.trim();
      mode = "test";
    } else if (sendToAll) {
      mode = "all";
    } else {
      payload.userIds = selectedOfficers;
      mode = "selection";
    }

    // Confirm
    const count =
      mode === "test"
        ? 1
        : mode === "all"
        ? "all active"
        : selectedOfficers.length;
    if (
      !confirm(
        `Send this notification to ${count} recipient${
          count === 1 ? "" : "s"
        }?`
      )
    )
      return;

    try {
      setSending(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/meetings/documents/${docId}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        setSendError(data.error || `Failed to send (status ${res.status})`);
        return;
      }

      onSent(data);
    } catch (err: any) {
      console.error("Send error:", err);
      setSendError(err.message || "Error sending emails");
    } finally {
      setSending(false);
    }
  };

  // ─── Render ───────────────────────────────────────
  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={sending ? undefined : onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800">
            📧 Send Notification
          </h3>
          <button
            onClick={onClose}
            disabled={sending}
            className="text-gray-500 hover:text-gray-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Shortcut bar */}
        <div className="px-6 py-3 border-b border-gray-100 bg-gray-50 flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Mail size={14} className="text-gray-500" />
            <label className="text-gray-600">Test:</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => handleShortcutTestEmailChange(e.target.value)}
              placeholder="one@example.com"
              className="border border-gray-300 rounded px-2 py-1 text-xs w-52 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <input
              id="sendToAllToggle"
              type="checkbox"
              checked={sendToAll}
              onChange={handleShortcutToggleAll}
              className="w-4 h-4 text-indigo-600 rounded"
            />
            <label
              htmlFor="sendToAllToggle"
              className="text-gray-700 cursor-pointer select-none"
            >
              👥 Send to All Users
            </label>
          </div>
        </div>

        {/* Search bar */}
        <div className="px-6 pt-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={shortcutsActive}
              placeholder="Search by name, email, department, or division…"
              className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Body — tree */}
        <div
          className={`flex-1 overflow-y-auto p-6 ${
            shortcutsActive ? "opacity-40 pointer-events-none" : ""
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Loader2 size={36} className="animate-spin mb-3" />
              <p className="text-sm">Loading departments, divisions, and officers…</p>
            </div>
          ) : loadError ? (
            <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              ❌ {loadError}
            </div>
          ) : departments.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No departments found.
            </div>
          ) : (
            <div className="border border-gray-200 rounded-lg">
              {departments.filter(isDeptVisible).map((dept) => {
                const divs = divisionsByDept[dept.id] || [];
                const deptOfficerIds = allOfficersForDept(dept);
                const deptState = stateOfOfficerIds(deptOfficerIds);
                const isOpen = !!expandedDepts[dept.id];

                return (
                  <div
                    key={dept.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50">
                      <button
                        onClick={() => toggleDeptExpanded(dept.id)}
                        className="text-gray-500"
                        aria-label="Toggle"
                      >
                        {isOpen ? (
                          <ChevronDown size={16} />
                        ) : (
                          <ChevronRight size={16} />
                        )}
                      </button>
                      <input
                        type="checkbox"
                        ref={(el) => {
                          if (el) el.indeterminate = deptState === "partial";
                        }}
                        checked={deptState === "checked"}
                        onChange={() => toggleDepartment(dept)}
                        className="w-4 h-4 text-indigo-600 rounded"
                      />
                      <Building2 size={14} className="text-indigo-500" />
                      <span className="text-sm font-semibold text-gray-800">
                        {dept.name}
                      </span>
                      <span className="text-xs text-gray-400 ml-auto">
                        {deptOfficerIds.length} officer
                        {deptOfficerIds.length !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {isOpen &&
                      divs.map((div) => {
                        const officersInDiv = visibleOfficers(dept.name, div.name);
                        const divOfficerIds = allOfficersForDiv(
                          dept.name,
                          div.name
                        );
                        const divState = stateOfOfficerIds(divOfficerIds);
                        const divOpen = !!expandedDivs[div.id];

                        if (
                          searchTerm.trim() &&
                          officersInDiv.length === 0 &&
                          !div.name
                            .toLowerCase()
                            .includes(searchTerm.toLowerCase())
                        )
                          return null;

                        return (
                          <div key={div.id}>
                            <div className="flex items-center gap-2 pl-8 pr-3 py-2 hover:bg-gray-50">
                              <button
                                onClick={() => toggleDivExpanded(div.id)}
                                className="text-gray-500"
                                aria-label="Toggle"
                              >
                                {divOpen ? (
                                  <ChevronDown size={14} />
                                ) : (
                                  <ChevronRight size={14} />
                                )}
                              </button>
                              <input
                                type="checkbox"
                                ref={(el) => {
                                  if (el) el.indeterminate = divState === "partial";
                                }}
                                checked={divState === "checked"}
                                onChange={() => toggleDivision(dept, div)}
                                className="w-4 h-4 text-indigo-600 rounded"
                              />
                              <GitBranch size={13} className="text-gray-500" />
                              <span className="text-sm text-gray-700">
                                {div.name}
                              </span>
                              <span className="text-xs text-gray-400 ml-auto">
                                {divOfficerIds.length} officer
                                {divOfficerIds.length !== 1 ? "s" : ""}
                              </span>
                            </div>

                            {divOpen &&
                              (officersInDiv.length === 0 ? (
                                <div className="pl-16 pr-3 py-1.5 text-xs text-gray-400">
                                  No officers in this division
                                </div>
                              ) : (
                                officersInDiv.map((officer) => (
                                  <label
                                    key={officer._id}
                                    className="flex items-start gap-3 pl-16 pr-3 py-1.5 hover:bg-gray-50 cursor-pointer"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={selectedOfficers.includes(
                                        officer._id
                                      )}
                                      onChange={() => toggleOfficer(officer)}
                                      className="w-3.5 h-3.5 text-indigo-600 rounded mt-0.5"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium text-gray-800 truncate">
                                        {officer.name || "Unnamed"}
                                      </p>
                                      <p className="text-[11px] text-gray-500 truncate">
                                        {officer.email}
                                      </p>
                                    </div>
                                  </label>
                                ))
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Preview panel */}
        <div className="px-6">
          <button
            onClick={() => setShowPreview((v) => !v)}
            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {showPreview ? "▾ Hide recipients" : "▸ Preview recipients"}
          </button>
          {showPreview && (
            <div className="mt-2 border border-gray-200 rounded-lg max-h-40 overflow-y-auto bg-gray-50">
              {testEmail.trim() ? (
                <div className="p-3 text-xs text-gray-700">
                  Will send to <strong>1 test address</strong>: {testEmail}
                </div>
              ) : sendToAll ? (
                <div className="p-3 text-xs text-gray-700">
                  Will send to <strong>all active users</strong>.
                </div>
              ) : selectedOfficerObjects.length === 0 ? (
                <div className="p-3 text-xs text-gray-500">
                  No recipients selected yet.
                </div>
              ) : (
                selectedOfficerObjects.map((o) => (
                  <div
                    key={o._id}
                    className="px-3 py-1.5 text-xs border-b border-gray-100 last:border-0"
                  >
                    <span className="font-medium text-gray-800">
                      {o.name || "Unnamed"}
                    </span>
                    <span className="text-gray-500"> — {o.email}</span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Send error */}
        {sendError && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-xs flex items-start gap-2">
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{sendError}</span>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center flex-wrap gap-2">
          <div className="text-sm text-gray-600">
            {testEmail.trim()
              ? `🧪 Test: ${testEmail}`
              : sendToAll
              ? "👥 Sending to all active users"
              : selectedOfficers.length > 0
              ? `👥 ${selectedOfficers.length} officer${
                  selectedOfficers.length !== 1 ? "s" : ""
                } · ${selectedDivisions.length} division${
                  selectedDivisions.length !== 1 ? "s" : ""
                } · ${selectedDepartments.length} department${
                  selectedDepartments.length !== 1 ? "s" : ""
                }`
              : "Nothing selected yet"}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSend}
              disabled={!canSend}
              className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send size={14} />
                  Send Emails
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}