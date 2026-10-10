// lib/mailer.ts
import nodemailer from "nodemailer";

export function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
}

export async function sendMail(payload: {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string | string[];
  bcc?: string | string[];
}): Promise<boolean> {
  try {
    const transporter = createTransporter();
    const to = Array.isArray(payload.to) ? payload.to.join(",") : payload.to;
    const cc = payload.cc
      ? Array.isArray(payload.cc) ? payload.cc.join(",") : payload.cc
      : undefined;
    const bcc = payload.bcc
      ? Array.isArray(payload.bcc) ? payload.bcc.join(",") : payload.bcc
      : undefined;

    await transporter.sendMail({
      from: `ACC Room Booking <${process.env.EMAIL_USER}>`,
      to,
      cc,
      bcc,
      subject: payload.subject,
      html: payload.html,
    });
    return true;
  } catch (err) {
    console.error("[MAILER ERROR]", err);
    return false;
  }
}