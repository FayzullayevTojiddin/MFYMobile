import * as Battery from "expo-battery";
import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import { storage } from "../storage";

const LOCATION_TASK_NAME = "background-location-task";
const API_URL = "https://donoxonsi.uz";

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations[0]) {
      await sendLocationToServer(locations[0]);
    }
  }
});

async function sendLocationToServer(
  location: Location.LocationObject,
  isRealTime = false,
) {
  try {
    const token = await storage.getToken();
    if (!token) return;

    if (!isRealTime) {
      const currentHour = new Date().getHours();
      if (currentHour < 9 || currentHour >= 21) return;
    }

    let batteryLevel = 0;
    try {
      batteryLevel = await Battery.getBatteryLevelAsync();
    } catch {}

    await fetch(`${API_URL}/api/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        battery_level: Math.round(batteryLevel * 100),
        is_real_time: isRealTime,
      }),
    });
  } catch {}
}

export const locationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: foregroundStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (foregroundStatus !== "granted") return false;

      const { status: backgroundStatus } =
        await Location.requestBackgroundPermissionsAsync();
      return backgroundStatus === "granted";
    } catch {
      return false;
    }
  },

  async startBackgroundTracking(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) return false;

      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) return true;

      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 60 * 60 * 1000,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: "MFY Hokim Yordamchisi",
          notificationBody: "Joylashuvingiz kuzatilmoqda",
          notificationColor: "#0ea5e9",
        },
      });

      return true;
    } catch {
      return false;
    }
  },

  async stopBackgroundTracking(): Promise<void> {
    try {
      const hasStarted =
        await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
      if (hasStarted) {
        await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      }
    } catch {}
  },

  async isTracking(): Promise<boolean> {
    try {
      return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
    } catch {
      return false;
    }
  },

  async sendRealTimeLocation(): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await sendLocationToServer(location, true);
      return true;
    } catch {
      return false;
    }
  },
};
