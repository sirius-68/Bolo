#!/usr/bin/env bash
# Makes the accounts listed in ADMIN_EMAILS (comma separated) owners of the admin panel.
#   scripts/admins.sh <project-ref>        needs SUPABASE_ACCESS_TOKEN
# The emails come from a GitHub secret and are never printed. Each one must already have a bolo account.
set -euo pipefail
REF=$1
if [ -z "${ADMIN_EMAILS:-}" ]; then
  echo "ADMIN_EMAILS is not set: nobody new was made an admin."
  exit 0
fi
# only letters, digits and the characters emails use: nothing else reaches the database
CLEAN=$(printf '%s' "$ADMIN_EMAILS" | tr 'A-Z' 'a-z' | tr -d ' \n\r\t' | tr -cd 'a-z0-9@._+,-')
SQL="with wanted as (select unnest(string_to_array('$CLEAN', ',')) as email),
     done as (insert into public.admin_users (user_id, role)
              select u.id, 'owner' from auth.users u join wanted w on lower(u.email) = w.email
              on conflict (user_id) do update set role = 'owner' returning 1)
     select (select count(*) from wanted where email <> '') as asked, (select count(*) from done) as made;"
code=$(curl -sS -o /tmp/admins.json -w '%{http_code}' -X POST "https://api.supabase.com/v1/projects/$REF/database/query" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H 'Content-Type: application/json' -d "$(jq -nc --arg q "$SQL" '{query: $q}')")
if [ "$code" != "200" ] && [ "$code" != "201" ]; then
  echo "::warning::Could not set the admins on $REF (HTTP $code)"
  exit 0
fi
asked=$(jq -r '.[0].asked // 0' /tmp/admins.json)
made=$(jq -r '.[0].made // 0' /tmp/admins.json)
echo "Admin owners: $made of $asked email(s) matched a bolo account."
if [ "$made" -lt "$asked" ]; then
  echo "::warning::$((asked - made)) admin email(s) have no bolo account on $REF yet: sign up in the app with that email, then run this deploy again"
fi
rm -f /tmp/admins.json
