import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { verifyBookingAdmin } from "@/lib/room-booking-auth";

export async function GET(req: NextRequest) {
  try {
    const auth = await verifyBookingAdmin(req);
    if (!auth.valid) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const departments = await db.collection("departments").find({}).toArray();
    const divisions = await db.collection("divisions").find({}).toArray();

    const users = await db.collection("users").find({}).toArray();

    // Filter for Commissioners OR Phuntsholing Office staff
    const filteredUsers = users.filter((u) => {
      const dept = departments.find((d) => d._id.toString() === (u.departmentId || "").toString());
      const div = divisions.find((d) => d._id.toString() === (u.divisionId || "").toString());
      
      const deptName = dept?.name?.toLowerCase() || "";
      const divName = div?.name?.toLowerCase() || "";
      const role = (u.role || "").toLowerCase();

      // 1. Check if they are a Commissioner (or Commission)
      const isCommissioner = role.includes("commission");

      // 2. Check if they belong to Phuntsholing (Phuentsholing)
      const isPhuntsholing = deptName.includes("phuentsholing") || divName.includes("phuentsholing");

      return isCommissioner || isPhuntsholing;
    });

    // Map to include the department/division names for display
    const mappedUsers = filteredUsers.map((u) => {
      const dept = departments.find((d) => d._id.toString() === (u.departmentId || "").toString());
      const div = divisions.find((d) => d._id.toString() === (u.divisionId || "").toString());
      
      return {
        ...u,
        departmentName: dept?.name || "No Dept",
        divisionName: div?.name || "No Div"
      };
    });

    return NextResponse.json({ approvers: mappedUsers });
  } catch (error) {
    console.error("Error fetching approvers:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}