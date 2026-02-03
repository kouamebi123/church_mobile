import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ServicesScreen from '../services';

export default function ServicesTab() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <ServicesScreen />;
}

