import mongoose from "mongoose";

const DocumentAccessLogSchema = new mongoose.Schema(
  {
    document_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "MeetingDocument",
      required: true,
    },
    user: { type: String, required: true },
    action: { type: String, enum: ["Viewed", "Downloaded"], required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.DocumentAccessLog ||
  mongoose.model("DocumentAccessLog", DocumentAccessLogSchema);