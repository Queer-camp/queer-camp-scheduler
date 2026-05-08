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
      scheduleUrl,
      "",
      "Bookmark it — you'll use it to view and update your workshop selections.",
      "",
      "See you at camp!",
      "— The Queer Camp Team",
    ].join("\n"),
    html: `
      <p>Hi ${displayName},</p>
      <p>Here's your personal Queer Camp schedule link:</p>
      <p><a href="${scheduleUrl}">${scheduleUrl}</a></p>
      <p>Bookmark it — you'll use it to view and update your workshop selections.</p>
      <p>See you at camp!<br>— The Queer Camp Team</p>
    `.trim(),
  });
}
