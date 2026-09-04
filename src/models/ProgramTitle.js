import mongoose from "mongoose";

const ProgramTitleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    locationCategory: {
      type: String,
      enum: ["Ex-Country", "In-Country"],
      required: true,
    },
    trainingGroup: {
      type: String,
      enum: ["STT - Short Term Training", "LTT - Long Term Training"],
      required: true,
    },
    trainingType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TrainingType",
      required: true,
    },
    trainingId: {
      type: String,
      unique: true,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.ProgramTitle ||
  mongoose.model("ProgramTitle", ProgramTitleSchema);