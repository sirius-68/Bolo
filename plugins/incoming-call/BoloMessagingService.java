package cm.bolo.app.call;

import android.os.Bundle;
import android.util.Log;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

import expo.modules.notifications.service.ExpoFirebaseMessagingService;

/**
 * Receives every push for bolo. A call that arrives while bolo is not on screen is rung here, by the phone
 * itself (full screen on the lock screen, with Accept and Decline). A "clear" takes down pop-ups that were read
 * on another phone. Everything else goes on to the app as before.
 */
public class BoloMessagingService extends ExpoFirebaseMessagingService {
  @Override
  public void onMessageReceived(RemoteMessage message) {
    try {
      Map<String, String> data = message.getData();
      // read on another phone: take those pop-ups down here too (nothing is shown for this)
      if (data != null && "clear".equals(data.get("type"))) {
        IncomingCall.clear(getApplicationContext(), data.get("tags"), data.get("at"));
        return;
      }
      if (data != null && "call".equals(data.get("type")) && "1".equals(data.get("ring")) && !IncomingCall.inFront(this)) {
        Bundle d = new Bundle();
        for (String k : IncomingCall.KEYS) {
          String v = data.get(k);
          if (v != null) d.putString(k, v);
        }
        IncomingCall.ring(getApplicationContext(), d);
        return;
      }
    } catch (Throwable t) {
      Log.w(IncomingCall.LOG, "ringing failed, handing the push to the app", t);
    }
    super.onMessageReceived(message);
  }
}
