import React, { useEffect, useRef, useState } from 'react';
import { PermissionsAndroid, Platform, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Txt } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { toast } from '../src/ui/overlay';
import { P, fname } from '../src/logic/core';
import { useLive } from '../src/logic/live';
import { db } from '../src/data/db';
import { CALLS, Call, agora, answerCall, callPass, endCall, loadCall, onCall, otherOf, setActiveCall } from '../src/logic/calls';
import { ring, stopRing } from '../src/logic/ring';

type Phase = 'loading' | 'incoming' | 'calling' | 'connecting' | 'live' | 'ended';
const RING_LIMIT = 45_000;

/** A voice or video call through Agora. Opened for calls you start, and when someone calls you. */
export default function CallScreen() {
  useLive();
  const { id, incoming } = useLocalSearchParams<{ id: string; incoming?: string }>();
  const ins = useSafeAreaInsets();
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
  const done = useRef(false);

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
    if (close) setTimeout(() => (router.canGoBack() ? router.back() : router.replace('/inbox' as any)), 1200);
  };

  /** Join the call's Agora channel with a pass from the server. */
  const join = async (kind: 'voice' | 'video') => {
    if (joined.current || !agora) return;
    joined.current = true;
    stopRing();
    setPhase('connecting');
    if (Platform.OS === 'android') {
      const want = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO, ...(kind === 'video' ? [PermissionsAndroid.PERMISSIONS.CAMERA] : [])];
      const res = await PermissionsAndroid.requestMultiple(want);
      if (res[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] !== 'granted') {
        toast('Allow the microphone to make calls');
        return finish('Microphone is off', true);
      }
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
    let alive = true;
    setActiveCall(id);
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
      if (c.status === 'declined') finish('Declined', false);
      if (c.status === 'missed') finish(incoming ? 'Missed call' : 'No answer', false);
      if (c.status === 'ended') finish('Call ended', false);
    });
    return () => {
      alive = false;
      off();
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

  // nobody answers: give up after 45 seconds
  useEffect(() => {
    if (phase !== 'calling' && phase !== 'incoming') return;
    const t = setTimeout(() => finish(phase === 'calling' ? 'No answer' : 'Missed call', true), RING_LIMIT);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // call timer
  useEffect(() => {
    if (phase !== 'live') return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  const status =
    phase === 'incoming' ? `Incoming ${video ? 'video' : 'voice'} call` : phase === 'calling' ? 'Calling…' : phase === 'connecting' ? 'Connecting…' : phase === 'live' ? `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}` : phase === 'ended' ? endText : '';
  const Surface = agora?.RtcSurfaceView;
  const showRemote = video && phase === 'live' && remote != null && Surface;
  const showLocal = video && (phase === 'connecting' || phase === 'live') && !camOff && Surface;

  const Ctl = ({ icon, label, on, onPress, red }: { icon: string; label: string; on?: boolean; onPress: () => void; red?: boolean }) => (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={{ alignItems: 'center', gap: 6 }}>
      <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: red ? C.err : on ? '#fff' : 'rgba(255,255,255,.14)' }}>
        <Icon name={icon} size={26} color={red ? '#fff' : on ? '#000' : '#fff'} />
      </View>
      <Txt s={12} c="rgba(255,255,255,.8)">
        {label}
      </Txt>
    </Pressable>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#05050a' }}>
      {showRemote ? <Surface style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} canvas={{ uid: remote }} /> : null}
      {showLocal ? (
        <View style={{ position: 'absolute', right: 16, top: ins.top + 16, width: 110, height: 160, borderRadius: 18, overflow: 'hidden', borderWidth: 2, borderColor: 'rgba(255,255,255,.3)', zIndex: 2 }}>
          <Surface style={{ flex: 1 }} canvas={{ uid: 0 }} zOrderMediaOverlay />
        </View>
      ) : null}

      {!showRemote ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingTop: ins.top }}>
          {p ? <Avatar pic={p.photo} size={128} ring={phase === 'incoming' ? C.yellow : undefined} /> : null}
          <Txt s={26} w={8} center>
            {p?.name || ''}
          </Txt>
          <Txt testID="call-status" s={15} c={phase === 'live' ? C.mint : 'rgba(255,255,255,.7)'} center>
            {status}
          </Txt>
        </View>
      ) : (
        <View style={{ position: 'absolute', top: ins.top + 16, left: 16, padding: 10, borderRadius: 14, backgroundColor: 'rgba(0,0,0,.45)' }}>
          <Txt s={15} w={8}>
            {p?.name ? fname(p.name) : ''}
          </Txt>
          <Txt s={13} c={C.mint}>
            {status}
          </Txt>
        </View>
      )}

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: ins.bottom + 28, paddingHorizontal: 24 }}>
        {phase === 'incoming' ? (
          <View style={[S.rowB, { paddingHorizontal: 30 }]}>
            <Ctl icon="hangup" label="Decline" red onPress={() => (answerCall(id, false), finish('Declined', false))} />
            <Pressable
              testID="call-accept"
              accessibilityRole="button"
              accessibilityLabel="Accept"
              onPress={async () => {
                if (await answerCall(id, true)) void join(call?.kind || 'voice');
                else finish('Call ended', false);
              }}
              style={{ alignItems: 'center', gap: 6 }}
            >
              <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: C.ok }}>
                <Icon name={video ? 'video' : 'phone'} size={26} color="#fff" />
              </View>
              <Txt s={12} c="rgba(255,255,255,.8)">
                Accept
              </Txt>
            </Pressable>
          </View>
        ) : phase === 'ended' ? null : (
          <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
            <Ctl
              icon={muted ? 'micoff' : 'mic'}
              label={muted ? 'Unmute' : 'Mute'}
              on={muted}
              onPress={() => {
                eng.current?.muteLocalAudioStream(!muted);
                setMuted(!muted);
              }}
            />
            {video ? (
              <Ctl
                icon={camOff ? 'video2' : 'video'}
                label={camOff ? 'Camera on' : 'Camera off'}
                on={camOff}
                onPress={() => {
                  eng.current?.enableLocalVideo(camOff);
                  setCamOff(!camOff);
                }}
              />
            ) : (
              <Ctl
                icon="speaker"
                label="Speaker"
                on={speaker}
                onPress={() => {
                  eng.current?.setEnableSpeakerphone(!speaker);
                  setSpeaker(!speaker);
                }}
              />
            )}
            {video ? <Ctl icon="cam" label="Flip" onPress={() => eng.current?.switchCamera()} /> : null}
            <Ctl icon="hangup" label="End" red onPress={() => finish('Call ended', true)} />
          </View>
        )}
      </View>
    </View>
  );
}
