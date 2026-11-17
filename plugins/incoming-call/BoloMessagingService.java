package cm.bolo.app.call;

import android.os.Bundle;
import android.util.Log;

import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;

import expo.modules.notifications.service.ExpoFirebaseMessagingService;

/**
 * Receives every push for bolo. A call that arrives while bolo is not on screen is rung here, by the phone
 * itself (full screen on the lock screen, with Accept and Decline); everything else goes on to the app as before.
 */
public class BoloMessagingService extends ExpoFirebaseMessagingService {
  @Override
  public void onMessageReceived(RemoteMessage message) {
    try {
      Map<String, String> data = message.getData();
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
