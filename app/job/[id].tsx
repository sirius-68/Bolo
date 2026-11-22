/* A shared link to a request (getit://job/<id>): opens it the right way for whoever taps it. */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { postById } from '../../src/logic/core';
import { loadPost } from '../../src/logic/server';
import { useG } from '../../src/g/theme';

export default function JobLink() {
  const t = useG();
  const { id } = useLocalSearchParams<{ id: string }>();
  useEffect(() => {
    (async () => {
      if (id && !postById(id)) await loadPost(id).catch(() => {});
      const po = id ? postById(id) : undefined;
      router.replace((po ? (po.mine ? (po.agent === '1' ? `/agent/${po.id}` : `/asked/${po.id}`) : `/wrequest/${po.id}`) : '/find') as any);
    })();
  }, [id]);
  return <View style={{ flex: 1, backgroundColor: t.bg }} />;
}
