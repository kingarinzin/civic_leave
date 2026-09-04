import mongoose from "mongoose";

const FundingModalitySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Funding Modality name is required"],
      trim: true,
      unique: true,
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.FundingModality ||
  mongoose.model("FundingModality", FundingModalitySchema);