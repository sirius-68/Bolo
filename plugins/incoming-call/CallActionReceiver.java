package cm.bolo.app.call;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Bundle;

/** "Decline" on the ringing notification or screen: stop ringing at once, then tell the server. */
public class CallActionReceiver extends BroadcastReceiver {
  @Override
  public void onReceive(Context context, Intent intent) {
    final Bundle d = intent.getExtras();
    final String action = intent.getAction();
    if (d == null || action == null) return;
    final Context app = context.getApplicationContext();
    if (IncomingCall.ACTION_TEST.equals(action)) {
      // automatic tests on an emulator ring without a real call (this receiver is not open to other apps)
      IncomingCall.post(app, d);
      return;
    }
    if (!IncomingCall.ACTION_DECLINE.equals(action)) return;
    IncomingCall.cancel(app, d);
    final PendingResult pending = goAsync();
    new Thread(new Runnable() {
      @Override
      public void run() {
        try {
          IncomingCall.rpc(app, d, "decline_call_token");
        } finally {
          pending.finish();
        }
      }
    }).start();
  }
}
