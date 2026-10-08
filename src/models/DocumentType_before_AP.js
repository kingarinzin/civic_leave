import mongoose from "mongoose";

const DocumentTypeSchema = new mongoose.Schema(
  {
    documentType: {
      type: String,
      required: [true, "Document Type is required"],
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

export default mongoose.models.DocumentType ||
  mongoose.model("DocumentType", DocumentTypeSchema);