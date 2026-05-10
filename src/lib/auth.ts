// Auth config - OTP-based magic link authentication
// In production, replace console.log with real email delivery (Resend, SendGrid, etc.)

export const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const SESSION_EXPIRY_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}