import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { View } from 'react-native';

import { AuthSessionProvider, useAuthSession } from '@/features/auth/auth-session-provider';
import { colors } from '@/theme/tokens';
import { SyncStatus } from '@/features/sync/SyncStatus';
import { appEnvironment } from '@/core/config/env';
import { EmptyState } from '@/components/EmptyState';

void SplashScreen.preventAutoHideAsync();

function RootNavigator({ fontsLoaded }: Readonly<{ fontsLoaded: boolean }>) {
  const { state } = useAuthSession();
  const ready = fontsLoaded && state.status !== 'booting';

  useEffect(() => {
    if (ready) void SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return <View style={{ flex: 1, backgroundColor: colors.paper }} />;

  const authenticated = state.status === 'authenticated';
  if (appEnvironment.mode === 'unconfigured') return <View style={{flex:1,justifyContent:'center',backgroundColor:colors.paper}}><EmptyState icon="settings" title="Conecta Marea" description="Configura EXPO_PUBLIC_SUPABASE_URL y EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY en mobile/.env y reinicia Expo. La aplicación necesita tu backend para comenzar." /></View>;

  return (
    <>
      <StatusBar style="dark" />
      <SyncStatus />
      <Stack
        initialRouteName={authenticated ? '(tabs)' : '(auth)'}
        screenOptions={{
          contentStyle: { backgroundColor: colors.paper },
          headerShown: false,
        }}>
        <Stack.Protected guard={!authenticated}>
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={authenticated}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="profile" />
          <Stack.Screen name="post" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="story" options={{presentation:'fullScreenModal'}} />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Inter_400Regular: require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
    Inter_500Medium: require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
    Inter_600SemiBold: require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
    Inter_700Bold: require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
    Inter_800ExtraBold: require('@expo-google-fonts/inter/800ExtraBold/Inter_800ExtraBold.ttf'),
  });

  return (
    <AuthSessionProvider>
      <RootNavigator fontsLoaded={loaded || Boolean(fontError)} />
    </AuthSessionProvider>
  );
}
