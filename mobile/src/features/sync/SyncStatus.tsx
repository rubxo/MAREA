import { useEffect, useState } from 'react';
import { AppState, Pressable, Text } from 'react-native';
import { useAuthSession } from '@/features/auth/auth-session-provider';
import { ConnectivityMonitor } from '@/services/connectivity/connectivity';
import { getSocialRuntime, RuntimeSnapshot } from '@/services/sync/social-runtime';
import { colors } from '@/theme/tokens';

export function SyncStatus() {
  const { state } = useAuthSession();
  const userId = state.status === 'authenticated' ? state.session.userId : null;
  const [online, setOnline] = useState(true);
  const [snapshot, setSnapshot] = useState<RuntimeSnapshot | null>(null);
  useEffect(() => {
    if (!userId) return;
    let alive = true;
    let unsub: (() => void) | undefined;
    const monitor = new ConnectivityMonitor();
    const storageFailed = () => {
      if (alive) setSnapshot({ pending: 0, failed: 0, revision: 0, error: 'No se pudo abrir el almacenamiento local. Cierra y vuelve a abrir la app.' });
    };
    const run = () => {
      if (AppState.currentState !== 'active') return;
      void monitor.getCurrent().then(async net => {
        if (!alive) return;
        setOnline(net.isOnline);
        if (net.isOnline) {
          try { await (await getSocialRuntime(userId)).sync(); }
          catch { storageFailed(); }
        }
      }).catch(() => { if (alive) setOnline(false); });
    };
    void getSocialRuntime(userId).then(runtime => {
      if (!alive) return;
      setSnapshot(runtime.snapshot);
      unsub = runtime.subscribe(() => { if (alive) setSnapshot(runtime.snapshot); });
      run();
    }).catch(storageFailed);
    const disconnect = monitor.subscribe(() => run());
    const app = AppState.addEventListener('change', run);
    const timer = setInterval(run, 5000);
    return () => { alive = false; unsub?.(); disconnect(); app.remove(); clearInterval(timer); };
  }, [userId]);
  if (!userId || (online && !snapshot?.pending && !snapshot?.error)) return null;
  return <Pressable accessibilityRole="button" onPress={() => void getSocialRuntime(userId).then(r => r.retryFailed()).catch(() => {
    setSnapshot({ pending: 0, failed: 0, revision: 0, error: 'El almacenamiento local no está disponible. Cierra y vuelve a abrir la app.' });
  })}
    style={{ padding: 10, backgroundColor: colors.surface }}>
    <Text style={{ color: colors.deepBlue, textAlign: 'center', fontSize: 12 }}>
      {snapshot?.error ?? (!online ? 'Sin conexión · tus cambios se guardan aquí' : snapshot?.failed ? 'Hay cambios pendientes de revisión. Toca para reintentar.' : 'Sincronizando ' + snapshot?.pending + ' cambios…')}
    </Text>
  </Pressable>;
}
