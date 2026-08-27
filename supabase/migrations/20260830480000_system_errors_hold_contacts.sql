-- ============================================================================
-- Migration: system_errors may hold the address that failed
-- Date: 2026-08-27
--
-- 20260826090000 created this table with a comment forbidding contact data in
-- `detail`. Nothing enforced it and sendEmail never followed it — every
-- email_send_failed row already carries the recipient.
--
-- The rule is reversed here rather than enforced, on Farjad's call, because
-- of what the table is FOR. Support arrives as "someone says signup is
-- broken"; a failure row that cannot be tied to the person who reported it
-- answers nothing. The address is the join key between a complaint and a log
-- line.
--
-- What stays forbidden is the payload: no message bodies, no verification
-- codes, no passwords. A code in here would be a code readable by anyone with
-- panel access, which is the same failure the plaintext `code` column was
-- dropped for in 20260824090000.
--
-- No data change — this is a comment, and comments are the only place a rule
-- like this was ever written down.
-- ============================================================================

comment on column public.system_errors.detail is
  'Free-form context for diagnosis. May include the email address or phone
   number a delivery was attempted against — that is what ties a failure to a
   support report. Never the message body, a verification code, or a secret.';

comment on table public.system_errors is
  'Failures the product swallowed on purpose. Written by reportQuietFailure,
   read by /admin/health.';
