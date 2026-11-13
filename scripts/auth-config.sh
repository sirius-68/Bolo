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

# Email templates can only be changed when the project sends email through its own SMTP (e.g. Brevo).
if patch "$(jq -c . supabase/auth/email.json)"; then
  echo "Emails now carry a 6-digit code."
else
  echo "::warning::Email templates not changed for $REF (set up custom SMTP in Supabase → Authentication → Emails first)"
fi
if [ "$MODE" = "staging" ]; then
  patch '{"mailer_autoconfirm": true}'
  echo "Staging: new accounts are confirmed at once (for automatic tests)."
fi
patch '{"mailer_otp_length": 6}' || true
echo "Current sign-in settings (no secrets):"
jq '{external_email_enabled, mailer_autoconfirm, mailer_otp_length, smtp_host, smtp_sender_name, rate_limit_email_sent, external_phone_enabled, sms_provider, hook_send_sms_enabled, site_url}' /tmp/auth.json

if [ -n "${BREVO_API_KEY:-}" ]; then
  # Free check with Brevo: is the key valid, and are there SMS credits? (prints only the plan, never the account email)
  bcode=$(curl -sS -o /tmp/brevo.json -w '%{http_code}' https://api.brevo.com/v3/account -H "api-key: $BREVO_API_KEY" -H 'Accept: application/json' || true)
  BREVO_OK=""
  if [ "$bcode" = "200" ]; then
    BREVO_OK=1
    echo "Brevo key works. Plan and credits:"
    jq -c '[.plan[]? | {type, creditsType, credits}]' /tmp/brevo.json
    sms=$(jq '[.plan[]? | select(.type == "sms") | .credits] | add // 0' /tmp/brevo.json)
    [ "${sms%.*}" -gt 0 ] 2>/dev/null || echo "::warning::Brevo has no SMS credits yet: texts will be refused until you add some"
  else
    echo "::warning::Brevo did not accept BREVO_API_KEY (HTTP $bcode: $(jq -r '.code // .message // empty' /tmp/brevo.json 2>/dev/null | head -c 120)). Use an API key that starts with xkeysib-"
  fi
  rm -f /tmp/brevo.json
  if [ -n "$BREVO_OK" ]; then
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
    # a key Brevo refuses: keep phone codes off so the app doesn't offer them
    patch '{"external_phone_enabled": false, "hook_send_sms_enabled": false}' && echo "SMS codes stay off until the Brevo key works."
  fi
else
  echo "BREVO_API_KEY is not set: codes by SMS stay off."
fi
