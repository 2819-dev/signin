"use strict";

const REQUEST_TIMEOUT_SECONDS = 60;

async function ensureTimedOutStatusAllowed(sql) {
  // Expand the visitor_requests status check to allow timed_out.
  // Constraint names can vary, so drop known names then re-add.
  try {
    await sql`
      ALTER TABLE visitor_requests
      DROP CONSTRAINT IF EXISTS visitor_requests_status_check
    `;
  } catch (_) {}
  try {
    await sql`
      ALTER TABLE visitor_requests
      ADD CONSTRAINT visitor_requests_status_check
      CHECK (status IN ('pending', 'admitted', 'declined', 'timed_out'))
    `;
  } catch (_) {
    // Already present / concurrent migrate — safe to ignore.
  }
}

async function expireTimedOutRequests(sql, { id = null } = {}) {
  await ensureTimedOutStatusAllowed(sql);
  const cutoff = new Date(Date.now() - REQUEST_TIMEOUT_SECONDS * 1000).toISOString();

  if (id) {
    const rows = await sql`
      UPDATE visitor_requests
      SET status = 'timed_out',
          decline_reason = 'Request timed out',
          resolved_at = NOW()
      WHERE id = ${id}
        AND status = 'pending'
        AND created_at <= ${cutoff}::timestamptz
      RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
    `;
    return rows;
  }

  const rows = await sql`
    UPDATE visitor_requests
    SET status = 'timed_out',
        decline_reason = 'Request timed out',
        resolved_at = NOW()
    WHERE status = 'pending'
      AND created_at <= ${cutoff}::timestamptz
    RETURNING id, name, reason, status, decline_reason, urgent, created_at, resolved_at
  `;
  return rows;
}

module.exports = {
  REQUEST_TIMEOUT_SECONDS,
  ensureTimedOutStatusAllowed,
  expireTimedOutRequests,
};
