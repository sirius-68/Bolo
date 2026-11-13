#!/usr/bin/env bash
# Installs the APK on the running emulator and walks through both account types.
set -x
mkdir -p qa-out
adb install -r out/*.apk > qa-out/install.txt 2>&1
adb logcat -c
adb logcat -v time ReactNativeJS:V AndroidRuntime:E '*:S' > qa-out/logcat-live.txt 2>&1 &
LOGPID=$!
adb shell settings put global hide_error_dialogs 1 || true
adb shell am broadcast -a android.intent.action.CLOSE_SYSTEM_DIALOGS || true
sleep 20
# Signed out always; signed in only when a QA account is set in GitHub secrets (QA_EMAIL, QA_PASSWORD).
FLOWS="signedout"
[ -n "$QA_EMAIL" ] && [ -n "$QA_PASSWORD" ] && FLOWS="signedout signedin"
# Test builds talk to staging, where new accounts are confirmed at once: two fresh accounts sign up,
# go through onboarding, and do a job together (post, offer, accept, chat).
RUN="${GITHUB_RUN_ID:-$(date +%s)}"
[ -n "$TOUR_SIGNUP" ] && FLOWS="$FLOWS t1-hire-signup t2-work-signup t3-hire-accepts t4-work-replies t5-business-signup t6-sweep-regular t7-sweep-business"
for f in $FLOWS; do
  mkdir -p qa-out/$f
  (cd qa-out/$f && maestro test -e QA_EMAIL="$QA_EMAIL" -e QA_PASSWORD="$QA_PASSWORD" \
    -e RUN="$RUN" -e TOUR_PASSWORD="Tour-$RUN-pw" -e HIRE_EMAIL="bolo-tour-$RUN-h@mailinator.com" -e WORK_EMAIL="bolo-tour-$RUN-w@mailinator.com" -e BIZ_EMAIL="bolo-tour-$RUN-b@mailinator.com" \
    ../../.maestro/$f.yaml > maestro.log 2>&1; echo "exit=$?" >> maestro.log)
  adb exec-out screencap -p > qa-out/$f/zz-last.png || true
done
# Update test: install the previous version, sign up on it, then install this build over it (keeping its data).
if [ -n "$TOUR_SIGNUP" ] && ls old/*.apk >/dev/null 2>&1; then
  T="-e RUN=$RUN -e TOUR_PASSWORD=Tour-$RUN-pw -e UPD_EMAIL=bolo-tour-$RUN-u@mailinator.com"
  adb uninstall cm.bolo.app > /dev/null 2>&1 || true
  adb install old/*.apk > qa-out/install-old.txt 2>&1
  mkdir -p qa-out/u1-old-version qa-out/u2-after-update
  (cd qa-out/u1-old-version && maestro test $T ../../.maestro/u1-old-version.yaml > maestro.log 2>&1; echo "exit=$?" >> maestro.log)
  adb shell am force-stop cm.bolo.app || true
  adb install -r out/*.apk > qa-out/install-update.txt 2>&1
  (cd qa-out/u2-after-update && maestro test $T ../../.maestro/u2-after-update.yaml > maestro.log 2>&1; echo "exit=$?" >> maestro.log)
  adb exec-out screencap -p > qa-out/u2-after-update/zz-last.png || true
fi
find .maestro ~/.maestro/tests -name "*.png" -newer out -exec cp {} qa-out/ \; 2>/dev/null || true
cp -r ~/.maestro/tests qa-out/maestro-tests 2>/dev/null || true
kill $LOGPID 2>/dev/null || true
adb logcat -d -v brief ReactNativeJS:V AndroidRuntime:E '*:S' > qa-out/logcat.txt 2>&1 || true
adb shell dumpsys meminfo cm.bolo.app > qa-out/meminfo.txt 2>&1 || true
exit 0
