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
      recipients = [testEmail];
      isTest = true;
      filterDescription = "test email";
    } else {
      // ✅ Match the same "active" rule the recipients tree uses.
      const filter = { isActive: { $ne: false } };

      const hasDeptFilter = Array.isArray(departmentIds) && departmentIds.length > 0;
      const hasDivFilter = Array.isArray(divisionIds) && divisionIds.length > 0;
      const hasUserFilter = Array.isArray(userIds) && userIds.length > 0;

      if (hasUserFilter) {
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

      console.log("🔍 SEND DEBUG — filter:", JSON.stringify(filter));

      const users = await User.find(filter).select("email").lean();

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
        <meta charset="utf-8" />
        <style>
          body { margin: 0; padding: 24px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif; color: #111827; }
          .wrap { max-width: 620px; margin: 0 auto; }
          .title { text-align: center; font-size: 24px; font-weight: 700; color: #4338ca; margin: 8px 0 20px 0; }
          .hr { height: 1px; background: #e5e7eb; border: none; margin: 0 0 28px 0; }
          .greeting { font-size: 16px; color: #111827; margin: 0 0 16px 0; }
          .greeting strong { font-weight: 700; }
          .lead { font-size: 16px; color: #111827; margin: 0 0 24px 0; }
          .panel { background: #f3f4f6; border-radius: 12px; padding: 22px 26px; margin-bottom: 26px; }
          .row { display: flex; padding: 6px 0; font-size: 15px; }
          .row .label { width: 150px; flex-shrink: 0; font-weight: 700; color: #111827; }
          .row .value { color: #111827; }
          .divider { height: 1px; background: #e5e7eb; border: none; margin: 0 0 22px 0; }
          .message { border-left: 4px solid #4338ca; padding: 6px 0 6px 16px; margin: 0 0 28px 0; }
          .message .label { font-weight: 700; color: #111827; font-size: 15px; margin: 0 0 4px 0; }
          .message .text { color: #374151; font-size: 15px; margin: 0; }
          .actions { text-align: center; margin: 32px 0 28px 0; }
          .btn { display: inline-block; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600; text-decoration: none; color: #ffffff !important; margin: 0 6px; }
          .btn-approve { background: #4f46e5; }
          .btn-reject { background: #dc2626; }
          .footer { font-size: 13px; color: #6b7280; margin-top: 24px; }
          .footer .brand { color: #6b7280; }
          .test-badge { text-align: center; margin: 4px 0 12px 0; }
          .test-badge span { display: inline-block; background: #fef3c7; color: #92400e; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 600; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <div class="title">New Meeting Minutes</div>
          ${isTest ? '<div class="test-badge"><span>🧪 TEST EMAIL</span></div>' : ""}
          <hr class="hr" />

          <p class="greeting">Hello <strong>Madam/Sir</strong>,</p>
          <p class="lead">A new meeting minutes document has been uploaded to the system.</p>

          <div class="panel">
            <div class="row">
              <div class="label">Document Type</div>
              <div class="value">${doc.document_type || "—"}</div>
            </div>
            <div class="row">
              <div class="label">Subject</div>
              <div class="value">${doc.subject || "—"}</div>
            </div>
            <div class="row">
              <div class="label">Date of Meeting</div>
              <div class="value">${new Date(doc.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</div>
            </div>
            ${doc.original_filename ? `
            <div class="row">
              <div class="label">File</div>
              <div class="value">${doc.original_filename}</div>
            </div>` : ""}
          </div>

          <hr class="divider" />

          <div class="message">
            <p class="label">Message:</p>
            <p class="text">Sharing this for your necessary action.</p>
          </div>

          <div class="actions">
            <a href="${downloadLink}" class="btn btn-approve" target="_blank">Download PDF</a>
            <a href="${viewLink}" class="btn btn-reject">View All Documents</a>
          </div>

          <div class="footer">
            Sent via: <span class="brand">Civic Leave App</span>
          </div>
        </div>
      </body>
      </html>
    `;

    const emailText = `
New Meeting Minutes Uploaded
${isTest ? "🧪 TEST EMAIL" : ""}

Document Type: ${doc.document_type}
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