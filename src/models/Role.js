import mongoose from "mongoose";

const RoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  isSystemRole: { type: Boolean, default: false }, // Protects "Admin" and "Officer"
  permissions: [{ type: String }], // The functional permissions
  
  // NEW: The Delegation Scope
  manageableModules: [{ type: String }], // e.g., ["Meetings"] or ["*"] for Super Admin
});

export default mongoose.models.Role || mongoose.model("Role", RoleSchema);