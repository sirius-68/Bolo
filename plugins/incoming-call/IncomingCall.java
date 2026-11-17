package cm.bolo.app.call;

import android.app.ActivityManager;
import android.app.KeyguardManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Person;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ApplicationInfo;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.media.RingtoneManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.PowerManager;
import android.service.notification.StatusBarNotification;
import android.util.Log;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** A call coming in while bolo is closed: the ringing notification, and the two questions the phone may ask the server. */
public final class IncomingCall {
  private IncomingCall() {}

  static final String LOG = "BoloCall";
  /** The same channel the app creates ("Incoming calls": ringtone, long vibration, shown on the lock screen). */
  static final String CHANNEL = "ring";
  static final String CHANNEL_MISSED = "calls";
  static final String ACTION_DECLINE = "cm.bolo.app.call.DECLINE";
  static final String ACTION_TEST = "cm.bolo.app.call.TEST";
  static final String ACTION_SHOW = "cm.bolo.app.call.SHOW";
  static final String ACTION_ACCEPT = "cm.bolo.app.call.ACCEPT";
  /** What the push carries about the call. */
  static final String[] KEYS = {"call", "name", "kind", "tag", "pass", "photo"};
  static final long RING_MS = 40000;
  private static final long[] BUZZ = {0, 900, 600, 900, 600, 900, 600, 900, 600, 900};

  static String str(Bundle d, String key) {
    String v = d == null ? null : d.getString(key);
    return v == null ? "" : v;
  }

  static String tag(Bundle d) {
    String t = str(d, "tag");
    return t.isEmpty() ? "call:" + str(d, "call") : t;
  }

  /** Is bolo itself on screen right now (unlocked, screen on, the app in front)? Then the app rings, not the phone. */
  static boolean inFront(Context c) {
    try {
      if (IncomingCallActivity.showing) return false;
      KeyguardManager km = (KeyguardManager) c.getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null && km.isKeyguardLocked()) return false;
      PowerManager pm = (PowerManager) c.getSystemService(Context.POWER_SERVICE);
      if (pm != null && !pm.isInteractive()) return false;
      ActivityManager.RunningAppProcessInfo me = new ActivityManager.RunningAppProcessInfo();
      ActivityManager.getMyMemoryState(me);
      return me.importance == ActivityManager.RunningAppProcessInfo.IMPORTANCE_FOREGROUND;
    } catch (Throwable t) {
      return false;
    }
  }

  /** A call push arrived: ring, unless the call is already over (a push that came late). */
  static void ring(Context c, Bundle d) {
    if (str(d, "call").isEmpty()) return;
    String state = rpc(c, d, "call_state_token");
    if (state != null && !"ringing".equals(state)) {
      Log.i(LOG, "call is " + state + ", not ringing");
      return;
    }
    post(c, d);
  }

  private static int flags() {
    return PendingIntent.FLAG_UPDATE_CURRENT | (Build.VERSION.SDK_INT >= 23 ? PendingIntent.FLAG_IMMUTABLE : 0);
  }

  private static Intent screen(Context c, Bundle d, boolean accept) {
    Intent i = new Intent(c, IncomingCallActivity.class);
    i.setAction(accept ? ACTION_ACCEPT : ACTION_SHOW);
    i.putExtras(d);
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_NO_USER_ACTION);
    return i;
  }

  /** Opens bolo on the call (answering it when asked to). */
  static Intent appIntent(Context c, String call, boolean answer) {
    Intent i = new Intent(Intent.ACTION_VIEW, Uri.parse("bolo://call?id=" + Uri.encode(call) + "&incoming=1" + (answer ? "&answer=1" : "")));
    i.setPackage(c.getPackageName());
    i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
    return i;
  }

  private static int icon(Context c) {
    int id = c.getResources().getIdentifier("notification_icon", "drawable", c.getPackageName());
    return id != 0 ? id : c.getApplicationInfo().icon;
  }

  private static Uri sound(Context c) {
    int id = c.getResources().getIdentifier("bolo_ring", "raw", c.getPackageName());
    return id != 0 ? Uri.parse("android.resource://" + c.getPackageName() + "/" + id) : RingtoneManager.getDefaultUri(RingtoneManager.TYPE_RINGTONE);
  }

  private static void channel(Context c, NotificationManager nm) {
    if (Build.VERSION.SDK_INT < 26 || nm.getNotificationChannel(CHANNEL) != null) return;
    NotificationChannel ch = new NotificationChannel(CHANNEL, "Incoming calls", NotificationManager.IMPORTANCE_HIGH);
    ch.setDescription("Rings when someone calls you and bolo is closed");
    ch.enableVibration(true);
    ch.setVibrationPattern(BUZZ);
    ch.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);
    ch.setSound(sound(c), new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE).setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
    nm.createNotificationChannel(ch);
  }

  private static Notification.Builder builder(Context c, String channel) {
    if (Build.VERSION.SDK_INT >= 26) return new Notification.Builder(c, channel);
    return new Notification.Builder(c);
  }

  private static Notification build(Context c, Bundle d, boolean callStyle) {
    String call = str(d, "call");
    String name = str(d, "name").isEmpty() ? "bolo" : str(d, "name");
    String text = "video".equals(str(d, "kind")) ? "Incoming video call" : "Incoming voice call";
    int code = call.hashCode();
    PendingIntent show = PendingIntent.getActivity(c, code, screen(c, d, false), flags());
    PendingIntent answer = PendingIntent.getActivity(c, code + 1, screen(c, d, true), flags());
    Intent no = new Intent(c, CallActionReceiver.class);
    no.setAction(ACTION_DECLINE);
    no.putExtras(d);
    PendingIntent decline = PendingIntent.getBroadcast(c, code + 2, no, flags());

    Bundle extras = new Bundle();
    extras.putString("type", "call");
    extras.putString("call", call);

    Notification.Builder b = builder(c, CHANNEL);
    b.setSmallIcon(icon(c));
    b.setContentTitle(name);
    b.setContentText(text);
    b.setCategory(Notification.CATEGORY_CALL);
    b.setVisibility(Notification.VISIBILITY_PUBLIC);
    b.setOngoing(true);
    b.setAutoCancel(false);
    b.setShowWhen(false);
    b.setColor(0xFFF6EE5C);
    b.setContentIntent(show);
    b.setFullScreenIntent(show, true);
    b.addExtras(extras);
    if (Build.VERSION.SDK_INT >= 26) {
      b.setTimeoutAfter(RING_MS);
    } else {
      b.setPriority(Notification.PRIORITY_MAX);
      b.setSound(sound(c), AudioManager.STREAM_RING);
      b.setVibrate(BUZZ);
    }
    if (callStyle && Build.VERSION.SDK_INT >= 31) {
      Person who = new Person.Builder().setName(name).setImportant(true).build();
      b.setStyle(Notification.CallStyle.forIncomingCall(who, decline, answer));
    } else {
      b.addAction(new Notification.Action.Builder(0, "Decline", decline).build());
      b.addAction(new Notification.Action.Builder(0, "Accept", answer).build());
    }
    Notification n = b.build();
    // keeps ringing until it is answered, declined or times out
    n.flags |= Notification.FLAG_INSISTENT;
    return n;
  }

  /** Show the ringing notification. On a locked phone Android opens the full-screen call from it. */
  static void post(Context c, Bundle d) {
    NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null || str(d, "call").isEmpty()) return;
    try {
      channel(c, nm);
      nm.notify(tag(d), 0, build(c, d, true));
    } catch (Throwable first) {
      Log.w(LOG, "call notification refused, trying the plain one", first);
      try {
        nm.notify(tag(d), 0, build(c, d, false));
      } catch (Throwable second) {
        Log.e(LOG, "could not show the call", second);
      }
    }
  }

  /** Is this call's ringing notification still up? (It goes when the call is answered, declined, missed or timed out.) */
  static boolean ringing(Context c, Bundle d) {
    try {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return false;
      String call = str(d, "call");
      for (StatusBarNotification s : nm.getActiveNotifications()) {
        Bundle e = s.getNotification().extras;
        if (e != null && call.equals(e.getString("call")) && "call".equals(e.getString("type"))) return true;
      }
      return false;
    } catch (Throwable t) {
      return true;
    }
  }

  static void cancel(Context c, Bundle d) {
    try {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm != null) nm.cancel(tag(d), 0);
    } catch (Throwable ignored) {
    }
  }

  /** Take down the pop-ups shown under these names (one per line): they were read on another phone. */
  static void clear(Context c, String tags) {
    if (tags == null || tags.isEmpty()) return;
    try {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return;
      for (String tag : tags.split("\n")) {
        if (!tag.isEmpty()) nm.cancel(tag, 0);
      }
    } catch (Throwable ignored) {
    }
  }

  /** The call ended before it was answered: the ringing notification becomes "Missed call". */
  static void missed(Context c, Bundle d) {
    try {
      NotificationManager nm = (NotificationManager) c.getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm == null) return;
      Intent open = c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
      Notification.Builder b = builder(c, Build.VERSION.SDK_INT >= 26 && nm.getNotificationChannel(CHANNEL_MISSED) != null ? CHANNEL_MISSED : CHANNEL);
      b.setSmallIcon(icon(c));
      b.setContentTitle(str(d, "name").isEmpty() ? "bolo" : str(d, "name"));
      b.setContentText("video".equals(str(d, "kind")) ? "Missed video call" : "Missed voice call");
      b.setCategory(Notification.CATEGORY_MISSED_CALL);
      b.setAutoCancel(true);
      b.setOnlyAlertOnce(true);
      b.setColor(0xFFF6EE5C);
      if (open != null) b.setContentIntent(PendingIntent.getActivity(c, str(d, "call").hashCode() + 4, open, flags()));
      nm.notify(tag(d), 0, b.build());
    } catch (Throwable t) {
      cancel(c, d);
    }
  }

  private static String meta(Context c, String key) {
    try {
      ApplicationInfo ai = c.getPackageManager().getApplicationInfo(c.getPackageName(), PackageManager.GET_META_DATA);
      Object v = ai.metaData == null ? null : ai.metaData.get(key);
      return v == null ? "" : String.valueOf(v);
    } catch (Throwable t) {
      return "";
    }
  }

  /**
   * Ask the server about this call with the one-time pass that came in the push: "call_state_token" (is it still
   * ringing?) or "decline_call_token". Returns the call's state, or null when the server could not be reached.
   * Only ever talks to bolo's own server (the address built into the app). Never call this on the main thread.
   */
  static String rpc(Context c, Bundle d, String fn) {
    String api = meta(c, "bolo.api"), key = meta(c, "bolo.key"), pass = str(d, "pass"), call = str(d, "call");
    if (api.isEmpty() || key.isEmpty() || pass.isEmpty() || call.isEmpty()) return null;
    HttpURLConnection h = null;
    try {
      URL u = new URL(api + "/rest/v1/rpc/" + fn);
      if (!"https".equals(u.getProtocol())) return null;
      h = (HttpURLConnection) u.openConnection();
      h.setConnectTimeout(4000);
      h.setReadTimeout(4000);
      h.setRequestMethod("POST");
      h.setDoOutput(true);
      h.setRequestProperty("apikey", key);
      h.setRequestProperty("Authorization", "Bearer " + key);
      h.setRequestProperty("Content-Type", "application/json");
      JSONObject body = new JSONObject();
      body.put("p_call", call);
      body.put("p_token", pass);
      OutputStream out = h.getOutputStream();
      out.write(body.toString().getBytes("UTF-8"));
      out.close();
      int code = h.getResponseCode();
      if (code < 200 || code >= 300) return null;
      InputStream in = h.getInputStream();
      ByteArrayOutputStream buf = new ByteArrayOutputStream();
      byte[] chunk = new byte[512];
      int n;
      while ((n = in.read(chunk)) > 0 && buf.size() < 4096) buf.write(chunk, 0, n);
      in.close();
      String s = buf.toString("UTF-8").trim().replace("\"", "");
      return s.isEmpty() || "null".equals(s) ? null : s;
    } catch (Throwable t) {
      Log.w(LOG, fn + " failed: " + t);
      return null;
    } finally {
      if (h != null) h.disconnect();
    }
  }
}
