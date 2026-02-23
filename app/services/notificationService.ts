import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";
import * as TaskManager from "expo-task-manager";
import { Platform } from "react-native";
import { locationService } from "./locationService";

const BACKGROUND_NOTIFICATION_TASK = "BACKGROUND_NOTIFICATION_TASK";
const MEET_ALARM_PREFIX = "meet_alarm_";
const MEET_ALARM_COUNT = 40; // 40 ta bildirishnoma
const MEET_ALARM_INTERVAL = 15; // Har 15 soniyada (40 * 15 = 10 daqiqa)

// Background task handler
TaskManager.defineTask(
  BACKGROUND_NOTIFICATION_TASK,
  async ({ data, error }) => {
    if (error) return;

    const notificationData = (data as any)?.notification?.data;

    // Location so'rovlari
    if (
      notificationData?.type === "location_request" ||
      notificationData?.type === "scheduled_location"
    ) {
      await locationService.sendLocation(
        notificationData?.type === "location_request",
      );
    }

    // Uchrashuv taklifi — alarm boshlash
    if (notificationData?.type === "meet_invite") {
      await meetAlarmService.startAlarm(
        notificationData.meet_id,
        notificationData.title || "Yangi uchrashuv",
        notificationData.body || "Uchrashuvga taklif qilindingiz!",
      );
    }
  },
);

// Foreground notification handler
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    // Meet alarm bildirishnomalari uchun har doim ko'rsat
    if (data?.type === "meet_invite" || data?.type === "meet_alarm") {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      } as Notifications.NotificationBehavior;
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    } as Notifications.NotificationBehavior;
  },
});

// Uchrashuv alarm xizmati
export const meetAlarmService = {
  // Android uchun alarm kanalini yaratish
  async setupAlarmChannel() {
    if (Platform.OS === "android") {
      await Notifications.setNotificationChannelAsync("meet-alarm", {
        name: "Uchrashuv bildirishnomalari",
        description: "Uchrashuvga taklif bildirishnomalari (muhim)",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 500, 200, 500, 200, 500, 200, 500],
        sound: "default",
        lockscreenVisibility:
          Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDno: true,
        enableVibrate: true,
        enableLights: true,
        lightColor: "#ef4444",
      } as any);
    }
  },

  // Alarm boshlash — takrorlanuvchi bildirishnomalar rejalashtirish
  async startAlarm(meetId: number, title: string, body: string) {
    // Avvalgi alarmni bekor qilish
    await this.cancelAlarm(meetId);

    const identifiers: string[] = [];

    for (let i = 0; i < MEET_ALARM_COUNT; i++) {
      try {
        const id = await Notifications.scheduleNotificationAsync({
          content: {
            title: `🔔 ${title}`,
            body: body,
            data: { type: "meet_alarm", meet_id: meetId },
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
            ...(Platform.OS === "android" ? { channelId: "meet-alarm" } : {}),
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
            seconds: MEET_ALARM_INTERVAL * (i + 1),
          },
        });
        identifiers.push(id);
      } catch (err) {
        console.error("Alarm schedule error:", err);
      }
    }

    // ID larni saqlash
    await AsyncStorage.setItem(
      `${MEET_ALARM_PREFIX}${meetId}`,
      JSON.stringify(identifiers),
    );

    // Faol alarmlar ro'yxatiga qo'shish
    const activeAlarms = await this.getActiveAlarms();
    if (!activeAlarms.includes(meetId)) {
      activeAlarms.push(meetId);
      await AsyncStorage.setItem(
        "active_meet_alarms",
        JSON.stringify(activeAlarms),
      );
    }
  },

  // Alarmni bekor qilish
  async cancelAlarm(meetId: number) {
    try {
      const stored = await AsyncStorage.getItem(
        `${MEET_ALARM_PREFIX}${meetId}`,
      );
      if (stored) {
        const ids: string[] = JSON.parse(stored);
        for (const id of ids) {
          await Notifications.cancelScheduledNotificationAsync(id);
        }
        await AsyncStorage.removeItem(`${MEET_ALARM_PREFIX}${meetId}`);
      }

      // Faol ro'yxatdan olib tashlash
      const activeAlarms = await this.getActiveAlarms();
      const updated = activeAlarms.filter((id) => id !== meetId);
      await AsyncStorage.setItem(
        "active_meet_alarms",
        JSON.stringify(updated),
      );

      // Shu meet uchun ko'rsatilgan bildirishnomalarni ham o'chirish
      const presented =
        await Notifications.getPresentedNotificationsAsync();
      for (const notif of presented) {
        if (
          notif.request.content.data?.meet_id === meetId &&
          (notif.request.content.data?.type === "meet_alarm" ||
            notif.request.content.data?.type === "meet_invite")
        ) {
          await Notifications.dismissNotificationAsync(
            notif.request.identifier,
          );
        }
      }
    } catch (err) {
      console.error("Cancel alarm error:", err);
    }
  },

  // Barcha alarmlarni bekor qilish
  async cancelAllAlarms() {
    const activeAlarms = await this.getActiveAlarms();
    for (const meetId of activeAlarms) {
      await this.cancelAlarm(meetId);
    }
    await AsyncStorage.setItem("active_meet_alarms", JSON.stringify([]));
  },

  // Faol alarm ro'yxatini olish
  async getActiveAlarms(): Promise<number[]> {
    try {
      const stored = await AsyncStorage.getItem("active_meet_alarms");
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
};

export const notificationService = {
  async getFcmToken(): Promise<string | null> {
    try {
      if (Platform.OS === "android") {
        // Default kanal
        await Notifications.setNotificationChannelAsync("default", {
          name: "Umumiy",
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: "#0ea5e9",
        });

        // Meet alarm kanali
        await meetAlarmService.setupAlarmChannel();
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
    // Foreground notification kelganda
    const receivedListener = Notifications.addNotificationReceivedListener(
      async (notification) => {
        const data = notification.request.content.data;

        // Location so'rovlari
        if (
          data?.type === "location_request" ||
          data?.type === "scheduled_location"
        ) {
          await locationService.sendLocation(
            data?.type === "location_request",
          );
        }

        // Uchrashuv taklifi — alarm boshlash
        if (data?.type === "meet_invite") {
          await meetAlarmService.startAlarm(
            data.meet_id,
            data.title || "Yangi uchrashuv",
            data.body || "Uchrashuvga taklif qilindingiz!",
          );
        }
      },
    );

    // Foydalanuvchi bildirishnomani bosganda
    const responseListener =
      Notifications.addNotificationResponseReceivedListener(
        async (response) => {
          const data = response.notification.request.content.data;

          // Uchrashuv bildirishnomasini bosganda — profil sahifaga o'tish
          if (
            data?.type === "meet_invite" ||
            data?.type === "meet_alarm"
          ) {
            const { router } = require("expo-router");
            router.push("/(tabs)/profile");
          }
        },
      );

    return () => {
      receivedListener.remove();
      responseListener.remove();
    };
  },
};
