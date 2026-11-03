import mongoose from "mongoose";

const ProgramExpenseSchema = new mongoose.Schema(
  {
    programId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProgramTitle",
      required: true,
    },
    programCostType: {
      type: String,
      required: true,
      trim: true,
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProgramExpense ||
  mongoose.model("ProgramExpense", ProgramExpenseSchema);