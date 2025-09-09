import nodemailer from 'nodemailer';

let cachedTransporter = null;

async function getTransporter() {
  if (cachedTransporter) return cachedTransporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    throw new Error('EMAIL_USER and EMAIL_PASS are required for Gmail SMTP');
  }
  // Explicit Gmail SMTP; some environments fail with service:'gmail'
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass },
  });
  // Verify credentials/connection upfront for clearer errors
  try {
    await transporter.verify();
  } catch (err) {
    // Common causes: wrong app password, 2FA not enabled, account blocked suspicious login
    console.error('[mail] transporter.verify failed:', err?.message || err);
    throw err;
  }
  cachedTransporter = transporter;
  return cachedTransporter;
}

export const sendOtpMail = async (to, otp) => {
  const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
  const mailOptions = {
    from: fromAddr,
    to,
    subject: 'Your OTP for Signup',
    html: `<h2>Your OTP is: <b>${otp}</b></h2><p>This OTP is valid for 10 minutes.</p>`
  };
  try {
    const transporter = await getTransporter();
    await transporter.sendMail(mailOptions);
  } catch (err) {
    // Reset cache so next attempt can re-verify or pick up updated creds
    cachedTransporter = null;
    console.error('[mail] sendMail failed:', err?.message || err);
    // Rethrow to let controller surface a generic error (no secrets)
    throw err;
  }
};
