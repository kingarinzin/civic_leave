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
    // ✅ NEW — permission list for this document type.
    //    Empty by default → nobody except Admin can manage it.
    //    During rollout we treat "empty" as backward-compatible
    //    (see RECIPIENTS / documents routes for how that's applied).
    allowed: {
      emails: {
        type: [String],
        default: [],
      },
      divisions: {
        type: [String],
        default: [],
      },
      departments: {
        type: [String],
        default: [],
      },
      roles: {
        type: [String],
        default: [],
      },
    },
  },
  { timestamps: true }
);

export default mongoose.models.DocumentType ||
  mongoose.model("DocumentType", DocumentTypeSchema);