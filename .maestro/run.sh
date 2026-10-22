#!/usr/bin/env bash
# Installs the APK on the running emulator and walks through both account types.
set -x
mkdir -p qa-out
adb install -r out/*.apk > qa-out/install.txt 2>&1
adb logcat -c
for f in regular business; do
  mkdir -p qa-out/$f
  (cd qa-out/$f && maestro test ../../.maestro/$f.yaml > maestro.log 2>&1; echo "exit=$?" >> maestro.log)
  adb exec-out screencap -p > qa-out/$f/zz-last.png || true
done
find .maestro ~/.maestro/tests -name "*.png" -newer out -exec cp {} qa-out/ ; 2>/dev/null || true
cp -r ~/.maestro/tests qa-out/maestro-tests 2>/dev/null || true
adb logcat -d -v brief ReactNativeJS:V AndroidRuntime:E '*:S' > qa-out/logcat.txt 2>&1 || true
adb shell dumpsys meminfo cm.bolo.app > qa-out/meminfo.txt 2>&1 || true
exit 0
