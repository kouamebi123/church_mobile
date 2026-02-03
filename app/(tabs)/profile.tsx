import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import ProfileScreen from '../profile';

export default function ProfileTab() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <ProfileScreen />;
}

