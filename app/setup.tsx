/* The moment right after an account is made with a password (the sign-in sheet's "I have a password" way).
   getit asks nothing more here: someone who came to offer a skill already chose it, and goes to "You're on getit";
   everyone else goes straight to the home screen. */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { startApp } from '../src/logic/account';
import { resetTo } from '../src/logic/nav';
import { markStarted, setMode } from '../src/g/data';
import { useG } from '../src/g/theme';
import { applyWorkerDraft, hasWorkerDraft } from '../src/g/worker';

export default function Setup() {
  const t = useG();
  useEffect(() => {
    const work = hasWorkerDraft();
    startApp(false);
    markStarted();
    if (work && applyWorkerDraft()) return resetTo('/wdone');
    setMode('hire');
    resetTo('/find');
  }, []);
  return <View style={{ flex: 1, backgroundColor: t.bg }} />;
}
