import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import jwt from "jsonwebtoken";
import { getUserPermissions } from "@/lib/rbac"; // Import the RBAC helper

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.split(" ")[1];
    if (!token)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let decoded: string | jwt.JwtPayload;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET!);
    } catch (jwtErr) {
      console.error("JWT Verification Error:", jwtErr);
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    if (typeof decoded === "string" || !decoded.id) {
      return NextResponse.json(
        { error: "Invalid token payload" },
        { status: 401 },
      );
    }

    const { db } = await connectToDatabase();

    const user = await db.collection("users").findOne(
      { _id: new ObjectId(String(decoded.id)) },
      { projection: { password: 0 } }, // Security: hide password
    );

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const resolvedName =
      typeof user.name === "string" && user.name.trim() ? user.name : "";

    // 👇 NEW RBAC LOGIC 👇
    // 1. Fetch dynamic permissions based on the user's assignedRoleId
    // We pass the raw MongoDB user object to the helper
    const permissions = await getUserPermissions(user);
    // 👆 NEW RBAC LOGIC 👆

    return NextResponse.json({
      ...user,
      name: resolvedName,
      permissions, // 2. Append the permissions array to the response
    });
  } catch (err) {
    console.error("Profile Fetch Error:", err);
    return NextResponse.json({ error: "Fetch failed" }, { status: 500 });
  }
}