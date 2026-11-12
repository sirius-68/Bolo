import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { toast } from '../ui/overlay';

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

/** Pick a photo from the library (or the camera). Returns a "uri:" picture reference or null. */
export async function pickImage(opts: { camera?: boolean; square?: boolean; front?: boolean } = {}): Promise<string | null> {
  try {
    let r: ImagePicker.ImagePickerResult;
    if (opts.camera) {
      const p = await ImagePicker.requestCameraPermissionsAsync();
      if (!p.granted) {
        toast('Allow camera access in your phone settings');
        return null;
      }
      r = await ImagePicker.launchCameraAsync({ allowsEditing: !!opts.square, aspect: [1, 1], quality: 0.7, cameraType: opts.front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back });
    } else {
      r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: !!opts.square, aspect: [1, 1], quality: 0.7 });
    }
    if (r.canceled || !r.assets?.length) return null;
    return 'uri:' + keep(r.assets[0].uri);
  } catch {
    toast('Couldn’t open your photos');
    return null;
  }
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
export async function pickImages(max: number): Promise<string[]> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted && perm.accessPrivileges !== 'limited') {
      toast('Allow access to your photos in your phone settings');
      return [];
    }
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: max, quality: 0.7 });
    if (r.canceled) return [];
    const good: string[] = [];
    const bad: string[] = [];
    r.assets.slice(0, max).forEach((a) => {
      const e = checkAsset(a);
      if (e) bad.push(e);
      else good.push('uri:' + keep(a.uri));
    });
    if (bad.length) toast(`${bad.length} photo${bad.length > 1 ? 's' : ''} skipped: ${bad[0]}`);
    return good;
  } catch {
    toast('Couldn’t open your photos');
    return [];
  }
}
/** Take one photo with the camera (validated like gallery photos). */
export async function takePhoto(): Promise<string | null> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast(perm.canAskAgain ? 'Camera permission is needed to take a photo' : 'Allow camera access in your phone settings');
      return null;
    }
    const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (r.canceled || !r.assets?.length) return null;
    const e = checkAsset(r.assets[0]);
    if (e) {
      toast(e);
      return null;
    }
    return 'uri:' + keep(r.assets[0].uri);
  } catch {
    toast('Couldn’t open the camera');
    return null;
  }
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
