import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendAdminLoginLink({
  to,
  loginUrl,
}: {
  to: string;
  loginUrl: string;
}) {
  await transporter.sendMail({
    from: `Queer Camp <${process.env.SMTP_USER}>`,
    to,
    subject: "Queer Camp admin login link",
    text: [
      "Here's your Queer Camp admin login link (expires in 15 minutes):",
      "",
      `<${loginUrl}>`,
      "",
      "If you didn't request this, you can ignore it.",
      "— The Queer Camp Team",
    ].join("\n"),
    html: `
      <p>Here's your Queer Camp admin login link (expires in 15 minutes):</p>
      <p><a href="${loginUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">Log in to admin</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link into your browser:<br>${loginUrl}</p>
      <p>If you didn't request this, you can ignore it.<br>— The Queer Camp Team</p>
    `.trim(),
  });
}

export async function sendAdminInvite({
  to,
  name,
  inviteUrl,
  invitedBy,
}: {
  to: string;
  name: string;
  inviteUrl: string;
  invitedBy: string;
}) {
  await transporter.sendMail({
    from: `Queer Camp <${process.env.SMTP_USER}>`,
    to,
    subject: "You're invited to help manage Queer Camp",
    text: [
      `Hi ${name},`,
      "",
      `${invitedBy} has invited you to be an admin for Queer Camp.`,
      "",
      "Click the link below to accept your invitation and log in (expires in 48 hours):",
      "",
      `<${inviteUrl}>`,
      "",
      "— The Queer Camp Team",
    ].join("\n"),
    html: `
      <p>Hi ${name},</p>
      <p>${invitedBy} has invited you to be an admin for Queer Camp.</p>
      <p><a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">Accept invitation</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link into your browser:<br>${inviteUrl}</p>
      <p style="font-size:12px;color:#666;">This link expires in 48 hours.</p>
      <p>— The Queer Camp Team</p>
    `.trim(),
  });
}

export async function sendScheduleLink({
  to,
  displayName,
  scheduleUrl,
}: {
  to: string;
  displayName: string;
  scheduleUrl: string;
}) {
  await transporter.sendMail({
    from: `Queer Camp <${process.env.SMTP_USER}>`,
    to,
    subject: "Your Queer Camp schedule link",
    text: [
      `Hi ${displayName},`,
      "",
      "Here's your personal Queer Camp schedule link:",
      "",
      `<${scheduleUrl}>`,
      "",
      "Bookmark it — you'll use it to view and update your workshop selections.",
      "",
      "See you at camp!",
      "— The Queer Camp Team",
    ].join("\n"),
    html: `
      <p>Hi ${displayName},</p>
      <p>Here's your personal Queer Camp schedule link:</p>
      <p><a href="${scheduleUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:4px;font-weight:bold;">View your schedule</a></p>
      <p style="font-size:12px;color:#666;">Or copy this link into your browser:<br>${scheduleUrl}</p>
      <p>Bookmark it — you'll use it to view and update your workshop selections.</p>
      <p>See you at camp!<br>— The Queer Camp Team</p>
    `.trim(),
  });
}
