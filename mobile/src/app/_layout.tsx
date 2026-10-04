import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthSessionProvider, useAuthSession } from '@/features/auth/auth-session-provider';
import { colors } from '@/theme/tokens';

void SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsLoaded }: Readonly<{ fontsLoaded: boolean }>) {
  const { state } = useAuthSession();
  const ready = fontsLoaded && state.status !== 'booting';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  const authenticated = state.status === 'authenticated';

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.paper },
          headerShown: false,
        }}>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" />
        </Stack.Protected>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    Inter_800ExtraBold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
  });

  return (
    <AuthSessionProvider>
      <RootNavigator fontsLoaded={loaded} />
    </AuthSessionProvider>
  );
}
