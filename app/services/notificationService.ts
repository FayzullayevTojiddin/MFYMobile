import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { locationService } from "./locationService";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

// Background'da FCM xabar kelganda ishlaydi
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error) {
      console.error("❌ Background task xatosi:", error);
      return;
    }

    const notificationData = (data as any)?.notification?.data;
    if (notificationData?.type === "location_request") {
      console.log("📍 Background: GPS so'ralmoqda...");
      await locationService.sendRealTimeLocation();
    }
  },
);

Notifications.setNotificationHandler({
  handleNotification: async () =>
    ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }) as Notifications.NotificationBehavior,
});

export const notificationService = {
  async getFcmToken(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        await Notifications.setNotificationChannelAsync("default", {
          name: "default",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0ea5e9",
        });
      }

      const { status: existingStatus } =
        await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== "granted") {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== "granted") {
        console.log("❌ Notification ruxsati berilmadi");
        return null;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      console.log("✅ FCM token:", tokenData.data);
      return tokenData.data as string;
    } catch (error) {
      console.error("❌ FCM token xatosi:", error);
      return null;
    }
  },

  async registerBackgroundTask() {
    try {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log("✅ Background notification task ro'yxatdan o'tdi");
    } catch (error) {
      console.error("❌ Background task xatosi:", error);
    }
  },

  setupNotificationListeners() {
    const receivedListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;
        if (data?.type === "location_request") {
          console.log("📍 Foreground: GPS so'ralmoqda...");
          await locationService.sendRealTimeLocation();
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener((response) => {
        console.log("👆 Notification bosildi:", response);
      });

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  },
};
