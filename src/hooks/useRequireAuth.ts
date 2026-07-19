import { useNavigation } from '@react-navigation/native';
import type { NavigationProp } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import type { RootStackParamList } from '../types/navigation';

// Kimlik gerektiren bir aksiyondan (mesaj gonder, ilan ver, favori) once
// cagir: giris yapilmamissa Auth ekranini modal olarak acar ve false doner.
export function useRequireAuth() {
  const { user } = useAuth();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();

  return (): boolean => {
    if (user) return true;
    navigation.navigate('Auth');
    return false;
  };
}
