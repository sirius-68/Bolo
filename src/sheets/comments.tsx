/* Comments under a post, the way people know them from Instagram: like a comment, reply to it (replies sit in a
   thread under the comment and open with "View replies"), hold a comment for more (copy, delete, report).
   The box to write in stays at the bottom of the sheet, above the keyboard. */
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, TextInput, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Avatar, OptRow, Txt, Verified, tap } from '../ui/kit';
import { Icon } from '../ui/Icon';
import { afterSheet, sheet, SheetTitle } from '../ui/overlay';
import { C, S, tx } from '../ui/theme';
import { P, fname, myPhoto } from '../logic/core';
import { Cmt, addComment, canDeleteComment, canThread, cmtName, commentsLoading, commentsOf, deleteComment, likeComment, threadsOf } from '../logic/comments';
import { useLive } from '../logic/live';
import { openProfile } from '../logic/nav';
import { openReport } from './safety';

/** What the list and the writing box share: who is being answered, and which threads are open. */
const st = { reply: null as Cmt | null, open: {} as Record<string, boolean> };
const subs = new Set<() => void>();
const poke = () => subs.forEach((f) => f());
function useSt() {
  const [, f] = useState(0);
  useEffect(() => {
    const s = () => f((x) => x + 1);
    subs.add(s);
    return () => {
      subs.delete(s);
    };
  }, []);
}

export function openComments(id: string) {
  st.reply = null;
  st.open = {};
  sheet.show(() => <Comments id={id} />, { tag: 'cmt:' + id, full: true, footer: () => <Box id={id} /> });
}

function answer(c: Cmt) {
  tap();
  st.reply = c;
  // the thread being answered opens, so the reply is seen when it lands
  st.open[c.parent || c.id] = true;
  poke();
}

function menu(id: string, c: Cmt) {
  tap();
  sheet.show(
    () => (
      <View>
        <View style={{ padding: 12, borderRadius: 16, backgroundColor: C.s2, marginBottom: 10 }}>
          <Txt s={12} w={8} c={C.muted}>
            {cmtName(c)}
          </Txt>
          <Txt s={14} lines={4}>
            {c.t}
          </Txt>
        </View>
        {canThread() ? <OptRow icon="chat" title="Reply" chev={false} onPress={() => (sheet.close(), answer(c))} /> : null}
        <OptRow
          icon="file"
          bg="#fff"
          title="Copy"
          chev={false}
          onPress={() => {
            Clipboard.setStringAsync(c.t).catch(() => {});
            sheet.close('Copied');
          }}
        />
        {canDeleteComment(id, c) ? <OptRow testID="cmt-delete" icon="trash" bg={C.pink} title={c.by === 'me' ? 'Delete' : 'Delete this comment'} sub={c.by === 'me' ? undefined : 'It is under your post'} chev={false} onPress={() => (sheet.close(), deleteComment(id, c.id))} /> : null}
        {c.by !== 'me' ? <OptRow icon="flag" bg={C.s3} title="Report" sub="Tell bolo something is wrong with it" chev={false} onPress={() => openReport('comment', c.id)} /> : null}
      </View>
    ),
    { over: true },
  );
}

function Line({ id, c, small }: { id: string; c: Cmt; small?: boolean }) {
  const p = c.by === 'me' ? null : P(c.by);
  const at = c.t.match(/^@\S+/);
  return (
    <Pressable testID="cmt-row" onLongPress={() => menu(id, c)} delayLongPress={300} accessibilityHint="Hold for more" style={{ flexDirection: 'row', gap: 10, paddingVertical: 7 }}>
      <Pressable accessibilityLabel={`${cmtName(c)}’s profile`} onPress={() => afterSheet(() => openProfile(c.by))}>
        <Avatar pic={p ? p.photo : myPhoto()} size={small ? 28 : 36} />
      </Pressable>
      <View style={{ flex: 1 }}>
        <View style={[S.row, { gap: 5 }]}>
          <Txt s={13} w={8} lines={1} style={{ flexShrink: 1 }}>
            {cmtName(c)}
          </Txt>
          {p?.verified ? <Verified size={12} /> : null}
          <Txt s={11} c={C.muted}>
            {c.at}
          </Txt>
        </View>
        <Txt s={14} c="#d9d9de" style={{ lineHeight: 20 }}>
          {at ? (
            <Txt s={14} w={7} c={C.lav}>
              {at[0]}
            </Txt>
          ) : null}
          {at ? c.t.slice(at[0].length) : c.t}
        </Txt>
        <View style={[S.row, { gap: 16, marginTop: 4 }]}>
          {c.likes ? (
            <Txt s={12} w={7} c={C.muted}>
              {c.likes} like{c.likes === 1 ? '' : 's'}
            </Txt>
          ) : null}
          {canThread() ? (
            <Pressable testID="cmt-reply" hitSlop={8} onPress={() => answer(c)}>
              <Txt s={12} w={8} c={C.muted}>
                Reply
              </Txt>
            </Pressable>
          ) : null}
        </View>
      </View>
      {canThread() ? (
        <Pressable testID="cmt-like" accessibilityRole="button" accessibilityLabel={c.liked ? 'Unlike this comment' : 'Like this comment'} hitSlop={10} onPress={() => (tap(), likeComment(id, c.id))} style={{ width: 30, alignItems: 'center', paddingTop: 6 }}>
          <Icon name="heart" size={17} color={c.liked ? C.pink : C.faint} />
        </Pressable>
      ) : null}
    </Pressable>
  );
}

function Comments({ id }: { id: string }) {
  useLive();
  useSt();
  const T = threadsOf(id);
  const n = commentsOf(id).length;
  return (
    <View>
      <SheetTitle sub={n ? `${n} comment${n === 1 ? '' : 's'}` : undefined}>Comments</SheetTitle>
      {commentsLoading(id) ? (
        <View style={{ paddingVertical: 40, alignItems: 'center' }} accessibilityLabel="Loading comments">
          <ActivityIndicator color={C.yellow} />
        </View>
      ) : !n ? (
        <View testID="cmt-empty" style={{ paddingVertical: 36, alignItems: 'center', gap: 6 }}>
          <Icon name="chat" size={30} color={C.faint} />
          <Txt s={16} w={8}>
            No comments yet
          </Txt>
          <Txt s={13} c={C.muted} center>
            Start the conversation.
          </Txt>
        </View>
      ) : (
        <View style={{ marginTop: 6 }}>
          {T.map(({ c, replies }) => {
            const open = st.open[c.id] ?? replies.length <= 2;
            return (
              <View key={c.id}>
                <Line id={id} c={c} />
                {replies.length ? (
                  <View style={{ marginLeft: 46 }}>
                    <Pressable
                      testID="cmt-replies"
                      hitSlop={6}
                      onPress={() => {
                        st.open[c.id] = !open;
                        poke();
                      }}
                      style={[S.row, { gap: 8, paddingVertical: 4 }]}
                    >
                      <View style={{ width: 24, height: 1, backgroundColor: C.s3 }} />
                      <Txt s={12} w={8} c={C.muted}>
                        {open ? 'Hide replies' : `View ${replies.length} ${replies.length === 1 ? 'reply' : 'replies'}`}
                      </Txt>
                    </Pressable>
                    {open ? replies.map((r) => <Line key={r.id} id={id} c={r} small />) : null}
                  </View>
                ) : null}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/** The writing box under the list. */
function Box({ id }: { id: string }) {
  useSt();
  const [v, setV] = useState('');
  const input = useRef<TextInput>(null);
  const to = st.reply;
  // "Reply" on a comment: name them at the start, and bring up the keyboard
  useEffect(() => {
    if (!to) return;
    const who = to.by === 'me' ? '' : '@' + fname(P(to.by)?.name || '').replace(/\s+/g, '') + ' ';
    setV((cur) => (cur.trim() && !cur.startsWith('@') ? cur : who));
    setTimeout(() => input.current?.focus(), 60);
  }, [to?.id]);
  const send = () => {
    if (!v.trim()) return;
    addComment(id, v, to || undefined);
    setV('');
    st.reply = null;
    poke();
  };
  return (
    <View style={{ gap: 6 }}>
      {to ? (
        <View style={[S.rowB, { paddingHorizontal: 12, height: 32, borderRadius: 10, backgroundColor: C.s2 }]}>
          <Txt s={12} c={C.muted} lines={1} style={{ flex: 1 }}>
            Replying to{' '}
            <Txt s={12} w={8}>
              {cmtName(to)}
            </Txt>
          </Txt>
          <Pressable
            testID="cmt-reply-cancel"
            accessibilityLabel="Cancel reply"
            hitSlop={10}
            onPress={() => {
              st.reply = null;
              setV((cur) => (cur.startsWith('@') && !cur.includes(' ', cur.indexOf(' ') + 1) ? '' : cur));
              poke();
            }}
          >
            <Icon name="x" size={16} color={C.muted} />
          </Pressable>
        </View>
      ) : null}
      <View style={[S.row, { gap: 8, alignItems: 'flex-end' }]}>
        <Avatar pic={myPhoto()} size={40} />
        <TextInput
          ref={input}
          testID="cmt-input"
          value={v}
          onChangeText={setV}
          placeholder={to ? `Reply to ${cmtName(to)}…` : 'Add a comment…'}
          placeholderTextColor={C.faint}
          multiline
          maxLength={500}
          selectionColor={C.yellow}
          accessibilityLabel="Comment"
          style={[tx(15, 5, C.text), { flex: 1, minHeight: 44, maxHeight: 110, paddingHorizontal: 16, paddingTop: 11, paddingBottom: 11, borderRadius: 22, backgroundColor: C.s2 }]}
        />
        <Pressable testID="cmt-send" accessibilityLabel="Send" onPress={send} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: v.trim() ? C.yellow : C.s3, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="send" size={19} color="#000" />
        </Pressable>
      </View>
    </View>
  );
}
