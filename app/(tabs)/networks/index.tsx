import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../../store';
import NetworksScreen from '../../networks';

export default function NetworksTab() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <NetworksScreen />;
}

