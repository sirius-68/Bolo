import React, { useCallback, useRef, useState } from 'react';
import { BackHandler, Linking, Share, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as Clipboard from 'expo-clipboard';
import { AlertIll, Btn, IconBtn, OptRow, Txt, Missing } from '../src/ui/kit';
import { Icon } from '../src/ui/Icon';
import { C, S } from '../src/ui/theme';
import { afterSheet, sheet, SheetTitle, toast } from '../src/ui/overlay';
import { db } from '../src/data/db';
import { useLive } from '../src/logic/live';
import { domainOf, isSavedCourse, priceLabel, toggleSaveCourse } from '../src/logic/listings';
import { openAbout } from '../src/components/CourseListing';
import { openReport } from '../src/sheets/safety';

/** A course's own website, opened inside bolo. Only https pages load here; anything else opens outside. */
export default function Web() {
  useLive();
  const { url, title, cid } = useLocalSearchParams<{ url: string; title?: string; cid?: string }>();
  const ins = useSafeAreaInsets();
  const ref = useRef<WebView>(null);
  const [pct, setPct] = useState(0);
  const [err, setErr] = useState(false);
  const [back, setBack] = useState(false);
  const [cur, setCur] = useState(url);
  const [key, setKey] = useState(0);
  const c = cid ? db.COURSES.find((x) => x.id === cid) : undefined;
  const close = () => (router.canGoBack() ? router.back() : router.replace('/career' as any));
  useFocusEffect(
    useCallback(() => {
      const s = BackHandler.addEventListener('hardwareBackPress', () => {
        if (back) {
          ref.current?.goBack();
          return true;
        }
        return false;
      });
      return () => s.remove();
    }, [back]),
  );
  const outside = () => Linking.openURL(cur || url).catch(() => toast('Couldn’t open the browser'));
  // Only a listed course's own site opens inside bolo. A link from outside the app can't use this screen
  // to show some other website under bolo's name.
  const safe = !!c && !!c.url && /^https:\/\//i.test(url || '') && domainOf(url) === domainOf(c.url);
  if (!safe) return <Missing bar="Course" title="This page can’t be opened here" text="Open the course from Career → Courses." />;
  return (
    <View style={{ flex: 1, backgroundColor: C.bg, paddingTop: ins.top }}>
      {/* header: close · title + site · save · more */}
      <View style={[S.row, { gap: 8, paddingHorizontal: 12, height: 60 }]}>
        <IconBtn testID="web-close" name="x" label="Close" onPress={close} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <Txt s={14} w={8} lines={1}>
            {c.title || title || domainOf(cur)}
          </Txt>
          <View style={[S.row, { gap: 4 }]}>
            <Icon name="lock" size={11} color={C.mint} />
            <Txt testID="web-domain" s={12} c={C.muted} lines={1}>
              {domainOf(cur)}
            </Txt>
          </View>
        </View>
        {c ? <IconBtn testID="web-save" name="bookmark" bg={isSavedCourse(c.id) ? C.yellow : undefined} color={isSavedCourse(c.id) ? '#000' : undefined} label={isSavedCourse(c.id) ? 'Remove from saved' : 'Save course'} onPress={() => toggleSaveCourse(c.id)} /> : null}
        <IconBtn testID="web-more" name="dots" label="More" onPress={() => openMore()} />
      </View>
      <View style={{ height: 2, backgroundColor: C.s1 }}>{pct < 1 && !err ? <View style={{ width: `${Math.max(8, pct * 100)}%`, height: 2, backgroundColor: C.yellow }} /> : null}</View>

      {err ? (
        <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 10 }}>
          <AlertIll icon="globe" bg={C.s2} color={C.yellow} />
          <Txt s={20} w={8} center>
            Couldn’t open {domainOf(cur)}
          </Txt>
          <Txt s={13} c={C.muted} center>
            Check your connection, or open it in your browser.
          </Txt>
          <Btn variant="yellow" title="Try again" style={{ marginTop: 10 }} onPress={() => (setErr(false), setKey(key + 1))} />
          <Btn variant="dark" icon="globe" title="Open in browser" onPress={outside} />
        </View>
      ) : (
        <WebView
          key={key}
          ref={ref}
          testID="web-view"
          source={{ uri: url }}
          style={{ flex: 1, backgroundColor: '#fff' }}
          onLoadProgress={({ nativeEvent }) => setPct(nativeEvent.progress)}
          onNavigationStateChange={(n) => (setBack(n.canGoBack), n.url?.startsWith('https://') && setCur(n.url))}
          onError={() => setErr(true)}
          onHttpError={({ nativeEvent }) => nativeEvent.statusCode >= 500 && setErr(true)}
          onShouldStartLoadWithRequest={(r) => {
            if (r.url.startsWith('https://') || r.url === 'about:blank') return true;
            // mail, phone, app links, plain http: hand over to the phone
            Linking.openURL(r.url).catch(() => {});
            return false;
          }}
          setSupportMultipleWindows={false}
          allowsBackForwardNavigationGestures
          mixedContentMode="never"
          pullToRefreshEnabled
        />
      )}
    </View>
  );

  function openMore() {
    sheet.show(() => (
      <View style={{ gap: 8 }}>
        <SheetTitle sub={c ? `${c.prov.n} · ${priceLabel(c)}` : domainOf(cur)}>{c ? c.title : domainOf(cur)}</SheetTitle>
        {c ? <OptRow testID="web-about" icon="cap" bg={C.lav} title="About this course" sub="Details, and ratings from bolo members" onPress={() => (sheet.close(), afterSheet(() => openAbout(c.id)))} /> : null}
        <OptRow icon="globe" bg={C.s2} iconColor={C.text} title="Open in browser" onPress={() => (sheet.close(), outside())} />
        <OptRow icon="share" bg={C.s2} iconColor={C.text} title="Share" onPress={() => (sheet.close(), Share.share({ message: `${title ? title + ': ' : ''}${cur || url}` }).catch(() => {}))} />
        <OptRow icon="file" bg={C.s2} iconColor={C.text} title="Copy link" onPress={() => (Clipboard.setStringAsync(cur || url).catch(() => {}), sheet.close('Link copied'))} />
        {c && !c.mine ? <OptRow icon="flag" bg={C.s2} iconColor={C.err} title="Report this listing" sub="Wrong link, scam or misleading" onPress={() => (sheet.close(), afterSheet(() => openReport('course', c.id)))} /> : null}
      </View>
    ));
  }
}
