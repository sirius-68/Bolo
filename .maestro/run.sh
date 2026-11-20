#!/usr/bin/env bash
# Installs the APK on the running emulator and walks through both account types.
set -x
mkdir -p qa-out
adb install -r out/*.apk > qa-out/install.txt 2>&1
# what the phone would have been asked on first use (notifications, microphone): allowed up front, so calls can ring
adb shell pm grant cm.bolo.app android.permission.POST_NOTIFICATIONS || true
adb shell pm grant cm.bolo.app android.permission.RECORD_AUDIO || true
adb logcat -c
adb logcat -v time ReactNativeJS:V AndroidRuntime:E '*:S' > qa-out/logcat-live.txt 2>&1 &
LOGPID=$!
adb shell settings put global hide_error_dialogs 1 || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS || true
sleep 20
FLOWS="signedout"
# Test builds talk to staging, where new accounts are confirmed at once: two fresh accounts sign up,
# and do a job together.
RUN="${GITHUB_RUN_ID:-$(date +%s)}"
export TOUR_PASSWORD="Tour-$RUN-pw" HIRE_EMAIL="getit-tour-$RUN-h@mailinator.com" WORK_EMAIL="getit-tour-$RUN-w@mailinator.com"
# How long a cold start takes (three tries): Android's own figure for "first screen drawn". The app's own log
# ("bolo: home ready in … ms", in logcat-live.txt) says when the home screen had its content.
cold_start() {
  for i in 1 2 3; do
    adb shell am force-stop cm.bolo.app
    sleep 2
    adb shell am start -W -n cm.bolo.app/.MainActivity | grep -E "TotalTime|WaitTime" | tr '\n' ' ' >> "qa-out/$1"
    echo >> "qa-out/$1"
    sleep 12
  done
}
# Test builds talk to the test server: a worker joins, someone hiring finds and messages them and asks for prices,
# then the two do one whole job together (price, booking, on the way, done, rated).
[ -n "$TOUR_SIGNUP" ] && FLOWS="signedout g1-work g2-hire g3-job"
for f in $FLOWS; do
  mkdir -p qa-out/$f
  (cd qa-out/$f && maestro test -e QA_EMAIL="$QA_EMAIL" -e QA_PASSWORD="$QA_PASSWORD" \
    -e RUN="$RUN" -e TOUR_PASSWORD="Tour-$RUN-pw" -e HIRE_EMAIL="getit-tour-$RUN-h@mailinator.com" -e WORK_EMAIL="getit-tour-$RUN-w@mailinator.com" \
    ../../.maestro/$f.yaml > maestro.log 2>&1; echo "exit=$?" >> maestro.log)
  adb exec-out screencap -p > qa-out/$f/zz-last.png || true
done
cold_start startup.txt
# the phone's own ringing for calls that come while bolo is closed (locked phone, phone in use, Accept, Decline)
bash .maestro/ring.sh fake
find .maestro ~/.maestro/tests -name "*.png" -newer out -exec cp {} qa-out/ \; 2>/dev/null || true
cp -r ~/.maestro/tests qa-out/maestro-tests 2>/dev/null || true
kill $LOGPID 2>/dev/null || true
adb logcat -d -v brief ReactNativeJS:V AndroidRuntime:E '*:S' > qa-out/logcat.txt 2>&1 || true
adb shell dumpsys meminfo cm.bolo.app > qa-out/meminfo.txt 2>&1 || true
exit 0
