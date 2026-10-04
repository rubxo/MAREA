import Feather from '@expo/vector-icons/Feather';
import { Tabs } from 'expo-router';
import { ColorValue } from 'react-native';

import { colors } from '@/theme/tokens';

type TabIconName = React.ComponentProps<typeof Feather>['name'];

function tabIcon(name: TabIconName) {
  return function TabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <Feather name={name} color={color} size={size} />;
  };
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coral,
        tabBarInactiveTintColor: colors.mutedInk,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.hairline,
          height: 72,
          paddingTop: 7,
          paddingBottom: 10,
        },
        tabBarLabelStyle: {
          fontFamily: 'Inter_600SemiBold',
          fontSize: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Inicio', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explorar', tabBarIcon: tabIcon('search') }}
      />
      <Tabs.Screen
        name="create"
        options={{ title: 'Crear', tabBarIcon: tabIcon('plus-square') }}
      />
      <Tabs.Screen
        name="activity"
        options={{ title: 'Actividad', tabBarIcon: tabIcon('heart') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Perfil', tabBarIcon: tabIcon('user') }}
      />
    </Tabs>
  );
}
