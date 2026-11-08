import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    password: { type: String, required: true },
    name: { type: String, trim: true },
    signature: { type: String },
    initials: { type: String },
    isAdmin: { type: Boolean, default: false }, // Keep this for Super Admins
    
    // --- NEW RBAC FIELDS ---
    assignedRoleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Role' },
    // -----------------------

    isApproved: { type: Boolean, default: false },
    approvalStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    isActive: { type: Boolean, default: true },
    loginOtp: {
      code: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);