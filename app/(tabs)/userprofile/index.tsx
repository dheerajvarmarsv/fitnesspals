import { Redirect } from 'expo-router';

// This file redirects from /userprofile to /userprofile/profilesettings
export default function Index() {
  return <Redirect href="/userprofile/profilesettings" />;
}