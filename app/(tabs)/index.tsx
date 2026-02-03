import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import HomeScreen from '../home';

export default function TabIndex() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  // Si l'utilisateur n'est pas connecté, rediriger vers login
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return <HomeScreen />;
}
