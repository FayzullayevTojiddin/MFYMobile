import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { locationService } from "./services/locationService";
import { notificationService } from "./services/notificationService";
import { storage } from "./storage";

export default function RootLayout() {
  useEffect(() => {
    // Background notification task
    notificationService.registerBackgroundTask();

    // Foreground listener'lar
    const cleanup = notificationService.setupNotificationListeners();

    // Agar oldin login bo'lgan bo'lsa, tracking'ni davom ettirish
    (async () => {
      const token = await storage.getToken();
      if (token) {
        await locationService.startBackgroundTracking();
      }
    })();

    return cleanup;
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor="#0f1b2d" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="login" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="task/[id]" />
        <Stack.Screen name="rank" />
      </Stack>
    </SafeAreaProvider>
  );
}
