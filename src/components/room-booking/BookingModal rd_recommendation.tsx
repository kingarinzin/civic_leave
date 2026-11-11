"use client";

import { X } from "lucide-react";
import { useEffect } from "react";
import BookingWizard from "./BookingWizard";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  room: any;
  beds: any[];
  preselectedBedIds: string[];
}

export default function BookingModal({ isOpen, onClose, room, beds, preselectedBedIds }: BookingModalProps) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6"
      onClick={onClose} // Click outside to close
    >
      {/* Modal Container - matching Booking.com's clean white box */}
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()} // Prevent clicking inside from closing
      >
        
        {/* Clean Header with Close Button */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-xl font-bold text-gray-900">
            Complete your booking
          </h2>
          <button
            onClick={onClose}
            className="p-2 bg-gray-50 hover:bg-gray-100 text-gray-500 rounded-full transition-colors"
            title="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* The actual form rendered seamlessly inside */}
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <BookingWizard
            room={room}
            beds={beds}
            preselectedBedIds={preselectedBedIds}
            isInsideModal={true}
            onCloseModal={onClose}
          />
        </div>
        
      </div>
    </div>
  );
}