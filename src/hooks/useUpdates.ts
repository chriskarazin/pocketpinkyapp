import { useEffect } from 'react';
import { Alert } from 'react-native';
import * as Updates from 'expo-updates';

export const useUpdates = () => {
  useEffect(() => {
    async function onFetchUpdateAsync() {
      try {
        if (__DEV__) return; // Don't check for updates in development

        const update = await Updates.checkForUpdateAsync();

        if (update.isAvailable) {
          Alert.alert(
            'Update Available',
            'A new version of Pink Pill is available. Would you like to update now?',
            [
              {
                text: 'Later',
                style: 'cancel',
              },
              {
                text: 'Update Now',
                onPress: async () => {
                  try {
                    await Updates.fetchUpdateAsync();
                    await Updates.reloadAsync();
                  } catch (error) {
                    Alert.alert('Error', 'Failed to fetch the update. Please try again later.');
                  }
                },
              },
            ]
          );
        }
      } catch (error) {
        // You can log this to an error reporting service
        console.log('Error checking for updates:', error);
      }
    }

    onFetchUpdateAsync();
  }, []);
};
