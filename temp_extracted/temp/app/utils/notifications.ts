import * as Notifications from "expo-notifications";

export async function getFcmToken(): Promise<string | null> {
  try {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Push notification ruxsati berilmadi");
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    return tokenData.data as string;
  } catch (error) {
    console.error("FCM token olishda xatolik:", error);
    return null;
  }
}
