import { Redirect } from 'expo-router';

// This file redirects from /joinchallenges to /joinchallenges/challengesettings
export default function Index() {
  return <Redirect href="/joinchallenges/challengesettings" />;
}