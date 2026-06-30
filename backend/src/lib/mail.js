const nodemailer = require('nodemailer');

let transporter;

function isSmtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function getTransporter() {
  if (transporter !== undefined) return transporter;

  if (!isSmtpConfigured()) {
    transporter = null;
    return transporter;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return transporter;
}

async function sendMail({ to, subject, text, html }) {
  const from =
    process.env.SMTP_FROM || process.env.SMTP_USER || '911 Nurse Care <noreply@localhost>';

  const transport = getTransporter();
  if (!transport) {
    console.log(`[mail] SMTP not configured — email NOT sent to ${to}`);
    console.log(`[mail] Subject: ${subject}`);
    console.log(`[mail] Body:\n${text}`);
    return { delivered: false, mode: 'console' };
  }

  try {
    await transport.sendMail({ from, to, subject, text, html });
    console.log(`[mail] Sent "${subject}" to ${to}`);
    return { delivered: true, mode: 'smtp' };
  } catch (err) {
    console.error(`[mail] Failed to send to ${to}:`, err.message);
    return { delivered: false, mode: 'smtp_error', error: err.message };
  }
}

module.exports = { sendMail, isSmtpConfigured };
