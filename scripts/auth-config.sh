#!/usr/bin/env bash
# Sign-in settings of a Supabase project, set through the Management API (needs SUPABASE_ACCESS_TOKEN).
#   scripts/auth-config.sh <project-ref> [staging]
# - emails carry a 6-digit code (not a link): supabase/auth/email.json, sent through the project's own SMTP
#   (Brevo). The test server borrows the live server's SMTP settings (SMTP_FROM_REF) when it has none.
#   Last resort, a project with no SMTP at all: the send-email function sends the code through the Brevo API.
# - staging only: new accounts are confirmed at once, so automatic tests can sign up
# - when BREVO_API_KEY is set and Brevo has SMS credits: phone numbers get their code by SMS (send-sms function)
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

# The live server sends its email through Brevo's SMTP. The test server gets the same settings, so its
# emails carry a code too. Copied from one project's settings to the other's: nothing is printed or stored.
CUR=$(curl -sS "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN")
if [ -n "${SMTP_FROM_REF:-}" ] && [ "$SMTP_FROM_REF" != "$REF" ] && [ -z "$(jq -r '.smtp_host // empty' <<< "$CUR")" ]; then
  scode=$(curl -sS -o /tmp/src.json -w '%{http_code}' "https://api.supabase.com/v1/projects/$SMTP_FROM_REF/config/auth" -H "Authorization: Bearer ${SMTP_FROM_TOKEN:-$SUPABASE_ACCESS_TOKEN}")
  SRC=$(cat /tmp/src.json); rm -f /tmp/src.json
  pass=$(jq -r '.smtp_pass // empty' <<< "$SRC" 2>/dev/null || true)
  [ -n "$pass" ] && echo "::add-mask::$pass"
  if [ "$scode" != "200" ]; then
    echo "::warning::Could not read the live server's settings (HTTP $scode: $(jq -r '.message // empty' <<< "$SRC" 2>/dev/null | head -c 200)). The test server's access token may not reach the live project."
  elif [ -z "$(jq -r '.smtp_host // empty' <<< "$SRC")" ]; then
    echo "::warning::The live server has no SMTP settings to copy (fields present: $(jq -r '[keys[] | select(startswith("smtp"))] | join(",")' <<< "$SRC"))"
  elif [ -z "$pass" ] || [[ "$pass" =~ ^[*•]+$ ]]; then
    echo "::warning::Supabase doesn't hand out the live server's SMTP password, so it can't be copied: set SMTP up once on the test server (Supabase → Authentication → Emails → SMTP, same Brevo details as the live server)"
  else
    smtp=$(jq -c '{smtp_host, smtp_port, smtp_user, smtp_pass, smtp_admin_email, smtp_max_frequency} | with_entries(select(.value != null)) + {smtp_sender_name: "getit"}' <<< "$SRC")
    if patch "$smtp"; then echo "The test server now sends email through the same SMTP (Brevo) as the live server."
    else echo "::warning::Could not copy the SMTP settings to $REF"; fi
  fi
  unset pass SRC smtp
fi
# the name people see as the sender
if [ -n "$(jq -r '.smtp_host // empty' <<< "$CUR")" ] && [ "$(jq -r '.smtp_sender_name // empty' <<< "$CUR")" != "getit" ]; then
  patch '{"smtp_sender_name": "getit"}' && echo "Emails come from \"getit\"." || true
fi
unset CUR

# Email templates can only be changed when the project sends email through its own SMTP. Without it
# Supabase refuses (free plan) and its own email is a link, so further down the send-email function takes
# over (through Brevo) and sends the code itself.
TEMPLATES=""
if patch "$(jq -c . supabase/auth/email.json)"; then
  TEMPLATES=1
  echo "Emails now carry a 6-digit code (through the project's own SMTP)."
else
  echo "Supabase's own email templates can't be changed for $REF (free plan without SMTP): codes go out through the send-email function instead."
fi
if [ "$MODE" = "staging" ]; then
  patch '{"mailer_autoconfirm": true}'
  echo "Staging: new accounts are confirmed at once (for automatic tests)."
fi
patch '{"mailer_otp_length": 6}' || true
echo "Current sign-in settings (no secrets):"
jq '{external_email_enabled, mailer_autoconfirm, mailer_otp_length, smtp_host, smtp_sender_name, rate_limit_email_sent, external_phone_enabled, sms_provider, hook_send_sms_enabled, site_url}' /tmp/auth.json

# a key pasted with a space or line break around it still works
BREVO_API_KEY=$(printf '%s' "${BREVO_API_KEY:-}" | tr -d '[:space:]')
MAIL_FROM=$(printf '%s' "${MAIL_FROM:-}" | tr -d '[:space:]')
email_off() {
  patch '{"hook_send_email_enabled": false}' > /dev/null || true
  # with SMTP and the code templates, Supabase's own emails already carry the code
  [ -n "$TEMPLATES" ] || echo "::warning::Sign-in emails for $REF still come from Supabase as a LINK, not a code: $1"
}
if [ -z "$BREVO_API_KEY" ]; then
  email_off "BREVO_API_KEY is not set"
  echo "BREVO_API_KEY is not set: codes by SMS stay off."
  exit 0
fi
case "$BREVO_API_KEY" in xkeysib-*) ;; *) echo "::warning::BREVO_API_KEY doesn't start with xkeysib- (starts with \"${BREVO_API_KEY:0:8}\")";; esac
bre() { curl -sS -o "$1" -w '%{http_code}' "https://api.brevo.com/v3/$2" -H "api-key: $BREVO_API_KEY" -H 'Accept: application/json' "${@:3}" || true; }

# Free check with Brevo: is the key valid, and are there SMS credits? (prints only the plan, never the account email)
bcode=$(bre /tmp/brevo.json account)
if [ "$bcode" != "200" ]; then
  echo "::warning::Brevo did not accept BREVO_API_KEY (HTTP $bcode: $(jq -r '[.code, .message] | map(select(. != null)) | join(" - ")' /tmp/brevo.json 2>/dev/null | head -c 300)). Use an API key that starts with xkeysib-"
  rm -f /tmp/brevo.json
  email_off "Brevo did not accept the key"
  patch '{"external_phone_enabled": false, "hook_send_sms_enabled": false}' && echo "SMS codes stay off (Brevo key missing)."
  exit 0
fi
echo "Brevo key works. Plan and credits:"
jq -c '[.plan[]? | {type, creditsType, credits}]' /tmp/brevo.json
sms=$(jq '[.plan[]? | select(.type == "sms") | .credits] | add // 0' /tmp/brevo.json)
rm -f /tmp/brevo.json
supabase secrets set --yes --project-ref "$REF" "BREVO_API_KEY=$BREVO_API_KEY" > /dev/null

# ---- codes by email without SMTP: the send-email function sends them through the Brevo API ----
if [ -n "$TEMPLATES" ]; then
  # SMTP and the code templates already do it: Supabase sends the emails itself
  patch '{"hook_send_email_enabled": false}' > /dev/null || true
else
  # The "from" address must be a sender Brevo has confirmed. MAIL_FROM (repository variable) picks one;
  # otherwise the first confirmed sender of the Brevo account is used. The address is never printed.
  scode=$(bre /tmp/senders.json senders)
  if [ -n "$MAIL_FROM" ]; then
    FROM=$(jq -r --arg m "$MAIL_FROM" '[.senders[]? | select(.active == true and (.email | ascii_downcase) == ($m | ascii_downcase)) | .email][0] // empty' /tmp/senders.json 2>/dev/null)
    [ -n "$FROM" ] || echo "::warning::MAIL_FROM is not a confirmed sender in Brevo (Brevo → Senders): using the account's first confirmed sender instead"
  fi
  [ -n "${FROM:-}" ] || FROM=$(jq -r '[.senders[]? | select(.active == true) | .email][0] // empty' /tmp/senders.json 2>/dev/null)
  echo "Brevo senders: HTTP $scode, $(jq '[.senders[]? | select(.active == true)] | length' /tmp/senders.json 2>/dev/null || echo 0) confirmed"
  rm -f /tmp/senders.json
  if [ -z "$FROM" ]; then
    email_off "Brevo has no confirmed sender address (Brevo → Senders, domains → Senders → add one and confirm it)"
  else
    echo "::add-mask::$FROM"
    # A real request that Brevo checks and then drops (sandbox): proves the key may send email from this address.
    tcode=$(bre /tmp/mailtest.json smtp/email -X POST -H 'Content-Type: application/json' -d "$(jq -nc --arg f "$FROM" \
      '{sender: {name: "getit", email: $f}, to: [{email: "check@example.com"}], subject: "check", textContent: "check", headers: {"X-Sib-Sandbox": "drop"}}')")
    if [ "$tcode" != "200" ] && [ "$tcode" != "201" ] && [ "$tcode" != "202" ]; then
      email_off "Brevo refused a test email (HTTP $tcode: $(jq -r '[.code, .message] | map(select(. != null)) | join(" - ")' /tmp/mailtest.json 2>/dev/null | sed "s/$FROM/***/g" | head -c 300))"
    else
      EHOOK="v1,whsec_$(openssl rand -base64 32)"
      echo "::add-mask::$EHOOK"
      supabase secrets set --yes --project-ref "$REF" "SEND_EMAIL_HOOK_SECRET=$EHOOK" "MAIL_FROM=$FROM" "MAIL_FROM_NAME=${MAIL_FROM_NAME:-getit}" > /dev/null
      mail=$(jq -nc --arg uri "https://$REF.supabase.co/functions/v1/send-email" --arg s "$EHOOK" \
        '{hook_send_email_enabled: true, hook_send_email_uri: $uri, hook_send_email_secrets: $s}')
      if patch "$mail"; then
        echo "Sign-in emails now carry a 6-digit code (sent by the send-email function through Brevo)."
        # Supabase's own mail is limited to a couple of emails an hour; ours isn't, so ask for more room.
        patch '{"rate_limit_email_sent": 120}' && echo "Up to 120 code emails an hour." || echo "The hourly email limit could not be raised (see the number below)."
      else
        echo "::warning::Could not switch on the send-email function for $REF: sign-in emails still come as a link"
      fi
    fi
    rm -f /tmp/mailtest.json
  fi
fi
curl -sS "$API" -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" | jq '{smtp_host, smtp_sender_name, hook_send_email_enabled, rate_limit_email_sent, rate_limit_otp, mailer_otp_exp, mailer_otp_length}' || true

# ---- codes by SMS ----
if [ "${sms%.*}" -gt 0 ] 2>/dev/null; then
  HOOK="v1,whsec_$(openssl rand -base64 32)"
  echo "::add-mask::$HOOK"
  supabase secrets set --yes --project-ref "$REF" "SEND_SMS_HOOK_SECRET=$HOOK" "SMS_SENDER=${SMS_SENDER:-getit}" > /dev/null
  smsj=$(jq -nc --arg uri "https://$REF.supabase.co/functions/v1/send-sms" --arg s "$HOOK" \
    '{external_phone_enabled: true, hook_send_sms_enabled: true, hook_send_sms_uri: $uri, hook_send_sms_secrets: $s}')
  if patch "$smsj"; then
    echo "SMS codes are on (Brevo)."
  else
    echo "::warning::Could not switch on SMS codes for $REF"
  fi
else
  # no credits: Brevo would refuse every text, so keep phone codes off and the app doesn't offer them
  echo "::warning::Brevo has no SMS credits yet: phone codes stay off until you add some"
  patch '{"external_phone_enabled": false, "hook_send_sms_enabled": false}' && echo "SMS codes stay off (no SMS credits)." || true
fi
