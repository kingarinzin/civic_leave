import mongoose from "mongoose";

const FeedbackSchema = new mongoose.Schema({
  bugId: { type: String, required: true },
  loggedAt: { type: String, required: true },
  reportedBy: { type: String, required: true },
  module: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  impact: { type: String, required: true },
  status: { type: String, required: true },
  rootCause: { type: String, default: "" },
  comments: { type: String, default: "" },
  resolvedAt: { type: String, default: "" },
  
  // THIS IS THE MISSING PIECE
  attachments: { type: [String], default: [] }, 
});

export default mongoose.models.Feedback || mongoose.model("Feedback", FeedbackSchema);