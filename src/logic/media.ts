import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { toast } from '../g/notice';

/** Copy a picked file into app storage so it survives restarts. */
function keep(uri: string) {
  try {
    const src = new File(uri);
    const name = `p_${Date.now()}_${Math.floor(Math.random() * 1e4)}.${(uri.split('.').pop() || 'jpg').slice(0, 4)}`;
    const dst = new File(Paths.document, name);
    src.copy(dst);
    return dst.uri;
  } catch {
    return uri;
  }
}

/** Photo resizing (missing in builds made before it was added: photos then go up as they are). */
const manip: any = (() => {
  try {
    return require('expo-image-manipulator');
  } catch {
    return null;
  }
})();
const XImage: any = (() => {
  try {
    return require('expo-image').Image;
  } catch {
    return null;
  }
})();
/** Make a photo small enough to send and show quickly: longest side at most `max` pixels, saved as JPEG.
    Phone cameras now take 50 to 200-megapixel photos: opening one at full size needs more memory than an app
    gets, and the phone refuses. So the photo is first read at a reduced size (which never needs the full
    picture in memory), then saved as a JPEG of a few hundred KB that looks the same on a phone screen. */
async function shrink(a: { uri: string; width?: number; height?: number }, max = 1600): Promise<string> {
  const fmt = manip?.SaveFormat?.JPEG ?? 'jpeg';
  // 1. read small, save (safe for very large photos)
  try {
    if (XImage?.loadAsync && manip?.ImageManipulator?.manipulate) {
      const ref = await XImage.loadAsync({ uri: a.uri }, { maxWidth: max, maxHeight: max });
      const ctx = manip.ImageManipulator.manipulate(ref);
      const w = ref?.width || 0;
      const h = ref?.height || 0;
      if (Math.max(w, h) > max) ctx.resize(w >= h ? { width: max } : { height: max });
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ compress: 0.72, format: fmt });
      if (out?.uri) return out.uri;
    }
  } catch (e) {
    note('shrink-small', e);
  }
  // 2. the older way (fine for ordinary photos)
  try {
    if (!manip?.manipulateAsync) return a.uri;
    const w = a.width || 0;
    const h = a.height || 0;
    const big = Math.max(w, h) > max;
    const r = await manip.manipulateAsync(a.uri, big ? [{ resize: w >= h ? { width: max } : { height: max } }] : [], { compress: 0.72, format: fmt });
    return r?.uri || a.uri;
  } catch (e) {
    note('shrink', e);
    return a.uri;
  }
}
/** Why a photo step failed: to the app's log and to error monitoring. Never shown to people as is. */
function note(where: string, e: any) {
  const msg = String(e?.message || e || '').slice(0, 300);
  console.warn(`getit photo: ${where}: ${msg}`);
  try {
    require('../lib/monitor').report(new Error(`photo ${where}: ${msg}`));
  } catch {}
}

/** Pick a photo from the library (or the camera). Returns a "uri:" picture reference or null.
    The phone hands the photo over untouched (quality 1): getit makes it smaller itself, safely (see shrink).
    Asking the phone to recompress it made very large photos fail with "Couldn’t open your photos". */
export async function pickImage(opts: { camera?: boolean; square?: boolean; front?: boolean } = {}): Promise<string | null> {
  const base = { mediaTypes: ['images'] as any, allowsEditing: !!opts.square, aspect: [1, 1] as [number, number], quality: 1, exif: false };
  let r: ImagePicker.ImagePickerResult | null = null;
  if (opts.camera) {
    try {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) {
        toast('Allow camera access in your phone settings');
        return null;
      }
      r = await ImagePicker.launchCameraAsync({ ...base, cameraType: opts.front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back });
    } catch (e) {
      note('camera', e);
      toast('Couldn’t open the camera. You can upload a photo instead');
      return null;
    }
  } else {
    // the phone's photo picker; if this phone's picker fails, its older picker; then its file chooser
    try {
      r = await ImagePicker.launchImageLibraryAsync(base);
    } catch (e) {
      note('library', e);
      try {
        r = await ImagePicker.launchImageLibraryAsync({ ...base, allowsEditing: false, legacy: true } as any);
      } catch (e2) {
        note('library-legacy', e2);
        try {
          const d = await DocumentPicker.getDocumentAsync({ type: 'image/*', copyToCacheDirectory: true });
          if (d.canceled || !d.assets?.length) return null;
          return 'uri:' + keep(await shrink({ uri: d.assets[0].uri }, opts.square ? 800 : 1600));
        } catch (e3) {
          note('files', e3);
          toast('Couldn’t open your photos. Check that getit may see photos in your phone settings');
          return null;
        }
      }
    }
  }
  if (!r || r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const bad = a.mimeType && !/^image\//i.test(a.mimeType);
  if (bad) {
    toast('Choose a photo (not a video or a file)');
    return null;
  }
  return 'uri:' + keep(await shrink(a, opts.square ? 800 : 1600));
}
/** Photos for listings: JPEG, PNG, WebP or HEIC, up to 10 MB each. */
export const MAX_PHOTO_MB = 10;
const OK_TYPES = /^image\/(jpe?g|png|webp|heic|heif)$/i;
const OK_EXT = /\.(jpe?g|png|webp|heic|heif)$/i;
function checkAsset(a: ImagePicker.ImagePickerAsset): string | null {
  const type = a.mimeType || '';
  if (type ? !OK_TYPES.test(type) : !OK_EXT.test(a.fileName || a.uri)) return 'Only JPG, PNG, WebP or HEIC photos';
  if (a.fileSize && a.fileSize > MAX_PHOTO_MB * 1024 * 1024) return `Photos must be under ${MAX_PHOTO_MB} MB`;
  return null;
}
export async function pickDocument(types: string[] = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']): Promise<{ name: string; size: number; uri: string; mime?: string } | null> {
  try {
    // copied into the app's cache so it can be uploaded (Android content:// links can't be read directly)
    const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: true });
    if (r.canceled || !r.assets?.length) return null;
    const a = r.assets[0];
    return { name: a.name, size: a.size || 120 * 1024, uri: a.uri, mime: a.mimeType };
  } catch {
    toast('Couldn’t open your files');
    return null;
  }
}
