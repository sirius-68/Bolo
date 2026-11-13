/* Call sounds: the tone you hear while the other phone rings, the ringtone for a call coming in,
   and a short tone when a call ends. Played with the video player the app already ships (it plays
   sound files too), so nothing new has to be installed. Every step is guarded: a phone that cannot
   play a sound still makes and takes calls. */
import { createVideoPlayer, VideoPlayer } from 'expo-video';

const SOUNDS = {
  out: require('../../assets/sounds/ringback.mp3'),
  in: require('../../assets/sounds/ringtone.mp3'),
  end: require('../../assets/sounds/callend.mp3'),
};
let player: VideoPlayer | null = null;
let playing: keyof typeof SOUNDS | null = null;

function drop() {
  const p = player;
  player = null;
  playing = null;
  if (!p) return;
  try {
    p.pause();
  } catch {}
  try {
    p.release();
  } catch {}
}

/** Start a call sound (replaces the one that is playing). `out` and `in` repeat until stopRing(). */
export function ring(kind: keyof typeof SOUNDS) {
  if (playing === kind) return;
  drop();
  try {
    const p = createVideoPlayer(SOUNDS[kind]);
    p.loop = kind !== 'end';
    p.volume = kind === 'in' ? 1 : 0.6;
    p.audioMixingMode = 'duckOthers';
    p.staysActiveInBackground = kind !== 'end';
    p.play();
    player = p;
    playing = kind;
    if (kind === 'end') setTimeout(() => playing === 'end' && player === p && drop(), 1500);
  } catch {
    drop();
  }
}
export function stopRing() {
  if (playing && playing !== 'end') drop();
}
