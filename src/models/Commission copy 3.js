import mongoose from "mongoose";

const CommissionSchema = new mongoose.Schema(
  {
    commission: {
      type: String,
      required: [true, "Commission is required"],
      unique: true,
      trim: true,
    },
    remarks: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Commission ||
  mongoose.model("Commission", CommissionSchema);