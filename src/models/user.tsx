import mongoose, { ObjectId } from "mongoose";

// ─── Keep your existing interface ──────────────────
export interface IUser {
  _id?: ObjectId;
  email: string;
  password: string;
  name?: string;
  signature?: string;
  initials?: string;
  isAdmin?: boolean;
  isApproved?: boolean;
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  approvedBy?: ObjectId;
  approvedAt?: Date;
  isActive?: boolean;
  createdAt?: Date;
  loginOtp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
}

// ─── ADD THIS: Mongoose Schema ─────────────────────
const UserSchema = new mongoose.Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    name: {
      type: String,
      trim: true,
    },
    signature: {
      type: String,
    },
    initials: {
      type: String,
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: false,
    },
    approvalStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    loginOtp: {
      code: { type: String },
      expiresAt: { type: Date },
      attempts: { type: Number, default: 0 },
    },
  },
  { 
    timestamps: true 
  }
);

// ─── ADD THIS: Export the Mongoose model ──────────
export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema);