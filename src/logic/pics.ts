/* Small shared bits of the data layer. */
/** A picture reference: a uri ("uri:https://…") or initials on a colour ("logo:TW|#f3dfb4|#14161c"). */
export type Pic = string;
export const logoPic = (t: string, bg: string, fg = '#000') => `logo:${t}|${bg}|${fg}`;
/** What the connection is doing (read by the screens that show a quiet "loading" or "offline" state). */
export const net = { loading: false, offline: false, opening: true };
