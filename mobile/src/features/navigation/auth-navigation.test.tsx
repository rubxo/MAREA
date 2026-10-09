import { Text } from 'react-native';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import RootLayout from '@/app/_layout';
import AuthLayout from '@/app/(auth)/_layout';
import { Stack } from 'expo-router';

let mockAuthenticated = false;
const mockListeners = new Set<() => void>();
jest.mock('expo-font', () => ({ useFonts: () => [true] }));
jest.mock('expo-splash-screen', () => ({ preventAutoHideAsync: jest.fn(), hideAsync: jest.fn() }));
jest.mock('@/features/sync/SyncStatus', () => ({ SyncStatus: () => null }));
jest.mock('@/core/config/env', () => ({ appEnvironment: { mode: 'remote' } }));
jest.mock('@/features/auth/auth-session-provider', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  return {
    AuthSessionProvider: ({ children }: import('react').PropsWithChildren) => children,
    useAuthSession: () => ({ state: { status: React.useSyncExternalStore(
      (listener: () => void) => { mockListeners.add(listener); return () => { mockListeners.delete(listener); }; },
      () => mockAuthenticated ? 'authenticated' : 'anonymous',
    ) } }),
  };
});

function renderApp(initialUrl = '/') {
  return renderRouter({
    _layout: RootLayout,
    '(auth)/_layout': AuthLayout,
    '(tabs)/_layout': () => <Stack />,
    '(auth)/index': () => <Text>LOGIN_SCREEN</Text>,
    '(tabs)/index': () => <Text>FEED_SCREEN</Text>,
    'profile/_layout': () => <Stack />,
    'post/_layout': () => <Stack />,
    'messages/_layout': () => <Stack />,
    'story/_layout': () => <Stack />,
    'profile/index': () => <Text>PROFILE_SCREEN</Text>,
    'post/index': () => <Text>POST_SCREEN</Text>,
    'messages/index': () => <Text>MESSAGES_SCREEN</Text>,
    'story/index': () => <Text>STORY_SCREEN</Text>,
  }, { initialUrl });
}
beforeEach(() => { mockAuthenticated = false; });

it('opens the feed when a real session has already been restored', () => {
  mockAuthenticated = true;
  renderApp();
  expect(screen.getByText('FEED_SCREEN')).toBeVisible();
});

it('opens login when a signed-out user opens the app', () => {
  renderApp();
  expect(screen.getByText('LOGIN_SCREEN')).toBeVisible();
});
it('redirects a protected entry to login', () => {
  renderApp('/messages');
  expect(screen.getByText('LOGIN_SCREEN')).toBeVisible();
});
it('switches login to feed after authentication and back after sign-out', () => {
  renderApp();
  act(() => { mockAuthenticated = true; mockListeners.forEach(listener => listener()); });
  expect(screen.getByText('FEED_SCREEN')).toBeVisible();
  act(() => { mockAuthenticated = false; mockListeners.forEach(listener => listener()); });
  expect(screen.getByText('LOGIN_SCREEN')).toBeVisible();
});
