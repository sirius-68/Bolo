/* Someone's profile, as a client sees it. `service`: the service the person looking needs, when they came from a request. */
import React from 'react';
import { useLocalSearchParams } from 'expo-router';
import { WorkerProfile } from '../../src/g/WorkerProfile';

export default function Profile() {
  const { id, service } = useLocalSearchParams<{ id: string; service?: string }>();
  return <WorkerProfile id={id} service={typeof service === 'string' && service ? service : undefined} />;
}
