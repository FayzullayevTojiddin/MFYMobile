import NetInfo from "@react-native-community/netinfo";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { locationService } from "./services/locationService";
import { notificationService } from "./services/notificationService";

export default function RootLayout() {
  useEffect(() => {
    notificationService.registerBackgroundTask();
    const cleanupNotifications =
      notificationService.setupNotificationListeners();

    const cleanupNetInfo = NetInfo.addEventListener((state) => {
      if (state.isConnected) {
        locationService.syncQueue();
      }
    });

    return () => {
      cleanupNotifications();
      cleanupNetInfo();
    };
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
