import mongoose from "mongoose";

const ProgramCostSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramTitle",
      // Removed 'required: true' so the Master List can save without it
    },
    programCostType: {
      type: String,
      required: [true, "Program Cost Type is required"],
      trim: true,
      unique: true, // Keeps Master List clean
    },
    totalAmount: {
      type: Number,
      // Removed 'required: true' so the Master List can save without it
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProgramCost ||
  mongoose.model("ProgramCost", ProgramCostSchema);