import mongoose from "mongoose";

const ProgramCostSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramTitle",
      default: null, // Allows the Master List items to have no programId
    },
    programCostType: {
      type: String,
      required: [true, "Program Cost Type is required"],
      trim: true,
    },
    totalAmount: {
      type: Number,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

// THIS IS THE MAGIC LINE:
// It tells MongoDB: "Only throw an error if BOTH the programId AND programCostType are exactly the same."
ProgramCostSchema.index({ programId: 1, programCostType: 1 }, { unique: true });

export default mongoose.models.ProgramCost ||
  mongoose.model("ProgramCost", ProgramCostSchema);