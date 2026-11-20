// Full-screen ringing for calls that arrive while getit is closed.
// Adds a small piece of native Android code (plugins/incoming-call) to the app:
//   - a push receiver that rings for a call itself instead of waiting for the app to start,
//   - the full-screen "incoming call" screen shown over the lock screen, with Accept and Decline,
//   - the receiver behind "Decline".
// The server address and the public key the app already uses are written into the manifest, so "Decline" can
// reach getit's server without the app running. No secret is involved: this is the same public key the app ships with.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest, withDangerousMod, withAppBuildGradle, AndroidConfig } = require('expo/config-plugins');

const PKG = 'cm.bolo.app.call';
const FILES = ['BoloMessagingService.java', 'IncomingCall.java', 'IncomingCallActivity.java', 'CallActionReceiver.java'];
// keep in step with expo-notifications (its own build file names this version)
const FIREBASE_MESSAGING = 'com.google.firebase:firebase-messaging:24.0.1';

const put = (list, item) => {
  const i = list.findIndex((x) => x.$['android:name'] === item.$['android:name']);
  if (i >= 0) list[i] = item;
  else list.push(item);
};

module.exports = function withIncomingCall(config) {
  config = withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest['uses-permission'] = manifest['uses-permission'] || [];
    put(manifest['uses-permission'], { $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' } });

    const app = AndroidConfig.Manifest.getMainApplicationOrThrow(c.modResults);
    app.service = app.service || [];
    app.activity = app.activity || [];
    app.receiver = app.receiver || [];
    app['meta-data'] = app['meta-data'] || [];
    // ahead of expo-notifications' own receiver (priority -1), which this one extends and hands everything else to
    put(app.service, {
      $: { 'android:name': `${PKG}.BoloMessagingService`, 'android:exported': 'false' },
      'intent-filter': [{ $: { 'android:priority': '1' }, action: [{ $: { 'android:name': 'com.google.firebase.MESSAGING_EVENT' } }] }],
    });
    put(app.activity, {
      $: {
        'android:name': `${PKG}.IncomingCallActivity`,
        'android:exported': 'false',
        'android:showWhenLocked': 'true',
        'android:turnScreenOn': 'true',
        'android:excludeFromRecents': 'true',
        'android:launchMode': 'singleInstance',
        'android:taskAffinity': '',
        'android:screenOrientation': 'portrait',
        'android:configChanges': 'orientation|screenSize|keyboardHidden|uiMode',
        'android:theme': '@android:style/Theme.DeviceDefault.NoActionBar',
      },
    });
    put(app.receiver, { $: { 'android:name': `${PKG}.CallActionReceiver`, 'android:exported': 'false' } });
    put(app['meta-data'], { $: { 'android:name': 'bolo.api', 'android:value': process.env.EXPO_PUBLIC_SUPABASE_URL || '' } });
    put(app['meta-data'], { $: { 'android:name': 'bolo.key', 'android:value': process.env.EXPO_PUBLIC_SUPABASE_KEY || '' } });
    return c;
  });

  // the push classes this code builds against
  config = withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes(FIREBASE_MESSAGING)) {
      c.modResults.contents = c.modResults.contents.replace(/\ndependencies\s*\{/, `\ndependencies {\n    implementation("${FIREBASE_MESSAGING}")`);
    }
    return c;
  });

  return withDangerousMod(config, [
    'android',
    (c) => {
      const main = path.join(c.modRequest.platformProjectRoot, 'app', 'src', 'main');
      const dest = path.join(main, 'java', ...PKG.split('.'));
      fs.mkdirSync(dest, { recursive: true });
      for (const f of FILES) fs.copyFileSync(path.join(__dirname, 'incoming-call', f), path.join(dest, f));
      // the ringtone and the small icon are looked up by name: tell the build to keep them when it trims unused files
      const raw = path.join(main, 'res', 'raw');
      fs.mkdirSync(raw, { recursive: true });
      fs.writeFileSync(path.join(raw, 'bolo_keep.xml'), '<?xml version="1.0" encoding="utf-8"?>\n<resources xmlns:tools="http://schemas.android.com/tools" tools:keep="@raw/bolo_ring,@drawable/notification_icon" />\n');
      return c;
    },
  ]);
};
