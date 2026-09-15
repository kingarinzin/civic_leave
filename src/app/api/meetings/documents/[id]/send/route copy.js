import { NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import MeetingDocument from "@/models/MeetingDocument";
import User from "@/models/user";
import { createTransporter } from "@/lib/mailer";

export async function POST(request, { params }) {
  try {
    await connectToDatabase();
    const { id } = await params;

    const doc = await MeetingDocument.findById(id);
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body. Expected JSON." },
        { status: 400 }
      );
    }

    const { testEmail, departmentIds, divisionIds, userIds } = body;

    // 🔍 DEBUG — what did the frontend send?
    console.log("🔍 SEND DEBUG — received:", JSON.stringify({
      testEmail,
      departmentIds,
      divisionIds,
      userIds,
      types: {
        dept: Array.isArray(departmentIds) ? departmentIds.map(x => typeof x) : typeof departmentIds,
        div: Array.isArray(divisionIds) ? divisionIds.map(x => typeof x) : typeof divisionIds,
        usr: Array.isArray(userIds) ? userIds.map(x => typeof x) : typeof userIds,
      },
    }));

    let recipients = [];
    let isTest = false;
    let filterDescription = "";

    // ─── Build the user filter ────────────────────────
    if (testEmail) {
      // Test mode: single email
      recipients = [testEmail];
      isTest = true;
      filterDescription = "test email";
    } else {
      // ✅ FIXED: match the same "active" rule the recipients tree uses.
      //    Users with missing/null isActive are treated as active.
      const filter = { isActive: { $ne: false } };

      const hasDeptFilter = Array.isArray(departmentIds) && departmentIds.length > 0;
      const hasDivFilter = Array.isArray(divisionIds) && divisionIds.length > 0;
      const hasUserFilter = Array.isArray(userIds) && userIds.length > 0;

      if (hasUserFilter) {
        // Individual users — find by _id
        filter._id = { $in: userIds.map((id) => new mongoose.Types.ObjectId(id)) };
        filterDescription = `${userIds.length} individual(s)`;
      } else if (hasDeptFilter || hasDivFilter) {
        const orConditions = [];
        if (hasDeptFilter) {
          orConditions.push({
            departmentId: {
              $in: departmentIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          });
        }
        if (hasDivFilter) {
          orConditions.push({
            divisionId: {
              $in: divisionIds.map((id) => new mongoose.Types.ObjectId(id)),
            },
          });
        }
        filter.$or = orConditions;

        const parts = [];
        if (hasDeptFilter) parts.push(`${departmentIds.length} department(s)`);
        if (hasDivFilter) parts.push(`${divisionIds.length} division(s)`);
        filterDescription = parts.join(" + ");
      } else {
        filterDescription = "all users";
      }

      // 🔍 DEBUG — what query are we running?
      console.log("🔍 SEND DEBUG — filter:", JSON.stringify(filter));

      const users = await User.find(filter).select("email").lean();

      // 🔍 DEBUG — how many matched?
      console.log("🔍 SEND DEBUG — users matched:", users.length);

      recipients = users
        .filter((u) => u.email && u.email.includes("@"))
        .map((u) => u.email);

      if (recipients.length === 0) {
        return NextResponse.json(
          { error: "No users match the selected filters" },
          { status: 404 }
        );
      }
    }

    // ─── Email content ────────────────────────────────
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.acc.org.bt";
    const viewLink = `${appUrl}/dashboard/meetings`;
    const downloadLink = `${appUrl}${doc.file_url}`;

    const emailSubject = `📄 New Meeting Minutes: ${doc.subject}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; color: #333; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #1a56db; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; }
          .details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
          .btn { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .btn-download { background: #16a34a; }
          .footer { margin-top: 20px; font-size: 12px; color: #6b7280; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 20px; }
          .test-badge { background: #f59e0b; color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; display: inline-block; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2>📄 New Meeting Minutes Uploaded</h2>
            ${isTest ? '<p><span class="test-badge">🧪 TEST EMAIL</span></p>' : ""}
          </div>
          <div class="content">
            <p>Dear Team,</p>
            <p>A new document has been uploaded to the Meeting Minutes system.</p>

            <div class="details">
              <p><strong>📌 Document Type:</strong> ${doc.document_type}</p>
              <p><strong>🏢 Commission:</strong> ${doc.commission}</p>
              <p><strong>📅 Year:</strong> ${doc.year}</p>
              <p><strong>📝 Subject:</strong> ${doc.subject}</p>
              <p><strong>📆 Date:</strong> ${new Date(doc.date).toLocaleDateString()}</p>
              ${doc.original_filename ? `<p><strong>📎 File:</strong> ${doc.original_filename}</p>` : ""}
            </div>

            <p style="text-align: center;">
              <a href="${viewLink}" class="btn">📂 View All Documents</a>
              <a href="${downloadLink}" class="btn btn-download" target="_blank">⬇️ Download PDF</a>
            </p>

            <p style="text-align: center; font-size: 14px; color: #6b7280;">
              You can view and download this document from your dashboard.
            </p>
            ${isTest ? '<p style="text-align: center; font-size: 14px; color: #f59e0b;">🔹 This is a test email. No action needed.</p>' : ""}
          </div>
          <div class="footer">
            <p>This email was sent automatically. Please do not reply.</p>
            <p>© ${new Date().getFullYear()} Anti-Corruption Commission</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
New Meeting Minutes Uploaded
${isTest ? "🧪 TEST EMAIL" : ""}

Document Type: ${doc.document_type}
Commission: ${doc.commission}
Year: ${doc.year}
Subject: ${doc.subject}
Date: ${new Date(doc.date).toLocaleDateString()}

View: ${viewLink}
Download: ${downloadLink}

---
Anti-Corruption Commission
${isTest ? "\n🔹 This is a test email. No action needed." : ""}
    `;

    // ─── Send emails ──────────────────────────────────
    const transporter = createTransporter();
    const results = [];

    const batchSize = isTest ? 1 : 10;

    for (let i = 0; i < recipients.length; i += batchSize) {
      const batch = recipients.slice(i, i + batchSize);

      for (const email of batch) {
        try {
          await transporter.sendMail({
            from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
            to: email,
            subject: emailSubject,
            html: emailHtml,
            text: emailText,
          });
          results.push({ email, status: "sent" });
        } catch (err) {
          console.error(`❌ Failed to send to ${email}:`, err.message);
          results.push({ email, status: "failed", error: err.message });
        }
      }

      if (!isTest && i + batchSize < recipients.length) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    const sentCount = results.filter((r) => r.status === "sent").length;
    const failedCount = results.filter((r) => r.status === "failed").length;

    return NextResponse.json({
      message: isTest
        ? `Test email ${sentCount > 0 ? "sent" : "failed"} to ${testEmail}`
        : `Email sent to ${sentCount} users (${filterDescription})${failedCount > 0 ? `, ${failedCount} failed` : ""}`,
      results,
      total: recipients.length,
      sent: sentCount,
      failed: failedCount,
      isTest,
    });
  } catch (error) {
    console.error("Send document email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send emails" },
      { status: 500 }
    );
  }
}