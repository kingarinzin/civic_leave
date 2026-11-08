import mongoose from "mongoose";

const PermissionSchema = new mongoose.Schema({
  module: { type: String, required: true }, // e.g., "Meetings", "HRS"
  action: { type: String, required: true }, // e.g., "Create", "Edit"
  key: { type: String, required: true, unique: true }, // e.g., "meetings.create"
  description: { type: String },
});

export default mongoose.models.Permission || mongoose.model("Permission", PermissionSchema);