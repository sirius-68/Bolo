import { Redirect } from 'expo-router';

/** The old welcome screen: getit starts on one opening screen instead. */
export default function Welcome() {
  return <Redirect href="/splash" />;
}
