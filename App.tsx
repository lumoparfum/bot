import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './src/context/AuthContext';
import { FavoritesProvider } from './src/context/FavoritesContext';
import RootNavigator from './src/navigation/RootNavigator';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <FavoritesProvider>
          <NavigationContainer>
            <RootNavigator />
            <StatusBar style="dark" />
          </NavigationContainer>
        </FavoritesProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
