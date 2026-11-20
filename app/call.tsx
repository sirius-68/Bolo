/* A call, in the getit design: who it is, what it is about, and three round buttons.
   Calls go through getit (Agora), so neither side sees the other's number. */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, PermissionsAndroid, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { tap } from '../src/g/touch';
import { toast } from '../src/g/notice';
import { P, THREADS, fname } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { db } from '../src/data/db';
import { CALLS, Call, agora, answerCall, askAnswer, callAlive, callPass, callPermissions, endCall, enterCallScreen, leaveCallScreen, loadCall, onCall, otherOf, setActiveCall, takeAnswer } from '../src/logic/calls';
import { clearCallPopups } from '../src/logic/push';
import { ring, stopRing } from '../src/logic/ring';
import { GIcon, GIconName } from '../src/g/icons';
import { openAfterCall } from '../src/g/sheets';
import { working } from '../src/g/data';
import { Face, T } from '../src/g/ui';
import { BRAND, useG } from '../src/g/theme';

const END = '#e5484d';
const ANSWER = '#1f9d55';

/** Two soft rings growing out from behind the picture while a phone is ringing. */
function Rings({ on }: { on: boolean }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!on) return;
    const run = (v: Animated.Value, delay: number) => Animated.loop(Animated.sequence([Animated.delay(delay), Animated.timing(v, { toValue: 1, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true })]));
    const x = run(a, 0);
    const y = run(b, 1100);
    x.start();
    y.start();
    return () => {
      x.stop();
      y.stop();
      a.setValue(0);
      b.setValue(0);
    };
  }, [on, a, b]);
  if (!on) return null;
  return (
    <>
      {[a, b].map((v, i) => (
        <Animated.View key={i} pointerEvents="none" style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: BRAND, opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0] }), transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [1, 2.17] }) }] }} />
      ))}
    </>
  );
}

type Phase = 'loading' | 'incoming' | 'calling' | 'connecting' | 'live' | 'ended';
const RING_LIMIT = 45_000;

/** A voice or video call through Agora. Opened for calls you start, and when someone calls you. */
export default function CallScreen() {
  useLive();
  // answer=1: Accept was tapped on the phone's own ringing screen (getit was closed), so this screen answers by itself
  const { id, incoming, answer } = useLocalSearchParams<{ id: string; incoming?: string; answer?: string }>();
  const ins = useSafeAreaInsets();
  const t = useG();
  const [call, setCall] = useState<Call | null>(CALLS[id] || null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [endText, setEndText] = useState('Call ended');
  const [remote, setRemote] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [speaker, setSpeaker] = useState(false);
  const [camOff, setCamOff] = useState(false);
  const [secs, setSecs] = useState(0);
  const eng = useRef<any>(null);
  const handler = useRef<any>(null);
  const joined = useRef(false);
  // this phone tapped Accept (so an "answered" update is ours, not another phone's)
  const answering = useRef(false);
  const done = useRef(false);
  // a second screen for a call that already has one (two ways in at the same moment): it only steps aside
  const extra = useRef(false);
  // the two people were really connected (so it is worth asking how the call went)
  const spoke = useRef(false);

  const video = call?.kind === 'video';
  const other = call ? otherOf(call) : '';
  const p = other ? P(other) : null;

  /** Leave Agora and close the screen. */
  const finish = (text: string, tellServer: boolean, close = true) => {
    if (done.current) return;
    done.current = true;
    setEndText(text);
    setPhase('ended');
    ring('end');
    try {
      if (eng.current) {
        eng.current.leaveChannel();
        if (handler.current) eng.current.unregisterEventHandler(handler.current);
        eng.current.release();
      }
    } catch {}
    eng.current = null;
    setActiveCall(null, id);
    if (tellServer && id) void endCall(id);
    // (when the screen was already left with Back there is nothing to close: going back again would leave the chat too)
    if (close) setTimeout(leave, 1200);
    // someone hiring who really spoke to a worker: one tap to book what they agreed
    const o = CALLS[id] ? otherOf(CALLS[id]) : '';
    if (spoke.current && o && !working() && !db.BOOKINGS.some((b) => b.worker === o && b.client === 'me' && b.state !== 'confirmed')) setTimeout(() => openAfterCall(o, THREADS()[o]?.job || ''), close ? 1700 : 500);
  };
  // (getit opened straight onto the call from the lock screen has nothing behind it: go to the chats)
  const leave = () => (router.canGoBack() ? router.back() : router.replace((db.loggedIn ? '/inbox' : '/') as any));

  /** Accept: the phone's own microphone question comes now, before the call is answered (a refusal leaves it ringing). */
  const accept = async () => {
    if (answering.current || done.current) return;
    if (!(await callPermissions(call?.kind || CALLS[id]?.kind || 'voice'))) return;
    if (answering.current || done.current) return;
    answering.current = true;
    if (await answerCall(id, true)) void join(call?.kind || CALLS[id]?.kind || 'voice');
    else finish('Call ended', false);
  };

  /** Join the call's Agora channel with a pass from the server. */
  const join = async (kind: 'voice' | 'video') => {
    if (joined.current || !agora) return;
    joined.current = true;
    stopRing();
    setPhase('connecting');
    if (Platform.OS === 'android') {
      // normally already allowed before the call started or was answered; this is the last safety net
      const mic = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO).catch(() => true);
      if (!mic && !(await callPermissions(kind))) return finish('Microphone is off', true);
    }
    const pass = await callPass(id);
    if ('error' in pass) {
      toast(pass.error);
      return finish('Couldn’t connect', true);
    }
    try {
      const engine = agora.createAgoraRtcEngine();
      engine.initialize({ appId: pass.appId, channelProfile: agora.ChannelProfileType.ChannelProfileCommunication });
      handler.current = {
        onUserJoined: (_c: any, uid: number) => {
          setRemote(uid);
          spoke.current = true;
          setPhase('live');
        },
        onUserOffline: () => finish('Call ended', true),
        onConnectionLost: () => finish('Connection lost', true),
        onError: (err: number) => console.warn('agora error', err),
      };
      engine.registerEventHandler(handler.current);
      engine.enableAudio();
      if (kind === 'video') {
        engine.enableVideo();
        engine.startPreview();
      }
      engine.setDefaultAudioRouteToSpeakerphone(kind === 'video');
      setSpeaker(kind === 'video');
      engine.joinChannel(pass.token, pass.channel, pass.uid, {
        clientRoleType: agora.ClientRoleType.ClientRoleBroadcaster,
        publishMicrophoneTrack: true,
        publishCameraTrack: kind === 'video',
        autoSubscribeAudio: true,
        autoSubscribeVideo: kind === 'video',
      });
      eng.current = engine;
    } catch (e) {
      console.warn(e);
      finish('Couldn’t connect', true);
    }
  };

  // load the call, then follow it live
  useEffect(() => {
    if (answer) askAnswer(id);
    if (!enterCallScreen(id)) {
      extra.current = true;
      done.current = true;
      leave();
      return;
    }
    let alive = true;
    setActiveCall(id);
    // from here this screen rings: the pop-up that rang while getit was closed stops
    if (incoming) void clearCallPopups();
    (async () => {
      const c = CALLS[id] || (await loadCall(id));
      if (!alive) return;
      if (!c) return finish('Call not found', false);
      setCall(c);
      if (c.status === 'ringing') setPhase(c.callee_id === db.uid ? 'incoming' : 'calling');
      else if (c.status === 'accepted') void join(c.kind);
      else finish('Call ended', false);
    })();
    const off = onCall((c) => {
      if (c.id !== id) return;
      setCall(c);
      if (c.status === 'accepted' && !incoming) void join(c.kind);
      // the same account answered on another phone: this one stops ringing and steps aside (it must not hang up their call)
      if (c.status === 'accepted' && incoming && !answering.current && !joined.current) finish('Answered on another device', false);
      if (c.status === 'declined') finish('Declined', false);
      if (c.status === 'missed') finish(incoming ? 'Missed call' : 'No answer', false);
      if (c.status === 'ended') finish('Call ended', false);
    });
    return () => {
      alive = false;
      off();
      leaveCallScreen(id);
      // leaving the screen hangs up
      if (!done.current) finish('Call ended', true, false);
      setActiveCall(null, id);
      stopRing();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // the sound of the call: the tone while their phone rings, the ringtone while mine does
  useEffect(() => {
    if (phase === 'calling') ring('out');
    else if (phase === 'incoming') ring('in');
    else if (phase !== 'ended') stopRing();
  }, [phase]);

  // Accept was tapped outside the app: answer as soon as the call is here and still ringing
  useEffect(() => {
    if (phase === 'incoming' && takeAnswer(id)) void accept();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, call]);

  // nobody answers: give up after 45 seconds
  useEffect(() => {
    if (phase !== 'calling' && phase !== 'incoming') return;
    const x = setTimeout(() => finish(phase === 'calling' ? 'No answer' : 'Missed call', true), RING_LIMIT);
    return () => clearTimeout(x);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // call timer
  useEffect(() => {
    if (phase !== 'live') return;
    const x = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(x);
  }, [phase]);
  // tell the server this call is still going (see callAlive)
  useEffect(() => {
    if (phase !== 'live' && phase !== 'connecting') return;
    callAlive(id);
    const x = setInterval(() => callAlive(id), 15000);
    return () => clearInterval(x);
  }, [phase, id]);

  const status =
    phase === 'incoming' ? (video ? 'Video call for you' : 'Calling you') : phase === 'calling' ? 'Ringing…' : phase === 'connecting' ? 'Connecting…' : phase === 'live' ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : phase === 'ended' ? endText : '';
  const Surface = agora?.RtcSurfaceView;
  const showRemote = video && phase === 'live' && remote != null && Surface;
  const showLocal = video && (phase === 'connecting' || phase === 'live') && !camOff && Surface;

  // over a live video picture the buttons are always the dark set, so they stay readable on any picture
  const over = !!showRemote;
  const ink = over ? '#ffffff' : t.text;
  const soft = over ? 'rgba(255, 255, 255, 0.8)' : t.muted;
  const topic = other ? THREADS()[other]?.job : '';
  const ringing = phase === 'calling' || phase === 'incoming';

  const Ctl = ({ icon, label, on, onPress, fill, big, turn, testID }: { icon: GIconName; label: string; on?: boolean; onPress: () => void; fill?: string; big?: boolean; turn?: boolean; testID?: string }) => {
    const size = big ? 72 : 64;
    return (
      <View style={{ alignItems: 'center', gap: 8, width: 76 }}>
        <Pressable
          testID={testID}
          accessibilityRole="button"
          accessibilityLabel={label}
          accessibilityState={on == null ? undefined : { selected: on }}
          onPress={() => (tap(), onPress())}
          style={({ pressed }) => ({ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', borderWidth: fill || on ? 0 : 1, borderColor: over ? 'rgba(255, 255, 255, 0.3)' : t.line, backgroundColor: fill || (on ? ink : over ? 'rgba(0, 0, 0, 0.45)' : t.card), opacity: pressed ? 0.8 : 1 })}
        >
          <View style={turn ? { transform: [{ rotate: '135deg' }] } : undefined}>
            <GIcon name={icon} size={big ? 28 : 24} color={fill ? '#ffffff' : on ? (over ? '#111111' : t.bg) : ink} />
          </View>
        </Pressable>
        <T s={12} c={soft} center lines={1}>
          {label}
        </T>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: over ? '#000000' : t.bg }}>
      {showRemote ? <Surface style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} canvas={{ uid: remote }} /> : null}
      {showLocal ? (
        <View style={{ position: 'absolute', right: 16, top: ins.top + 16, width: 110, height: 160, borderRadius: 20, overflow: 'hidden', borderWidth: 2, borderColor: over ? 'rgba(255, 255, 255, 0.3)' : t.line, zIndex: 2 }}>
          <Surface style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      ) : null}

      {!showRemote ? (
        <View style={{ flex: 1, alignItems: 'center', paddingTop: ins.top + 48, paddingHorizontal: 24 }}>
          <T s={14} w={7} c={t.muted} center>
            {phase === 'incoming' ? 'Incoming getit call' : 'getit call · your number stays private'}
          </T>
          <View style={{ width: 260, height: 260, alignItems: 'center', justifyContent: 'center', marginTop: 24 }}>
            <Rings on={ringing} />
            {p ? <Face name={p.name} photo={p.photo} size={120} /> : null}
          </View>
          <T s={28} w={8} center lines={2} style={{ marginTop: 14 }}>
            {p?.name || ''}
          </T>
          <T testID="call-status" s={15} c={t.muted} center style={{ marginTop: 4 }}>
            {status}
          </T>
          {topic ? (
            <View style={{ alignSelf: 'stretch', marginTop: 26, paddingVertical: 14, paddingHorizontal: 16, borderRadius: 20, backgroundColor: t.card, borderWidth: 1, borderColor: t.line }}>
              <T s={12} w={7} c={t.muted}>
                About
              </T>
              <T s={16} w={7} lines={2} style={{ marginTop: 4 }}>
                {topic}
              </T>
            </View>
          ) : null}
        </View>
      ) : (
        <View style={{ position: 'absolute', top: ins.top + 16, left: 16, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 16, backgroundColor: 'rgba(0, 0, 0, 0.45)' }}>
          <T s={15} w={8} c="#ffffff">
            {p?.name ? fname(p.name) : ''}
          </T>
          <T testID="call-status" s={13} c="rgba(255, 255, 255, 0.85)">
            {status}
          </T>
        </View>
      )}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: ins.bottom + 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: phase === 'incoming' ? 90 : video ? 14 : 34 }}>
        {phase === 'incoming' ? (
          <>
            <Ctl testID="call-decline" icon="phone" turn big label="Decline" fill={END} onPress={() => (answerCall(id, false), finish('Declined', false))} />
            <Ctl testID="call-accept" icon={video ? 'video' : 'phone'} big label="Answer" fill={ANSWER} onPress={accept} />
          </>
        ) : phase === 'ended' ? null : video ? (
          <>
            <Ctl
              icon={muted ? 'mute' : 'mic'}
              label={muted ? 'Unmute' : 'Mute'}
              on={muted}
              onPress={() => {
                eng.current?.muteLocalAudioStream(!muted);
                setMuted(!muted);
              }}
            />
            <Ctl
              icon="video"
              label={camOff ? 'Camera on' : 'Camera off'}
              on={camOff}
              onPress={() => {
                eng.current?.enableLocalVideo(camOff);
                setCamOff(!camOff);
              }}
            />
            <Ctl testID="call-end" icon="phone" turn big label="End" fill={END} onPress={() => finish('Call ended', true)} />
            <Ctl icon="flip" label="Flip" onPress={() => eng.current?.switchCamera()} />
          </>
        ) : (
          <>
            <Ctl
              icon="speaker"
              label="Speaker"
              on={speaker}
              onPress={() => {
                eng.current?.setEnableSpeakerphone(!speaker);
                setSpeaker(!speaker);
              }}
            />
            <Ctl testID="call-end" icon="phone" turn big label="End" fill={END} onPress={() => finish('Call ended', true)} />
            <Ctl
              icon={muted ? 'mute' : 'mic'}
              label={muted ? 'Unmute' : 'Mute'}
              on={muted}
              onPress={() => {
                eng.current?.muteLocalAudioStream(!muted);
                setMuted(!muted);
              }}
            />
          </>
        )}
      </View>
    </View>
  );
}
