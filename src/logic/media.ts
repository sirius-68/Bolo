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
export async function pickImages(max: number): Promise<string[]> {
  try {
    const r = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: max, quality: 0.7 });
    if (r.canceled) return [];
    return r.assets.slice(0, max).map((a) => 'uri:' + keep(a.uri));
  } catch {
    toast('Couldn’t open your photos');
    return [];
  }
}
export async function pickDocument(types: string[] = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']): Promise<{ name: string; size: number } | null> {
  try {
    const r = await DocumentPicker.getDocumentAsync({ type: types, copyToCacheDirectory: false });
    if (r.canceled || !r.assets?.length) return null;
    return { name: r.assets[0].name, size: r.assets[0].size || 120 * 1024 };
  } catch {
    toast('Couldn’t open your files');
    return null;
  }
}
