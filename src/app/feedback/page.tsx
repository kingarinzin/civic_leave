"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  Loader2, 
  Search, 
  Filter, 
  RefreshCw, 
  Plus, 
  Paperclip, 
  X,
  AlertCircle
} from "lucide-react";
import Sidebar from "@/components/Sidebar"; // Adjust path if needed

// --- MOCK DATA (Based on your screenshot) ---
interface FeedbackRow {
  id: string;
  bugId: string;
  loggedAt: string;
  reportedBy: string;
  module: string;
  category: string;
  description: string;
  impact: "High" | "Medium" | "Low" | "Critical";
  status: "Resolved" | "Pending" | "Unresolved" | "In-Progress";
  rootCause: string;
  comments: string;
}

const initialData: FeedbackRow[] = [
  { id: "1", bugId: "BUG-1", loggedAt: "7/15/2025 12:54:45", reportedBy: "Kinga Rinzin", module: "Case Assignment", category: "Functional", description: "The Chief has no option to select and list the IO...", impact: "High", status: "Resolved", rootCause: "Unclear Requirement", comments: "can provide remark and grant access..." },
  { id: "2", bugId: "BUG-2", loggedAt: "7/15/2025 17:58:11", reportedBy: "Kinga Rinzin", module: "Case Assignment", category: "Functional", description: "Once the Chief substitutes any of the members...", impact: "Medium", status: "Resolved", rootCause: "Unclear Requirement", comments: "the order is available for print..." },
  { id: "3", bugId: "BUG-3", loggedAt: "7/15/2025 18:06:27", reportedBy: "Kinga Rinzin", module: "Case Assignment", category: "Functional", description: "The assignment hierarchy requires these three members...", impact: "High", status: "Resolved", rootCause: "Design Flaw", comments: "minimum number is 1 member" },
  { id: "4", bugId: "BUG-10", loggedAt: "7/16/2025 18:19:21", reportedBy: "Kinga Rinzin", module: "Case Assignment", category: "Functional", description: "The automated folder creation on case assignment...", impact: "High", status: "Resolved", rootCause: "Configuration Issue", comments: "folder creation on case registration is configured" },
  { id: "5", bugId: "BUG-11", loggedAt: "7/16/2025 19:06:53", reportedBy: "Gyeltshen", module: "Entities", category: "Functional", description: "When adding organisation entity and select government...", impact: "Medium", status: "Pending", rootCause: "", comments: "" },
  { id: "6", bugId: "BUG-12", loggedAt: "7/16/2025 19:10:51", reportedBy: "Gyeltshen", module: "Entities", category: "Functional", description: "In addition to contact person, we need to have input fields...", impact: "Medium", status: "Pending", rootCause: "", comments: "" },
  { id: "7", bugId: "BUG-13", loggedAt: "7/16/2025 19:21:24", reportedBy: "Gyeltshen", module: "Across modules", category: "UI/UX", description: "The default alert boxes needs to be customized.", impact: "Low", status: "Pending", rootCause: "", comments: "" },
  { id: "8", bugId: "BUG-14", loggedAt: "7/16/2025 19:27:38", reportedBy: "Gyeltshen", module: "Entities", category: "UI/UX", description: "The person entity validation flow needs to be corrected...", impact: "Medium", status: "Unresolved", rootCause: "Design Flaw", comments: "this will not be possible in the current flow..." },
  { id: "9", bugId: "BUG-16", loggedAt: "7/18/2025 13:47:24", reportedBy: "Gyeltshen", module: "Report", category: "UI/UX", description: "Remove case no from the table (as it is already included inside...)", impact: "Low", status: "Resolved", rootCause: "", comments: "" },
  { id: "10", bugId: "BUG-17", loggedAt: "7/18/2025 13:48:05", reportedBy: "Gyeltshen", module: "Report", category: "Functional", description: "Add one more report template called 'Systems Report'...", impact: "High", status: "Resolved", rootCause: "", comments: "" },
];

export default function FeedbackPage() {
  const router = useRouter();
  const [data] = useState<FeedbackRow[]>(initialData);
  const [search, setSearch] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  const showNotification = (message: string, type: "success" | "error") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  // Filter Logic
  const filteredData = data.filter((item) => {
    const str = search.toLowerCase();
    return (
      item.bugId.toLowerCase().includes(str) ||
      item.reportedBy.toLowerCase().includes(str) ||
      item.module.toLowerCase().includes(str) ||
      item.description.toLowerCase().includes(str)
    );
  });

  // UI Helpers for Status Colors
  const getStatusPill = (status: string) => {
    switch (status) {
      case "Resolved": return "bg-green-100 text-green-700 border-green-200";
      case "Pending": return "bg-orange-100 text-orange-700 border-orange-200";
      case "Unresolved": return "bg-red-100 text-red-700 border-red-200";
      default: return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getImpactPill = (impact: string) => {
    switch (impact) {
      case "High": return "bg-red-50 text-red-600";
      case "Medium": return "bg-yellow-50 text-yellow-600";
      case "Low": return "bg-blue-50 text-blue-600";
      case "Critical": return "bg-red-100 text-red-800 font-bold";
      default: return "bg-gray-50 text-gray-600";
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100 relative text-black font-sans">
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-lg shadow-lg text-white ${notification.type === "success" ? "bg-green-600" : "bg-red-600"}`}>
          {notification.message}
        </div>
      )}

      <Sidebar />

      <main className="flex-1 p-4 md:p-6 lg:p-8 ml-0 lg:ml-64 w-full">
        <div className="max-w-[1600px] mx-auto w-full">
          
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">CIMS Bug Tracking</h1>
              <p className="text-sm text-gray-500 mt-1">Monitor system issues, track feedback, and assign resolutions.</p>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center justify-center gap-2 bg-black text-white px-4 py-2 rounded-md hover:bg-gray-800 transition shadow-sm text-sm font-medium"
            >
              <Plus size={16} /> Report Bug
            </button>
          </div>

          {/* DASHBOARD CARDS (Mocked based on screenshot) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Total Issues</p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-3xl font-bold text-gray-900">294</h2>
                <span className="text-xs text-green-600 font-medium mb-1">+12% this week</span>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Pending</p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-3xl font-bold text-orange-600">259</h2>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">In-Progress</p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-3xl font-bold text-blue-600">2</h2>
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <p className="text-sm text-gray-500 font-medium">Resolved</p>
              <div className="flex items-end gap-2 mt-1">
                <h2 className="text-3xl font-bold text-green-600">32</h2>
              </div>
            </div>
          </div>

          {/* TOOLBAR */}
          <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-4 bg-white p-3 rounded-lg shadow-sm border border-gray-200">
            <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search ID, user, module, description..."
                  className="w-full pl-9 pr-3 py-1.5 text-sm border rounded focus:ring-2 focus:ring-blue-400 outline-none"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600 font-medium ml-2">
                <Filter size={16} className="text-gray-400" /> Filters:
              </div>
              <select className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition">
                <option>All Categories</option>
                <option>Functional</option>
                <option>UI/UX</option>
              </select>
              <select className="border rounded px-2 py-1.5 text-sm outline-none bg-gray-50 hover:bg-white transition">
                <option>All Statuses</option>
                <option>Pending</option>
                <option>Resolved</option>
              </select>
              {(search) && (
                <button onClick={() => setSearch("")} className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1.5">
                  <RefreshCw size={14} /> Clear
                </button>
              )}
            </div>
            <div className="text-sm text-gray-600 font-medium">
              Total records: <span className="font-bold text-gray-800">{filteredData.length}</span>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white shadow rounded-lg overflow-x-auto">
            <table className="min-w-[1400px] w-full table-auto divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Bug ID</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Logged Date</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reported By</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Module</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-64">Issue Description</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Impact</th>
                  <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Root Cause</th>
                  <th className="px-3 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-48">Comments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white text-sm">
                {filteredData.length > 0 ? (
                  filteredData.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{row.bugId}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.loggedAt}</td>
                      <td className="px-3 py-3 text-gray-800 whitespace-nowrap">{row.reportedBy}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.module}</td>
                      <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{row.category}</td>
                      <td className="px-3 py-3 text-gray-600 text-xs max-w-xs truncate" title={row.description}>
                        {row.description}
                      </td>
                      <td className="px-3 py-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold ${getImpactPill(row.impact)}`}>
                          {row.impact}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${getStatusPill(row.status)}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs whitespace-nowrap">
                        {row.rootCause || "-"}
                      </td>
                      <td className="px-3 py-3 text-gray-600 text-xs max-w-xs truncate" title={row.comments}>
                        {row.comments || "-"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={10} className="text-center py-12 text-gray-500">
                      No bug reports found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

        </div>
      </main>

      {/* ========================================= */}
      {/* FLAG FEEDBACK MODAL (FRONTEND ONLY)       */}
      {/* ========================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2">
                <AlertCircle className="text-orange-500" size={20} />
                <h2 className="text-lg font-bold text-gray-900">Flag an Issue / Feedback</h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={(e) => { 
              e.preventDefault(); 
              setIsModalOpen(false); 
              showNotification("Report submitted successfully to the technical team.", "success"); 
            }} className="p-6 space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type *</label>
                  <select required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none">
                    <option value="Bug">Bug</option>
                    <option value="Feature Request">Feature Request</option>
                    <option value="UI/UX Issue">UI/UX Issue</option>
                    <option value="Performance">Performance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impact *</label>
                  <select required className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none">
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Module/Feature (Auto-detected)</label>
                <input disabled value="Current Page Context" className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-500 cursor-not-allowed" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea 
                  required 
                  rows={4} 
                  placeholder="Describe what went wrong..." 
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none resize-none"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Attach Screenshot (Optional)</label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:bg-gray-50 transition cursor-pointer">
                  <Paperclip className="mx-auto text-gray-400 mb-1" size={20} />
                  <p className="text-xs text-gray-500">Drag & drop image here or click to browse</p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border border-gray-200">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                System Status: All Systems Operational
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-black rounded-md hover:bg-gray-800 transition shadow-sm"
                >
                  Submit Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}