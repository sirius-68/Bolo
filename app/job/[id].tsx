import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { db } from '../../src/data/db';
import { C } from '../../src/ui/theme';
import { toast } from '../../src/ui/overlay';
import { postById } from '../../src/logic/core';
import { openJob } from '../../src/sheets/work';

/** Opened by a shared job link (getit://job/<id>; links shared before the new name, bolo://job/<id>, still open): shows that job on top of Home. */
export default function JobLink() {
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    if (!db.loggedIn) {
      toast('Log in to see this job');
      router.replace('/');
      return;
    }
    router.replace('/find');
    setTimeout(() => (postById(id) ? openJob(id) : toast('This job is no longer available')), 450);
  }, [id]);
  return <View style={{ flex: 1, backgroundColor: C.bg }} />;
}
