import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { locationService } from "./locationService";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";

TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error) return;

    const notificationData = (data as any)?.notification?.data;
    if (
      notificationData?.type === "location_request" ||
      notificationData?.type === "scheduled_location"
    ) {
      await locationService.sendLocation(
        notificationData?.type === "location_request",
      );
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

      if (finalStatus !== "granted") return null;

      const tokenData = await Notifications.getDevicePushTokenAsync();
      return tokenData.data as string;
    } catch {
      return null;
    }
  },

  async registerBackgroundTask() {
    try {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
    } catch {}
  },

  setupNotificationListeners() {
    const receivedListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;
        if (
          data?.type === "location_request" ||
          data?.type === "scheduled_location"
        ) {
          await locationService.sendLocation(data?.type === "location_request");
        }
      },
    );

    const responseListener =
      Notifications.addNotificationResponseReceivedListener(() => {});

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  },
};
