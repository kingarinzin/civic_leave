import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import MeetingDocument from "@/models/MeetingDocument";
import User from "@/models/user";
import { createTransporter } from "@/lib/mailer";

// ─── SEND EMAILS IN BACKGROUND ──────────────────────
async function sendEmailsInBackground(recipients, doc, isTest) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.acc.org.bt";
  const viewLink = `${appUrl}/dashboard/meetings`;
  const downloadLink = `${appUrl}${doc.file_url}`;

  const emailSubject = `📄 New Meeting Minutes Uploaded: ${doc.subject}`;

  // ─── UPDATED EMAIL HTML (No Header, No Button Backgrounds) ──────────
  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>New Meeting Minutes</title>
      <style>
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          background-color: #f6f9fc;
          margin: 0;
          padding: 0;
          -webkit-font-smoothing: antialiased;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
          background-color: #ffffff;
          border-radius: 8px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }
        .header {
          padding: 20px 20px 10px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 600;
          color: #1e3a8a;
          letter-spacing: 0.5px;
        }
        .header .test-badge {
          display: inline-block;
          margin-top: 10px;
          background: #f59e0b;
          color: white;
          padding: 4px 16px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 20px 25px 30px 25px;
          background: #ffffff;
        }
        .greeting {
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 20px;
        }
        .greeting strong {
          color: #111827;
        }
        .intro-text {
          color: #4b5563;
          font-size: 15px;
          line-height: 1.6;
          margin-bottom: 25px;
        }
        .intro-text a {
          color: #1a56db;
          text-decoration: none;
        }
        .intro-text a:hover {
          text-decoration: underline;
        }
        .details-table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: #ffffff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e5e7eb;
        }
        .details-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #e5e7eb;
          font-size: 14px;
        }
        .details-table tr:last-child td {
          border-bottom: none;
        }
        .details-table .label {
          font-weight: 600;
          color: #4b5563;
          width: 40%;
          background: #f9fafb;
        }
        .details-table .value {
          color: #1f2937;
          background: #ffffff;
        }
        .file-section {
          margin: 20px 0;
          padding: 16px 20px;
          background: #f3f4f6;
          border-radius: 8px;
          border-left: 4px solid #1a56db;
        }
        .file-section .file-label {
          font-weight: 600;
          color: #4b5563;
          font-size: 13px;
          display: block;
          margin-bottom: 4px;
        }
        .file-section .file-name {
          color: #1f2937;
          font-size: 15px;
          word-break: break-all;
        }
        .file-section .file-name a {
          color: #1a56db;
          text-decoration: none;
        }
        .file-section .file-name a:hover {
          text-decoration: underline;
        }
        .actions {
          text-align: center;
          margin: 30px 0 20px;
        }
        /* ─── NO BACKGROUND ON BUTTONS ─── */
        .btn {
          display: inline-block;
          padding: 10px 24px;
          color: #1a56db;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 600;
          font-size: 14px;
          border: 1px solid #1a56db;
          transition: background 0.2s;
          margin: 5px;
          background: transparent;
        }
        .btn:hover {
          background: #f3f4f6;
        }
        /* ─── Download Button ─── */
        .btn-download {
          color: #16a34a;
          border-color: #16a34a;
        }
        .btn-download:hover {
          background: #f0fdf4;
        }
        .test-note {
          text-align: center;
          margin: 20px 0 10px;
          padding: 12px;
          background: #fef3c7;
          border-radius: 6px;
          border-left: 4px solid #f59e0b;
          color: #92400e;
          font-size: 13px;
        }
        .test-note strong {
          color: #78350f;
        }
        .footer {
          padding: 20px 25px;
          border-top: 1px solid #e5e7eb;
          text-align: center;
          font-size: 12px;
          color: #9ca3af;
          background: #fafafa;
          border-radius: 0 0 8px 8px;
        }
        .footer .company {
          font-weight: 600;
          color: #6b7280;
        }
        .footer .auto-note {
          margin-top: 5px;
          color: #9ca3af;
        }
        @media only screen and (max-width: 480px) {
          .container { padding: 10px; }
          .content { padding: 15px; }
          .details-table td { padding: 10px 12px; font-size: 13px; }
          .btn { display: block; margin: 10px auto; width: 80%; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- Header (No Background) -->
        <div class="header">
          <h1>📄 New Meeting Minutes</h1>
          ${isTest ? '<div class="test-badge">🧪 TEST EMAIL</div>' : ''}
        </div>

        <!-- Content -->
        <div class="content">
          <p class="greeting">Dear Team,</p>
          <p class="intro-text">
            A new document has been uploaded to the <strong>Meeting Minutes</strong> system.
            Please review the details below.
          </p>

          <!-- Details Table -->
          <table class="details-table">
            <tr>
              <td class="label">📌 Document Type</td>
              <td class="value">${doc.document_type}</td>
            </tr>
            <tr>
              <td class="label">🏢 Commission</td>
              <td class="value">${doc.commission}</td>
            </tr>
            <tr>
              <td class="label">📅 Year</td>
              <td class="value">${doc.year}</td>
            </tr>
            <tr>
              <td class="label">📝 Subject</td>
              <td class="value">${doc.subject}</td>
            </tr>
            <tr>
              <td class="label">📆 Date</td>
              <td class="value">${new Date(doc.date).toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}</td>
            </tr>
          </table>

          <!-- File Section -->
          <div class="file-section">
            <span class="file-label">📎 Attached File</span>
            <div class="file-name">
              <a href="${downloadLink}" target="_blank">${doc.original_filename || doc.file_url.split('/').pop()}</a>
            </div>
          </div>

          <!-- Action Buttons (No Background) -->
          <div class="actions">
            <a href="${viewLink}" class="btn">📂 View All Documents</a>
            <a href="${downloadLink}" class="btn btn-download" target="_blank">⬇️ Download PDF</a>
          </div>

          <!-- Test Note -->
          ${isTest ? `
            <div class="test-note">
              <strong>🧪 This is a test email.</strong> No action is required.
            </div>
          ` : ''}
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="company">© ${new Date().getFullYear()} Anti-Corruption Commission</div>
          <div class="auto-note">This message was sent automatically. Please do not reply directly to this email.</div>
        </div>
      </div>
    </body>
    </html>
  `;

  const emailText = `
New Meeting Minutes Uploaded
${isTest ? '🧪 TEST EMAIL' : ''}

Dear Team,

A new document has been uploaded to the Meeting Minutes system.

Document Details:
- Document Type: ${doc.document_type}
- Commission: ${doc.commission}
- Year: ${doc.year}
- Subject: ${doc.subject}
- Date: ${new Date(doc.date).toLocaleDateString('en-GB')}

File: ${doc.original_filename || doc.file_url.split('/').pop()}

View All Documents: ${viewLink}
Download PDF: ${downloadLink}

---
© ${new Date().getFullYear()} Anti-Corruption Commission
This message was sent automatically. Please do not reply directly to this email.
${isTest ? '\n🧪 This is a test email. No action is required.' : ''}
  `;

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
        console.log(`✅ Email sent to: ${email}`);
      } catch (err) {
        console.error(`❌ Failed to send to ${email}:`, err.message);
        results.push({ email, status: "failed", error: err.message });
      }
    }

    if (!isTest && i + batchSize < recipients.length) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return results;
}

// ─── MAIN POST HANDLER ──────────────────────────────
export async function POST(request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Document ID is required" }, { status: 400 });
    }

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

    const { testEmail } = body;

    let recipients = [];
    let isTest = false;

    if (testEmail) {
      recipients = [testEmail];
      isTest = true;
    } else {
      const users = await User.find({ isActive: true });
      recipients = users
        .filter(user => user.email && user.email.includes('@'))
        .map(user => user.email);

      if (recipients.length === 0) {
        return NextResponse.json(
          { error: "No users with valid email addresses found" },
          { status: 404 }
        );
      }
    }

    // ─── SEND EMAILS IN BACKGROUND ──────────────────
    if (!isTest) {
      setImmediate(() => {
        sendEmailsInBackground(recipients, doc, isTest)
          .then(results => {
            console.log(`✅ Bulk email complete: ${results.filter(r => r.status === 'sent').length} sent`);
          })
          .catch(err => {
            console.error('❌ Bulk email failed:', err);
          });
      });

      return NextResponse.json({
        message: `Email notifications are being sent to ${recipients.length} users in the background.`,
        total: recipients.length,
        status: "processing",
      });
    } else {
      const results = await sendEmailsInBackground(recipients, doc, isTest);
      const sentCount = results.filter(r => r.status === "sent").length;
      const failedCount = results.filter(r => r.status === "failed").length;

      return NextResponse.json({
        message: `Test email ${sentCount > 0 ? 'sent' : 'failed'} to ${testEmail}`,
        results,
        total: recipients.length,
        sent: sentCount,
        failed: failedCount,
        isTest,
      });
    }

  } catch (error) {
    console.error("Send document email error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to send emails" },
      { status: 500 }
    );
  }
}