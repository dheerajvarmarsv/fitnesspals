// app/survival-test.tsx
import SurvivalChallengeTest from '../components/SurvivalChallengeTest';
import { Stack } from 'expo-router';

export default function SurvivalTestScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Survival Challenge Test" }} />
      <SurvivalChallengeTest />
    </>
  );
}