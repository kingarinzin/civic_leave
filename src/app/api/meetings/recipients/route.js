import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

// 🔑 Keep this list in sync with `meetingsAllowedEmails` in page.tsx
const RECIPIENTS_ALLOWED_EMAILS = [
  "kwangmo@acc.org.bt",
  "karamawang@acc.org.bt",
  "skhando@acc.org.bt",
];

function decodeToken(token) {
  try {
    const [, payload] = token.split(".");
    if (!payload) return null;
    const decoded = JSON.parse(
      Buffer.from(payload, "base64").toString("utf8")
    );
    return typeof decoded === "object" ? decoded : null;
  } catch {
    return null;
  }
}

export async function GET(req) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decoded = decodeToken(token);
    if (!decoded) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const email = typeof decoded.email === "string" ? decoded.email : "";
    if (!email) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const isAdmin = decoded.isAdmin === true || decoded.role === "Admin";
    const isWhitelisted = RECIPIENTS_ALLOWED_EMAILS.includes(email);

    if (!isAdmin && !isWhitelisted) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const client = await clientPromise;
    const db = client.db("civic_leave_db");

    const [rawUsers, departments, divisions] = await Promise.all([
      db
        .collection("users")
        .find(
          { isActive: { $ne: false } },
          {
            projection: {
              name: 1,
              email: 1,
              departmentId: 1,
              divisionId: 1,
              isActive: 1,
            },
          }
        )
        .toArray(),
      db
        .collection("departments")
        .find({}, { projection: { name: 1 } })
        .toArray(),
      db
        .collection("divisions")
        .find({}, { projection: { name: 1 } })
        .toArray(),
    ]);

    const users = rawUsers.map((u) => {
      const dept = departments.find(
        (d) => d._id.toString() === (u.departmentId || "").toString()
      );
      const div = divisions.find(
        (d) => d._id.toString() === (u.divisionId || "").toString()
      );

      return {
        _id: u._id.toString(),
        name: u.name || "",
        email: u.email || "",
        departmentName: dept ? dept.name : "",
        divisionName: div ? div.name : "",
        isActive: u.isActive !== undefined ? u.isActive : true,
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Recipients endpoint error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}