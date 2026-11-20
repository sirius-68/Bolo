/* Someone's profile, as a client sees it. */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WorkerProfile } from '../../src/g/WorkerProfile';

export default function Profile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkerProfile id={id} />;
}
