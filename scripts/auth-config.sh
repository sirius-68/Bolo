#!/usr/bin/env bash
# Sign-in settings of a Supabase project, set through the Management API (needs SUPABASE_ACCESS_TOKEN).
#   scripts/auth-config.sh <project-ref> [staging]
# - emails carry a 6-digit code (not a link): supabase/auth/email.json
# - staging only: new accounts are confirmed at once, so automatic tests can sign up
# - when BREVO_API_KEY is set: phone numbers get their code by SMS through the send-sms function
set -euo pipefail
REF=$1
MODE=${2:-}
API="https://api.supabase.com/v1/projects/$REF/config/auth"

patch() {
  local code
  code=$(curl -sS -o /tmp/auth.json -w '%{http_code}' -X PATCH "$API" \
    -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' -d "$1")
  if [ "$code" != "200" ]; then
    echo "auth settings: HTTP $code $(jq -r '.message // empty' /tmp/auth.json 2>/dev/null | head -c 300)"
    return 1
  fi
}

body=$(jq -c . supabase/auth/email.json)
[ "$MODE" = "staging" ] && body=$(jq -c '. + {mailer_autoconfirm: true}' <<<"$body")
patch "$body"
echo "Email codes are set. Current sign-in settings (no secrets):"
jq '{external_email_enabled, mailer_autoconfirm, mailer_otp_length, smtp_host, smtp_sender_name, rate_limit_email_sent, external_phone_enabled, sms_provider, hook_send_sms_enabled, site_url}' /tmp/auth.json

if [ -n "${BREVO_API_KEY:-}" ]; then
  HOOK="v1,whsec_$(openssl rand -base64 32)"
  echo "::add-mask::$HOOK"
  supabase secrets set --yes --project-ref "$REF" "BREVO_API_KEY=$BREVO_API_KEY" "SEND_SMS_HOOK_SECRET=$HOOK" "SMS_SENDER=${SMS_SENDER:-bolo}"
  sms=$(jq -nc --arg uri "https://$REF.supabase.co/functions/v1/send-sms" --arg s "$HOOK" \
    '{external_phone_enabled: true, hook_send_sms_enabled: true, hook_send_sms_uri: $uri, hook_send_sms_secrets: $s}')
  if patch "$sms"; then
    echo "SMS codes are on (Brevo)."
  else
    echo "::warning::Could not switch on SMS codes for $REF"
  fi
else
  echo "BREVO_API_KEY is not set: codes by SMS stay off."
fi
