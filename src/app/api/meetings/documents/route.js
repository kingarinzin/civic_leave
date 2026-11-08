import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MeetingDocument from "@/models/MeetingDocument";
import User from "@/models/User"; // Added for RBAC
import { getUserPermissions, hasPermission } from "@/lib/rbac"; // Added for RBAC
import { ObjectId } from "mongodb"; // Added for RBAC lookup
import jwt from "jsonwebtoken"; // Added to verify token safely
import fs from "fs";
import path from "path";

// ─── HELPER: Verify User & Permissions ──────────────
async function checkPermission(request, requiredPermission) {
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.split(" ")[1];
  if (!token) return { error: "Unauthorized", status: 401 };

  try {
    // Verify token using your secret
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (typeof decoded === "string" || !decoded.id) {
      return { error: "Invalid token payload", status: 401 };
    }

    // Fetch user from DB (using Mongoose since RBAC uses Mongoose models)
    const user = await User.findById(decoded.id);
    if (!user) return { error: "User not found", status: 404 };

    // Get RBAC Permissions
    const permissions = await getUserPermissions(user);

    // Check permission
    if (!hasPermission(permissions, requiredPermission)) {
      return { error: `Forbidden: Missing ${requiredPermission} permission`, status: 403 };
    }

    return { success: true, user };
  } catch (error) {
    return { error: "Authentication failed", status: 401 };
  }
}

// ─── GET ────────────────────────────────────────────
export async function GET(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const commission = searchParams.get("commission");
    const year = searchParams.get("year");

    const filter = {};
    if (type) filter.document_type = type;
    if (commission) filter.commission = commission;
    if (year) filter.year = year;

    const documents = await MeetingDocument.find(filter)
      .sort({ display_order: 1 })
      .lean();

    return NextResponse.json(documents);
  } catch (error) {
    console.error("GET /api/meetings/documents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ─── POST (upload) ───────────────────────────────────
export async function POST(request) {
  try {
    await connectToDatabase();

    // 🔥 SECURITY CHECK
    const authCheck = await checkPermission(request, "meetings.create");
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const display_order = formData.get("display_order");
    const document_type = formData.get("document_type");
    const commission = formData.get("commission");
    const year = formData.get("year");
    const subject = formData.get("subject");
    const date = formData.get("date");

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }
    if (!document_type) {
      return NextResponse.json({ error: "Document type is required" }, { status: 400 });
    }
    if (!commission) {
      return NextResponse.json({ error: "Commission is required" }, { status: 400 });
    }
    if (!subject || !subject.trim()) {
      return NextResponse.json({ error: "Subject is required" }, { status: 400 });
    }

    let orderNum = 999;
    if (display_order && !isNaN(parseInt(display_order))) {
      orderNum = parseInt(display_order);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const sanitizedName = file.name
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._-]/g, "");
    const filename = `${Date.now()}-${sanitizedName}`;

    // ✅ Save to uploads-data (outside public/)
    const uploadDir = path.join(process.cwd(), "uploads-data/minutes");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(path.join(uploadDir, filename), buffer);

    // Keeping your original uploader logic
    let uploadedByEmail = "";
    let uploadedByName = "";
    try {
      const token = request.headers.get("authorization")?.split(" ")[1];
      if (token) {
        const [, payload] = token.split(".");
        if (payload) {
          const decoded = JSON.parse(atob(payload));
          uploadedByEmail = decoded?.email || "";
          uploadedByName = decoded?.name || "";
        }
      }
    } catch (err) {
      console.log("Could not parse user info");
    }

    const newDoc = await MeetingDocument.create({
      display_order: orderNum,
      date: date || new Date().toISOString().split("T")[0],
      document_type,
      commission,
      year,
      subject,
      file_url: `/api/files/minutes/${filename}`,
      original_filename: file.name,
      uploaded_by_email: uploadedByEmail,
      uploaded_by_name: uploadedByName,
    });

    return NextResponse.json(newDoc, { status: 201 });
  } catch (error) {
    console.error("POST /api/meetings/documents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ─── PUT (update) ────────────────────────────────────
export async function PUT(request) {
  try {
    await connectToDatabase();

    // 🔥 SECURITY CHECK
    const authCheck = await checkPermission(request, "meetings.edit");
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const {
      display_order,
      document_type,
      commission,
      year,
      date,
      subject,
      fileBase64,
      fileName,
      removeExisting,
    } = body;

    const doc = await MeetingDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    if (display_order !== undefined && display_order !== "") {
      const orderNum = parseInt(display_order);
      if (!isNaN(orderNum) && orderNum >= 1) {
        doc.display_order = orderNum;
      }
    }

    if (document_type) doc.document_type = document_type;
    if (commission) doc.commission = commission;
    if (year) doc.year = year;
    if (date) doc.date = date;
    if (subject) doc.subject = subject;

    if (fileBase64 && fileName) {
      // ✅ Delete old file from uploads-data
      const oldRelative = doc.file_url.replace("/api/files/", "");
      const oldPath = path.join(process.cwd(), "uploads-data", oldRelative);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }

      const sanitizedFileName = fileName
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9._-]/g, "");
      const filename = `${Date.now()}-${sanitizedFileName}`;

      const buffer = Buffer.from(fileBase64.split(",")[1], "base64");
      const uploadDir = path.join(process.cwd(), "uploads-data/minutes");
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadDir, filename), buffer);

      doc.file_url = `/api/files/minutes/${filename}`;
      doc.original_filename = fileName;
    } else if (removeExisting) {
      return NextResponse.json(
        { error: "You removed the file but did not upload a new one." },
        { status: 400 }
      );
    }

    await doc.save();
    return NextResponse.json(doc);
  } catch (error) {
    console.error("PUT /api/meetings/documents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

// ─── DELETE ─────────────────────────────────────────
export async function DELETE(request) {
  try {
    await connectToDatabase();

    // 🔥 SECURITY CHECK
    const authCheck = await checkPermission(request, "meetings.delete");
    if (authCheck.error) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const doc = await MeetingDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // ✅ Delete from uploads-data
    const relativePath = doc.file_url.replace("/api/files/", "");
    const filePath = path.join(process.cwd(), "uploads-data", relativePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await doc.deleteOne();
    return NextResponse.json({ message: "Deleted successfully" });
  } catch (error) {
    console.error("DELETE /api/meetings/documents error:", error);
    return NextResponse.json(
      { error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}