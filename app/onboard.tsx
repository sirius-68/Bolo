import { Redirect } from 'expo-router';

/** The old introduction slides: getit starts on one opening screen instead. */
export default function Onboard() {
  return <Redirect href="/splash" />;
}
