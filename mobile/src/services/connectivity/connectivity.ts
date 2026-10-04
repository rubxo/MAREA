import * as Network from 'expo-network';

export type ConnectivitySnapshot = Readonly<{
  isOnline: boolean;
  connectionType: Network.NetworkStateType;
}>;

function toSnapshot(state: Network.NetworkState): ConnectivitySnapshot {
  return {
    isOnline: state.isConnected === true && state.isInternetReachable !== false,
    connectionType: state.type ?? Network.NetworkStateType.UNKNOWN,
  };
}

export class ConnectivityMonitor {
  async getCurrent(): Promise<ConnectivitySnapshot> {
    return toSnapshot(await Network.getNetworkStateAsync());
  }

  subscribe(listener: (snapshot: ConnectivitySnapshot) => void): () => void {
    const subscription = Network.addNetworkStateListener((state) => listener(toSnapshot(state)));
    return () => subscription.remove();
  }
}
