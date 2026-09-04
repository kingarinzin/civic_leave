// models/TrainingType.js
import mongoose from "mongoose";

const TrainingTypeSchema = new mongoose.Schema(
  {
    trainingType: {
      type: String,
      required: [true, "Training Type is required"],
      trim: true,
      unique: true, // optional
    },
    remarks: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.TrainingType ||
  mongoose.model("TrainingType", TrainingTypeSchema);