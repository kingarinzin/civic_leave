// lib/room-booking-auth.ts
import jwt from "jsonwebtoken";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";

export type RBUser = {
  userId: string;
  email: string;
  name: string;
  role: string;
  isAdmin: boolean;
  isResident: boolean;
  departmentId?: string;
  divisionId?: string;
};

export type VerifyResult =
  | { valid: true; user: RBUser }
  | { valid: false; error: string; status: number };

/**
 * Verify any authenticated booking user (ACC staff, Resident, Admin).
 */
export async function verifyBookingUser(req: Request): Promise<VerifyResult> {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return { valid: false, error: "No token provided", status: 401 };
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      id: string;
      email: string;
    };

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(decoded.id) });

    if (!user) {
      return { valid: false, error: "User not found", status: 404 };
    }
    if (user.isActive === false) {
      return { valid: false, error: "Account is inactive", status: 403 };
    }

    const resident = await db
      .collection("rb_residents")
      .findOne({ staffId: user._id, status: "ACTIVE" });

    const normalizedEmail = (user.email || "").toLowerCase().trim();
    
    // Add the Room Booking super-admins here
    const roomAdmins = ["kingarinzin@acc.org.bt", "slham@acc.org.bt", "slhamo@acc.org.bt"];
    const isRoomAdminEmail = roomAdmins.includes(normalizedEmail);

    return {
      valid: true,
      user: {
        userId: user._id.toString(),
        email: user.email,
        name: user.name || "",
        role: user.role || "Officer",
        // If they are a room admin email, force isAdmin to true for room booking
        isAdmin: !!user.isAdmin || isRoomAdminEmail, 
        isResident: !!resident,
        departmentId: user.departmentId?.toString(),
        divisionId: user.divisionId?.toString(),
      },
    };
  } catch {
    return { valid: false, error: "Invalid token", status: 401 };
  }
}

/**
 * Verify Admin-only access.
 */
export async function verifyBookingAdmin(req: Request): Promise<VerifyResult> {
  const result = await verifyBookingUser(req);
  if (!result.valid) return result;
  if (!result.user.isAdmin) {
    return { valid: false, error: "Admin access required", status: 403 };
  }
  return result;
}

/**
 * Verify a specific permission (role-based).
 */
export async function verifyPermission(
  req: Request,
  permission: string,
): Promise<VerifyResult> {
  const result = await verifyBookingUser(req);
  if (!result.valid) return result;

  if (result.user.isAdmin) return result;

  const permissionsByRole: Record<string, string[]> = {
    Officer: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.family.register",
      "room.family.view_own",
      "room.ledger.view",
    ],
    DivisionHead: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.family.register",
      "room.family.view_own",
      "room.ledger.view",
      "room.report.view",
    ],
    DepartmentHead: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.family.register",
      "room.family.view_own",
      "room.ledger.view",
      "room.report.view",
    ],
    Commissioner: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.booking.book_for_stakeholder",
      "room.family.register",
      "room.family.view_own",
      "room.approval.approve",
      "room.ledger.view",
      "room.report.view",
    ],
    Chairperson: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.booking.book_for_stakeholder",
      "room.family.register",
      "room.family.view_own",
      "room.approval.approve",
      "room.ledger.view",
      "room.report.view",
    ],
    SecretaryService: [
      "room.booking.view",
      "room.booking.create",
      "room.booking.cancel",
      "room.booking.checkin",
      "room.booking.checkout",
      "room.booking.book_for_family",
      "room.booking.book_for_coagency",
      "room.booking.book_for_stakeholder",
      "room.family.register",
      "room.family.view_own",
      "room.approval.approve",
      "room.ledger.view",
      "room.report.view",
    ],
  };

  const userPerms = permissionsByRole[result.user.role] || [];
  if (!userPerms.includes(permission)) {
    return {
      valid: false,
      error: `Permission denied: ${permission}`,
      status: 403,
    };
  }

  return result;
}

/**
 * Check if staff has any pending bill.
 */
export async function hasPendingBill(staffId: string): Promise<boolean> {
  const client = await clientPromise;
  const db = client.db("civic_leave_db");
  const count = await db.collection("rb_ledger").countDocuments({
    staffId: new ObjectId(staffId),
    status: "UNPAID",
  });
  return count > 0;
}

/**
 * Check if user can book (role + pending bill).
 */
export async function canBook(
  req: Request,
): Promise<
  | { valid: true; user: RBUser }
  | { valid: false; error: string; status: number }
> {
  const auth = await verifyBookingUser(req);
  if (!auth.valid) return auth;

  const allowedRoles = [
    "Officer",
    "DivisionHead",
    "DepartmentHead",
    "Commissioner",
    "Chairperson",
    "SecretaryService",
  ];

  if (!auth.user.isAdmin && !allowedRoles.includes(auth.user.role)) {
    return {
      valid: false,
      error: "Your role is not permitted to book rooms",
      status: 403,
    };
  }

  const pending = await hasPendingBill(auth.user.userId);
  if (pending) {
    return {
      valid: false,
      error: "You have a pending bill. Please settle before booking.",
      status: 403,
    };
  }

  return auth;
}