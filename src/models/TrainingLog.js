import mongoose from "mongoose";

const TrainingLogSchema = new mongoose.Schema(
  {
    programTitle: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramTitle",
      required: [true, "Program Title is required"],
    },
    startDate: {
      type: Date,
      required: [true, "Start date is required"],
    },
    endDate: {
      type: Date,
      required: [true, "End date is required"],
    },
    fundingAgency: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FundingAgency",
      required: [true, "Funding Agency is required"],
    },
    fundingModality: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "FundingModality",
      required: [true, "Funding Modality is required"],
    },
    institution: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Institution",
      required: [true, "Institution is required"],
    },
    place: {
      type: String,
      trim: true,
      required: [true, "Place/City is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
    },
    numberOfParticipants: {
      type: Number,
      required: [true, "Number of Participants is required"],
      min: [1, "At least one participant required"],
    },
    totalCost: {
      type: Number,
      required: [true, "Total Cost is required"],
      min: [0, "Cost cannot be negative"],
    },
    hrcReference: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ["Scheduled", "In progress", "Completed", "Cancelled", "Deferred"],
      default: "Scheduled",
    },
    certification: {
      type: Boolean,
      default: false,
    },
    // ─── NEW: Employees who attended ───
    employees: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Employee",
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.models.TrainingLog ||
  mongoose.model("TrainingLog", TrainingLogSchema);