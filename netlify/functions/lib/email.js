"use strict";

/**
 * Lightweight outbound email helper (Resend HTTP API).
 * Configure:
 *   RESEND_API_KEY or SYNK_RESEND_API_KEY
 *   SYNK_EMAIL_FROM (e.g. "Synk <noreply@yourdomain.com>")
 */
async function sendEmail({ to, subject, text, html }) {
  const recipient = String(to || "")
    .trim()
    .toLowerCase();
  if (!recipient || !recipient.includes("@")) {
    return { ok: false, skipped: true, error: "Missing recipient" };
  }

  const apiKey = process.env.RESEND_API_KEY || process.env.SYNK_RESEND_API_KEY || "";
  const from =
    process.env.SYNK_EMAIL_FROM ||
    process.env.RESEND_FROM ||
    "Synk <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("email skipped (RESEND_API_KEY not set)", { to: recipient, subject });
    return { ok: false, skipped: true, error: "Email provider not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient],
        subject: String(subject || "Synk").slice(0, 200),
        text: String(text || ""),
        html: html ? String(html) : undefined,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("email send failed", res.status, data);
      return {
        ok: false,
        skipped: false,
        error: (data && (data.message || data.error)) || `Email failed (${res.status})`,
      };
    }
    return { ok: true, id: data.id || null };
  } catch (err) {
    console.error("email send error", err);
    return { ok: false, skipped: false, error: err.message || "Email failed" };
  }
}

function normalizeEmail(value) {
  const email = String(value || "")
    .trim()
    .toLowerCase()
    .slice(0, 160);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

module.exports = { sendEmail, normalizeEmail };
