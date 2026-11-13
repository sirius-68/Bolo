/* Links people can really open. There is no bolo website yet, so nothing in the app points at one:
   - APP_LINK: where to get the app (set EXPO_PUBLIC_APP_LINK when there is a store page or a site)
   - inApp(): a link that opens a screen inside bolo for someone who already has it */
import * as Linking from 'expo-linking';

export const APP_LINK = process.env.EXPO_PUBLIC_APP_LINK || 'https://github.com/sirius-68/Bolo/releases/latest';
export const inApp = (path: string) => Linking.createURL(path);
/** Ending for share messages: open it in bolo, or get bolo first. */
export const shareTail = (path?: string) => (path ? `Open in bolo: ${inApp(path)}\n` : '') + `Get bolo: ${APP_LINK}`;
