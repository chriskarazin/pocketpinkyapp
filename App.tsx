import { useState, useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';

import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  PlayfairDisplay_600SemiBold,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_900Black
} from '@expo-google-fonts/playfair-display';
import { Allura_400Regular } from '@expo-google-fonts/allura';
import {
  Inter_400Regular,
  Inter_600SemiBold,
  Inter_700Bold
} from '@expo-google-fonts/inter';
import { Feather } from '@expo/vector-icons';

import { ChatScreen, ProfileScreen, WelcomeScreen, AuthScreen } from './src/screens';
import { Toast } from './src/components';
import { colors, spacing, typography } from './src/theme';
import { supabase } from './src/services/supabase';
import { Session } from '@supabase/supabase-js';

import { createDrawerNavigator } from '@react-navigation/drawer';
import { Sidebar } from './src/components';
import { useUpdates } from './src/hooks/useUpdates';

const { width } = Dimensions.get('window');

const Drawer = createDrawerNavigator();

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();



export default function App() {
  useUpdates();
  const [showWelcome, setShowWelcome] = useState(true);
  const [session, setSession] = useState<Session | null>(null);
  const [toast, setToast] = useState<{ visible: boolean; message: string; type: 'success' | 'error' }>({
    visible: false,
    message: '',
    type: 'error',
  });

  const showToast = (message: string, type: 'success' | 'error' = 'error') => {
    setToast({ visible: true, message, type });
  };

  const [fontsLoaded] = useFonts({
    PlayfairDisplay_600SemiBold,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_900Black,
    Allura_400Regular,
    Inter_400Regular,
    Inter_600SemiBold,
    Inter_700Bold,
  });



  const lastToken = useRef<string | null>(null);

  useEffect(() => {
    console.log('[App] MOUNTED');

    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        if (session) {
          console.log('[App] Initial Session Found:', session.user.email);
          lastToken.current = session.access_token;
          setSession(session);
        }
      })
      .catch((error) => {
        // Silently clear invalid/expired tokens — no error shown to user
        console.log('[App] getSession error (clearing session):', error?.message);
        setSession(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.access_token === lastToken.current && _event !== 'SIGNED_OUT') {
        return;
      }

      console.log(`[App] Auth State Change Event: ${_event}`);

      if (_event === 'SIGNED_OUT' && lastToken.current !== null) {
        showToast('Your session has expired. Please sign in again.');
      }

      lastToken.current = session?.access_token || null;
      setSession(session);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);


  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  // Render logic moved directly into the function body to avoid anti-pattern
  let mainContent;
  if (showWelcome) {
    mainContent = <WelcomeScreen onFinish={() => setShowWelcome(false)} />;
  } else if (!session) {
    mainContent = <AuthScreen />;
  } else {
    mainContent = (
      <NavigationContainer>
        <StatusBar style="light" />
        <Drawer.Navigator
          drawerContent={(props) => <Sidebar {...props} />}
          screenOptions={{
            headerShown: false,
            drawerType: 'front',
            drawerStyle: {
              width: '63%',
              backgroundColor: colors.cream,
            },
            overlayColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Drawer.Screen name="Chat" component={ChatScreen} />
          <Drawer.Screen name="Profile" component={ProfileScreen} />
        </Drawer.Navigator>
      </NavigationContainer>
    );
  }

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <View style={{ flex: 1 }}>
        {mainContent}
        <Toast
          visible={toast.visible}
          message={toast.message}
          type={toast.type}
          onHide={() => setToast((prev) => ({ ...prev, visible: false }))}
        />
      </View>
    </SafeAreaProvider>
  );
}


const styles = StyleSheet.create({

});

