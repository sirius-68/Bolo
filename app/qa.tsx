/* For the automatic tours only (test builds that talk to the test server): makes an account without a code,
   because a robot can't read an email. Opened with a link (getit://qa?email=…&password=…&name=…).
   In the real app this screen does nothing and goes home. */
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db } from '../src/data/db';
import { SUPABASE_URL } from '../src/lib/supabase';
import { startApp } from '../src/logic/account';
import { bump } from '../src/logic/live';
import { signIn, signUp } from '../src/logic/remote';
import { markStarted, setMode } from '../src/g/data';
import { useG } from '../src/g/theme';
import { T, gsheet } from '../src/g/ui';
import { applyWorkerDraft, hasWorkerDraft } from '../src/g/worker';

const LIVE = /uwthkgtgemxakicvqugp/.test(SUPABASE_URL);

export default function Qa() {
  const t = useG();
  const p = useLocalSearchParams<{ email?: string; password?: string; name?: string }>();
  const [note, setNote] = useState('Signing in for the tour…');
  useEffect(() => {
    (async () => {
      gsheet.close();
      if (LIVE || !p.email || !p.password) return router.replace('/find' as any);
      if (!db.loggedIn) {
        const r = await signUp(String(p.email), String(p.password), { name: String(p.name || 'Tour') });
        if (r.error && /already|registered|exists/i.test(r.error)) {
          const e = await signIn(String(p.email), String(p.password));
          if (e) return setNote(e);
        } else if (r.error) return setNote(r.error);
        if (!db.user.name) db.user.name = String(p.name || 'Tour');
        db.user.contact = db.user.contact || String(p.email);
        startApp(false);
        bump();
      }
      markStarted();
      if (hasWorkerDraft() && applyWorkerDraft()) return router.replace('/wdone' as any);
      // someone who already offers a skill comes back working; everyone else hiring
      setMode(db.user.skills.length ? 'work' : 'hire');
      router.replace('/find' as any);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <T testID="qa-note" s={15} c="muted" center>
        {note}
      </T>
    </View>
  );
}
