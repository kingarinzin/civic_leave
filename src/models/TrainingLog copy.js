import mongoose from "mongoose";

const TrainingLogSchema = new mongoose.Schema({
  programTitle: { type: mongoose.Schema.Types.ObjectId, ref: "ProgramTitle", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  fundingAgency: { type: mongoose.Schema.Types.ObjectId, ref: "FundingAgency", required: true },
  fundingModality: { type: mongoose.Schema.Types.ObjectId, ref: "FundingModality", required: true },
  institution: { type: mongoose.Schema.Types.ObjectId, ref: "Institution", required: true },
  place: { type: String, required: true },
  country: { type: String, required: true },
  numberOfParticipants: { type: Number, required: true, min: 1 },
  totalCost: { type: Number, required: true, min: 0 },
  hrcReference: { type: String, trim: true },
  status: { type: String, enum: ["Scheduled","In progress","Completed","Cancelled","Deferred"], default: "Scheduled" },
  certification: { type: Boolean, default: false },
}, { timestamps: true });

export default mongoose.models.TrainingLog || mongoose.model("TrainingLog", TrainingLogSchema);