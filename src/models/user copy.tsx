import { ObjectId } from "mongodb";

export interface User {
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
  createdAt: Date;
  loginOtp?: {
    code: string;
    expiresAt: Date;
    attempts: number;
  };
}