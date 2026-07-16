// app/secretariat-services/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import {
  ExternalLink,
  Search,
  Send,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  AlertCircle,
  XCircle,
  Truck,
  Coffee,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import Sidebar from "@/components/Sidebar";

interface Service {
  id: string;
  name: string;
  description: string;
  link: string;
  icon: React.ReactNode;
}

export default function SecretariatServices() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // Show more cards per page since they're smaller

  const [services] = useState<Service[]>([
    {
      id: "1",
      name: "Dispatch",
      description: "Submit dispatch requests for Head Office operations",
      link: "https://share.google/c3z9xbL2gvEp4xaHj",
      icon: <Send size={20} />,
    },
    {
      id: "2",
      name: "Property Requisition",
      description: "Order office supplies, equipment, and maintenance",
      link: "https://share.google/uvIUvDeZr9M65gYFt",
      icon: <ClipboardList size={20} />,
    },
    {
      id: "3",
      name: "Catering Service Order",
      description: "Order catering for trainings, workshops, and meetings",
      link: "https://share.google/D9M8wzTnNSR6mmw0N",
      icon: <Coffee size={20} />,
    },
    {
      id: "4",
      name: "Vehicle Requisition",
      description: "Request pool vehicles for tours and official travel",
      link: "https://share.google/yAq2uilqkVZKygzO4",
      icon: <Truck size={20} />,
    },
    {
      id: "5",
      name: "ICT Helpdesk",
      description: "Submit ICT support and technical assistance tickets",
      link: "https://share.google/mLokkb6XB0lsNgtQN",
      icon: <HelpCircle size={20} />,
    },
  ]);

  // Filtering and pagination logic (same as before)
  const filteredServices = services.filter(
    (service) =>
      service.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      service.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPages = Math.ceil(filteredServices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentServices = filteredServices.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const goToPage = (page: number) => setCurrentPage(page);

  const openForm = (url: string) => {
    window.open(url, "_blank");
  };

  const clearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  const getPaginationItems = () => {
    const items = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) items.push(i);
    } else {
      items.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);
      if (currentPage <= 3) {
        start = 2;
        end = 4;
      }
      if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }
      if (start > 2) items.push("...");
      for (let i = start; i <= end; i++) items.push(i);
      if (end < totalPages - 1) items.push("...");
      items.push(totalPages);
    }
    return items;
  };

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed top-0 left-0 z-50 h-full w-64 transform transition-transform duration-300 ease-in-out
          ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:relative lg:translate-x-0 lg:z-auto lg:block
        `}
      >
        <Sidebar />
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="absolute top-4 right-4 lg:hidden p-2 rounded-full bg-black/30 text-white hover:bg-black/50 transition"
        >
          <X size={20} />
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Mobile header */}
        <div className="sticky top-0 z-30 bg-gray-100/80 backdrop-blur-sm p-4 lg:hidden flex items-center justify-between border-b border-gray-200">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 -ml-2 rounded-lg hover:bg-gray-200 transition"
          >
            <Menu size={24} className="text-gray-700" />
          </button>
          <h1 className="text-lg font-semibold text-gray-800">Secretariat Services</h1>
          <div className="w-8" />
        </div>

        <div className="p-4 md:p-6 flex-1">
          {/* Desktop header */}
          <div className="hidden lg:flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Secretariat Services</h1>
              <p className="text-sm text-gray-500">
                Select a service below to open its Google Form
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Search by service name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-xl leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            {searchTerm && (
              <button
                onClick={clearSearch}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition"
              >
                <XCircle size={18} />
              </button>
            )}
          </div>

          {/* Services Grid - Smaller, more attractive cards */}
          {currentServices.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {currentServices.map((service, index) => (
                <div
                  key={service.id}
                  onClick={() => openForm(service.link)}
                  className="group bg-white rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 p-4 flex flex-col items-start border border-gray-100 hover:border-blue-400 hover:shadow-blue-100/50 cursor-pointer relative overflow-hidden"
                  style={{
                    animation: `fadeInUp 0.3s ease-out ${index * 50}ms both`,
                  }}
                >
                  {/* Decorative gradient bar on hover */}
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-400 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />

                  <div className="flex items-center gap-3 w-full">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100 group-hover:scale-110 transition-all duration-300 flex-shrink-0">
                      {service.icon}
                    </div>
                    <h3 className="text-sm font-semibold text-gray-800 group-hover:text-blue-700 transition truncate">
                      {service.name}
                    </h3>
                  </div>

                  <p className="text-xs text-gray-500 mt-2 flex-grow line-clamp-2">
                    {service.description}
                  </p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      openForm(service.link);
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition group-hover:bg-blue-700"
                  >
                    Open <ExternalLink size={12} />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm flex flex-col items-center justify-center">
              <AlertCircle className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-gray-500 text-lg">No services found</p>
              <p className="text-sm text-gray-400">Try adjusting your search terms</p>
              {searchTerm && (
                <button
                  onClick={clearSearch}
                  className="mt-4 text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  Clear search
                </button>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-8">
              <div className="text-sm text-gray-700 order-2 sm:order-1">
                Showing {indexOfFirstItem + 1}–{Math.min(indexOfLastItem, filteredServices.length)} of {filteredServices.length}
              </div>
              <div className="flex flex-wrap justify-center gap-1 order-1 sm:order-2">
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === 1
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <ChevronLeft size={16} />
                </button>
                {getPaginationItems().map((item, idx) =>
                  item === "..." ? (
                    <span key={`ellipsis-${idx}`} className="px-3 py-2 text-gray-500">
                      …
                    </span>
                  ) : (
                    <button
                      key={item}
                      onClick={() => goToPage(item as number)}
                      className={`px-3 py-2 border text-sm font-medium rounded-md ${
                        currentPage === item
                          ? "z-10 bg-blue-50 border-blue-500 text-blue-600"
                          : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md ${
                    currentPage === totalPages
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Add animation keyframes */}
      <style jsx>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}