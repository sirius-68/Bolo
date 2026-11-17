package cm.bolo.app.call;

import android.app.Activity;
import android.app.KeyguardManager;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.graphics.Outline;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewOutlineProvider;
import android.view.WindowManager;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/**
 * The full-screen incoming call, shown over the lock screen while bolo is closed.
 * Accept unlocks the phone and opens bolo on the call; Decline ends it without opening anything.
 */
public class IncomingCallActivity extends Activity {
  static volatile boolean showing = false;

  private final Handler ui = new Handler(Looper.getMainLooper());
  private Bundle d;
  private int ticks = 0;
  private boolean done = false;
  private boolean asking = false;

  @Override
  protected void onCreate(Bundle saved) {
    super.onCreate(saved);
    if (Build.VERSION.SDK_INT >= 27) {
      setShowWhenLocked(true);
      setTurnScreenOn(true);
    }
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED | WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON);
    getWindow().setStatusBarColor(0xFF05050A);
    getWindow().setNavigationBarColor(0xFF05050A);
    handle(getIntent());
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    handle(intent);
  }

  @Override
  protected void onStart() {
    super.onStart();
    showing = true;
  }

  @Override
  protected void onStop() {
    super.onStop();
    showing = false;
  }

  @Override
  protected void onDestroy() {
    done = true;
    ui.removeCallbacksAndMessages(null);
    super.onDestroy();
  }

  @Override
  public void onBackPressed() {
    // Back leaves the call ringing in the notification; it is answered or declined there
    moveTaskToBack(true);
  }

  private void handle(Intent intent) {
    Bundle e = intent == null ? null : intent.getExtras();
    if (e == null || IncomingCall.str(e, "call").isEmpty()) {
      finish();
      return;
    }
    d = e;
    done = false;
    asking = false;
    draw();
    ticks = 0;
    ui.removeCallbacksAndMessages(null);
    ui.postDelayed(watch, 1000);
    // "Accept" tapped on the notification itself
    if (IncomingCall.ACTION_ACCEPT.equals(intent.getAction())) accept();
  }

  /** Close when the call stops ringing: the notification went (timed out, replaced by "missed"), or the server says so. */
  private final Runnable watch = new Runnable() {
    @Override
    public void run() {
      if (done || isFinishing()) return;
      ticks++;
      if (ticks >= 3 && !IncomingCall.ringing(IncomingCallActivity.this, d)) {
        close();
        return;
      }
      if (ticks % 3 == 0) {
        final Bundle call = d;
        final Context app = getApplicationContext();
        new Thread(new Runnable() {
          @Override
          public void run() {
            final String state = IncomingCall.rpc(app, call, "call_state_token");
            if (state == null || "ringing".equals(state)) return;
            ui.post(new Runnable() {
              @Override
              public void run() {
                if (done || call != d) return;
                if ("missed".equals(state) || "ended".equals(state)) IncomingCall.missed(app, call);
                else IncomingCall.cancel(app, call);
                close();
              }
            });
          }
        }).start();
      }
      ui.postDelayed(this, 1000);
    }
  };

  private void close() {
    done = true;
    ui.removeCallbacksAndMessages(null);
    finish();
  }

  private void accept() {
    if (asking) return;
    if (Build.VERSION.SDK_INT >= 26) {
      KeyguardManager km = (KeyguardManager) getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null && km.isKeyguardLocked()) {
        // the phone asks for its PIN or fingerprint; the call keeps ringing until it is unlocked
        asking = true;
        km.requestDismissKeyguard(this, new KeyguardManager.KeyguardDismissCallback() {
          @Override
          public void onDismissSucceeded() {
            asking = false;
            open();
          }

          @Override
          public void onDismissCancelled() {
            asking = false;
          }

          @Override
          public void onDismissError() {
            asking = false;
            open();
          }
        });
        return;
      }
    }
    open();
  }

  private void open() {
    if (done) return;
    IncomingCall.cancel(this, d);
    try {
      startActivity(IncomingCall.appIntent(this, IncomingCall.str(d, "call"), true));
    } catch (Throwable t) {
      Log.e(IncomingCall.LOG, "could not open bolo", t);
    }
    close();
  }

  private void decline() {
    Intent no = new Intent(this, CallActionReceiver.class);
    no.setAction(IncomingCall.ACTION_DECLINE);
    no.putExtras(d);
    sendBroadcast(no);
    close();
  }

  /* ---------------------------------------------------------------- the screen */
  private int dp(float v) {
    return Math.round(TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics()));
  }

  private TextView text(String s, float size, int color, boolean bold) {
    TextView t = new TextView(this);
    t.setText(s);
    t.setTextSize(TypedValue.COMPLEX_UNIT_SP, size);
    t.setTextColor(color);
    t.setGravity(Gravity.CENTER);
    if (bold) t.setTypeface(Typeface.DEFAULT_BOLD);
    return t;
  }

  private static GradientDrawable oval(int color) {
    GradientDrawable g = new GradientDrawable();
    g.setShape(GradientDrawable.OVAL);
    g.setColor(color);
    return g;
  }

  private View space(float weight) {
    View v = new View(this);
    v.setLayoutParams(new LinearLayout.LayoutParams(1, 0, weight));
    return v;
  }

  private View button(String label, int color, float turn, View.OnClickListener tap) {
    LinearLayout col = new LinearLayout(this);
    col.setOrientation(LinearLayout.VERTICAL);
    col.setGravity(Gravity.CENTER_HORIZONTAL);
    FrameLayout circle = new FrameLayout(this);
    circle.setBackground(oval(color));
    circle.setContentDescription(label);
    circle.setClickable(true);
    circle.setOnClickListener(tap);
    ImageView icon = new ImageView(this);
    icon.setImageResource(android.R.drawable.ic_menu_call);
    icon.setColorFilter(Color.WHITE);
    icon.setRotation(turn);
    circle.addView(icon, new FrameLayout.LayoutParams(dp(32), dp(32), Gravity.CENTER));
    col.addView(circle, new LinearLayout.LayoutParams(dp(72), dp(72)));
    TextView t = text(label, 13, 0xCCFFFFFF, false);
    LinearLayout.LayoutParams lp = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    lp.topMargin = dp(8);
    col.addView(t, lp);
    return col;
  }

  private void draw() {
    String name = IncomingCall.str(d, "name").isEmpty() ? "bolo" : IncomingCall.str(d, "name");
    boolean video = "video".equals(IncomingCall.str(d, "kind"));

    LinearLayout root = new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setGravity(Gravity.CENTER_HORIZONTAL);
    root.setBackgroundColor(0xFF05050A);
    root.setPadding(dp(24), dp(72), dp(24), dp(64));

    root.addView(text("bolo", 20, 0xFFF6EE5C, true));
    root.addView(space(1f));

    FrameLayout face = new FrameLayout(this);
    face.setBackground(oval(0xFF22222B));
    String first = name.trim().isEmpty() ? "?" : name.trim().substring(0, 1).toUpperCase();
    face.addView(text(first, 52, Color.WHITE, true), new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    final ImageView photo = new ImageView(this);
    photo.setScaleType(ImageView.ScaleType.CENTER_CROP);
    photo.setOutlineProvider(new ViewOutlineProvider() {
      @Override
      public void getOutline(View view, Outline outline) {
        outline.setOval(0, 0, view.getWidth(), view.getHeight());
      }
    });
    photo.setClipToOutline(true);
    face.addView(photo, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    root.addView(face, new LinearLayout.LayoutParams(dp(132), dp(132)));

    TextView who = text(name, 28, Color.WHITE, true);
    LinearLayout.LayoutParams wl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    wl.topMargin = dp(20);
    root.addView(who, wl);
    TextView what = text(video ? "Incoming video call" : "Incoming voice call", 16, 0xB3FFFFFF, false);
    LinearLayout.LayoutParams sl = new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT);
    sl.topMargin = dp(8);
    root.addView(what, sl);

    root.addView(space(1.5f));

    LinearLayout row = new LinearLayout(this);
    row.setOrientation(LinearLayout.HORIZONTAL);
    row.setGravity(Gravity.CENTER);
    row.addView(button("Decline", 0xFFFF6B6B, 135f, new View.OnClickListener() {
      @Override
      public void onClick(View v) {
        decline();
      }
    }), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
    row.addView(button("Accept", 0xFF2FB36D, 0f, new View.OnClickListener() {
      @Override
      public void onClick(View v) {
        accept();
      }
    }), new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
    root.addView(row, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));

    setContentView(root);
    loadPhoto(IncomingCall.str(d, "photo"), photo);
  }

  /** The caller's photo, when they have one (the letter shows until it arrives, or if it doesn't). */
  private void loadPhoto(final String url, final ImageView into) {
    if (!url.startsWith("https://")) return;
    new Thread(new Runnable() {
      @Override
      public void run() {
        HttpURLConnection h = null;
        try {
          h = (HttpURLConnection) new URL(url).openConnection();
          h.setConnectTimeout(4000);
          h.setReadTimeout(6000);
          InputStream in = h.getInputStream();
          BitmapFactory.Options o = new BitmapFactory.Options();
          o.inSampleSize = 2;
          final Bitmap bmp = BitmapFactory.decodeStream(in, null, o);
          in.close();
          if (bmp != null) {
            ui.post(new Runnable() {
              @Override
              public void run() {
                if (!isFinishing()) into.setImageBitmap(bmp);
              }
            });
          }
        } catch (Throwable ignored) {
        } finally {
          if (h != null) h.disconnect();
        }
      }
    }).start();
  }
}
