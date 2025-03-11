import { Redirect } from 'expo-router';

// This file redirects from /joinchallenges to /joinchallenges/challengesettings
// ensuring that when a user clicks on the Challenges tab, they always go to Your Challenges screen
export default function Index() {
  return <Redirect href="/joinchallenges/challengesettings" />;
}