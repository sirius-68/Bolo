/* Speech to words, on the phone itself (the phone's own speech service). */
/** The speech add-on, loaded with care: a phone without it (or without a speech service) types instead. */
let mod: any = null;
try {
  mod = require('expo-speech-recognition').ExpoSpeechRecognitionModule;
} catch {}
/** The module, or null on a phone or build without it. */
export const SR: any = mod;
/** True when this phone can turn speech into words right now. */
export function canListen() {
  try {
    return !!SR && SR.isRecognitionAvailable();
  } catch {
    return false;
  }
}
