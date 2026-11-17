#!/usr/bin/env bash
# Checks the phone's own ringing for calls that arrive while bolo is closed.
#   ring.sh fake   rings without a real call (through the test door of the app's own receiver; needs adb root)
#   ring.sh real   a second account really calls the account signed in on the emulator (staging), the push
#                  arrives through Firebase, the locked phone rings full screen, Accept answers the call
# Results go to qa-out/ring-<mode>/result.txt ("ok …", "FAIL …", "skip …") with screenshots next to it.
MODE="${1:-fake}"
OUT="qa-out/ring-$MODE"
mkdir -p "$OUT"
R="$OUT/result.txt"
PKG=cm.bolo.app
say() { echo "$*" | tee -a "$R"; }
shot() { adb exec-out screencap -p > "$OUT/$1.png" 2>/dev/null || true; }
top() { adb shell dumpsys activity activities 2>/dev/null | grep -E "topResumedActivity|mResumedActivity|ResumedActivity:" | head -3; }
ringing_screen() { top | grep -q "IncomingCallActivity"; }
awake() { adb shell dumpsys power 2>/dev/null | grep -q "mWakefulness=Awake"; }
lock() {
  adb shell locksettings set-disabled false > /dev/null 2>&1 || true
  adb shell input keyevent KEYCODE_HOME
  sleep 1
  adb shell input keyevent KEYCODE_SLEEP
  sleep 4
}
unlock() {
  adb shell input keyevent KEYCODE_WAKEUP
  sleep 1
  adb shell wm dismiss-keyguard > /dev/null 2>&1 || true
  sleep 2
}
# centre of the element with this accessibility label, from the screen's layout
tap_label() {
  adb shell uiautomator dump /sdcard/ring-ui.xml > /dev/null 2>&1
  adb shell cat /sdcard/ring-ui.xml > "$OUT/ui-$1.xml" 2>/dev/null
  local b
  # one element per line, then the bounds of the one with this label
  b=$(sed 's/>/>\n/g' "$OUT/ui-$1.xml" | grep "content-desc=\"$1\"" | head -1 | sed -E 's/.*bounds="\[([0-9]+),([0-9]+)\]\[([0-9]+),([0-9]+)\]".*/\1 \2 \3 \4/')
  echo "tap $1 at: $b" >> "$OUT/state.txt"
  set -- $b
  [ -n "$4" ] || return 1
  adb shell input tap $(( ($1 + $3) / 2 )) $(( ($2 + $4) / 2 ))
}
wait_for() { # wait_for <seconds> <command…>
  local n=$1; shift
  for _ in $(seq "$n"); do "$@" && return 0; sleep 1; done
  return 1
}
note_state() { { echo "--- $1"; top; adb shell dumpsys power 2>/dev/null | grep "mWakefulness="; adb shell dumpsys notification --noredact 2>/dev/null | grep -E "NotificationRecord.*$PKG" | head -5; } >> "$OUT/state.txt" 2>&1; }

adb shell pm grant $PKG android.permission.POST_NOTIFICATIONS > /dev/null 2>&1 || true
adb shell pm grant $PKG android.permission.RECORD_AUDIO > /dev/null 2>&1 || true

if [ "$MODE" = fake ]; then
  adb root > /dev/null 2>&1; sleep 3; adb wait-for-device
  ring() { adb shell am broadcast -n $PKG/.call.CallActionReceiver -a $PKG.call.TEST --es call "$1" --es name "Ada\ Tester" --es kind "${2:-voice}" --es tag "calls:$1" > "$OUT/broadcast-$1.txt" 2>&1; }

  # 1. locked phone: the screen turns on and the call fills it
  lock
  ring t1
  if wait_for 10 ringing_screen; then say "ok    locked phone: the call opens full screen"; else say "FAIL  locked phone: no full-screen call"; fi
  sleep 2
  if awake; then say "ok    locked phone: the screen turned on"; else say "FAIL  locked phone: the screen stayed off"; fi
  shot 1-locked-ringing; note_state "locked ringing"
  # 2. Decline closes it and the ringing stops
  if tap_label Decline; then
    sleep 3
    if ringing_screen; then say "FAIL  Decline: the call screen is still there"; else say "ok    Decline closes the call screen"; fi
    if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "calls:t1"; then say "FAIL  Decline: still ringing"; else say "ok    Decline stops the ringing"; fi
  else say "FAIL  Decline button not found"; fi
  shot 2-after-decline
  # 3. phone in use (another screen in front): a pop-up with Decline and Accept, no takeover
  unlock
  adb shell input keyevent KEYCODE_HOME; sleep 2
  ring t2 video
  sleep 4
  shot 3-in-use-popup; note_state "in use"
  if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "calls:t2"; then say "ok    phone in use: the call shows as a pop-up"; else say "FAIL  phone in use: no pop-up"; fi
  adb shell am broadcast -n $PKG/.call.CallActionReceiver -a $PKG.call.DECLINE --es call t2 --es tag calls:t2 > /dev/null 2>&1
  sleep 2
  # 4. locked phone, Accept: the phone unlocks and bolo opens on the call
  lock
  ring t3
  wait_for 10 ringing_screen
  shot 4-locked-before-accept
  if tap_label Accept; then
    if wait_for 20 sh -c "adb shell dumpsys activity activities | grep -E 'topResumedActivity|ResumedActivity:' | grep -q '$PKG/.MainActivity'"; then say "ok    Accept opens bolo"; else say "FAIL  Accept did not open bolo"; fi
    sleep 6
    shot 5-after-accept; note_state "after accept"
    if adb shell dumpsys notification --noredact 2>/dev/null | grep -q "calls:t3"; then say "FAIL  Accept: still ringing"; else say "ok    Accept stops the ringing"; fi
  else say "FAIL  Accept button not found"; fi
  unlock
  exit 0
fi

# ---------------------------------------------------------------- a real call (staging)
[ -n "$SB_URL" ] && [ -n "$SB_KEY" ] && [ -n "$HIRE_EMAIL" ] && [ -n "$WORK_EMAIL" ] || { say "skip  real call: no staging accounts in this run"; exit 0; }
api() { # api <token> <path> <json>
  curl -s --max-time 20 -X POST "$SB_URL$2" -H "apikey: $SB_KEY" -H "Authorization: Bearer $1" -H "Content-Type: application/json" -d "$3"
}
login() { curl -s --max-time 20 -X POST "$SB_URL/auth/v1/token?grant_type=password" -H "apikey: $SB_KEY" -H "Content-Type: application/json" -d "{\"email\":\"$1\",\"password\":\"$TOUR_PASSWORD\"}"; }
HT=$(login "$HIRE_EMAIL" | jq -r '.access_token // empty')
WID=$(login "$WORK_EMAIL" | jq -r '.user.id // empty')
[ -n "$HT" ] && [ -n "$WID" ] || { say "skip  real call: could not sign the two tour accounts in"; exit 0; }
lock
CID=$(api "$HT" /rest/v1/rpc/start_direct "{\"p_other\":\"$WID\"}" | tr -d '"')
CALL=$(api "$HT" /rest/v1/rpc/start_call "{\"p_conversation\":\"$CID\",\"p_kind\":\"voice\"}" | tr -d '"')
echo "chat=$CID call=$CALL" >> "$OUT/state.txt"
case "$CALL" in *-*-*-*-*) ;; *) say "FAIL  real call: could not start the call ($CALL)"; unlock; exit 0;; esac
if wait_for 25 ringing_screen; then
  say "ok    real call: the locked phone rings full screen"
  sleep 2; shot 1-real-ringing; note_state "real ringing"
  if tap_label Accept; then
    answered() { [ "$(curl -s --max-time 10 "$SB_URL/rest/v1/calls?id=eq.$CALL&select=answered_at" -H "apikey: $SB_KEY" -H "Authorization: Bearer $HT" | jq -r '.[0].answered_at // empty')" != "" ]; }
    if wait_for 40 answered; then say "ok    real call: Accept on the lock screen answered the call"; else say "FAIL  real call: Accept did not answer the call"; fi
    sleep 3; shot 2-real-answered; note_state "real answered"
  else say "FAIL  real call: Accept button not found"; fi
else
  shot 1-real-no-ring; note_state "real no ring"
  say "skip  real call: the push did not reach the emulator in 25 s (Firebase on emulators is not dependable)"
fi
api "$HT" /rest/v1/rpc/end_call "{\"p_call\":\"$CALL\"}" > /dev/null
sleep 3
unlock
shot 3-real-after
exit 0
