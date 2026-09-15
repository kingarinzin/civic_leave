import mongoose from "mongoose";

const MeetingDocumentSchema = new mongoose.Schema(
  {
    display_order: {
      type: Number,
      required: true,
      default: 999,
      min: 1,
    },
    date: {
      type: String,
      required: true,
    },
    document_type: {
      type: String,
      required: true,
    },
    commission: {
      type: String,
      required: true,
    },
    year: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    original_filename: {
      type: String,
    },
    uploaded_by: {
      type: String,
    },
    // ─── New fields for better tracking ────────────
    uploaded_by_email: {
      type: String,
    },
    uploaded_by_name: {
      type: String,
    },
  },
  { timestamps: true }
);

// Add index for better query performance
MeetingDocumentSchema.index({ display_order: 1 });
MeetingDocumentSchema.index({ commission: 1 });
MeetingDocumentSchema.index({ year: 1 });
MeetingDocumentSchema.index({ document_type: 1 });

export default mongoose.models.MeetingDocument ||
  mongoose.model("MeetingDocument", MeetingDocumentSchema);