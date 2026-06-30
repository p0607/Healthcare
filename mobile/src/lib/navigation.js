import { useEffect } from 'react';

import { BackHandler, Platform } from 'react-native';

import { useRouter } from 'expo-router';



/** Signed-in users cannot return to the public homepage without logging out. */

export function useLandingBackHandler({ enabled = true } = {}) {

  const router = useRouter();



  useEffect(() => {

    if (!enabled || Platform.OS !== 'android') return undefined;



    const onBack = () => {

      if (router.canGoBack()) {

        router.back();

        return true;

      }

      // Stay on the current dashboard screen.

      return true;

    };



    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);

    return () => sub.remove();

  }, [enabled, router]);

}

