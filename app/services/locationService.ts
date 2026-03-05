import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import * as Battery from "expo-battery";
import * as Location from "expo-location";

import { storage } from "../storage";

const API_URL = "https://donoxonsi.uz";
const QUEUE_KEY = "location_queue";

async function saveToQueue(locationData: any) {
  try {
    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    const queue = existing ? JSON.parse(existing) : [];
    queue.push(locationData);
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {}
}

async function flushQueue() {
  try {
    const token = await storage.getToken();
    if (!token) return;

    const existing = await AsyncStorage.getItem(QUEUE_KEY);
    if (!existing) return;

    const queue = JSON.parse(existing);
    if (queue.length === 0) return;

    const response = await fetch(`${API_URL}/api/location/batch`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ locations: queue }),
    });

    if (response.ok) {
      await AsyncStorage.removeItem(QUEUE_KEY);
    }
  } catch {}
}

async function sendLocationToServer(
  location: Location.LocationObject,
  isRealTime = false,
) {
  const token = await storage.getToken();
  if (!token) return;

  let batteryLevel = 0;
  try {
    batteryLevel = await Battery.getBatteryLevelAsync();
  } catch {}

  const locationData = {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    accuracy: location.coords.accuracy,
    battery_level: Math.round(batteryLevel * 100),
    is_real_time: isRealTime,
    recorded_at: new Date().toISOString(),
  };

  const netState = await NetInfo.fetch();

  if (!netState.isConnected) {
    await saveToQueue(locationData);
    return;
  }

  await flushQueue();

  try {
    const response = await fetch(`${API_URL}/api/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(locationData),
    });

    if (!response.ok) {
      await saveToQueue(locationData);
    }
  } catch {
    await saveToQueue(locationData);
  }
}

export const locationService = {
  // Foreground da chaqiriladi — dialog ko'rsatishi mumkin
  async requestPermissions(): Promise<boolean> {
    try {
      const { status: fgStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (fgStatus !== "granted") return false;

      const { status: bgStatus } =
        await Location.requestBackgroundPermissionsAsync();
      // Background ruxsati berilmasa ham foreground ishlaydi
      return true;
    } catch {
      return false;
    }
  },

  // Background da chaqiriladi — dialog ko'rsatmaydi, faqat tekshiradi
  async hasPermissions(): Promise<boolean> {
    try {
      const fg = await Location.getForegroundPermissionsAsync();
      if (fg.status !== "granted") return false;

      const bg = await Location.getBackgroundPermissionsAsync();
      return bg.status === "granted";
    } catch {
      return false;
    }
  },

  // Foreground uchun — permission dialog + GPS
  async sendLocation(isRealTime = false): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      return await this._getAndSendLocation(isRealTime);
    } catch {
      return false;
    }
  },

  // Background uchun — GPS olish va yuborish
  async sendLocationBackground(isRealTime = false): Promise<boolean> {
    try {
      const hasPermission = await this.hasPermissions();
      if (!hasPermission) return false;

      return await this._getAndSendLocation(isRealTime);
    } catch {
      return false;
    }
  },

  // Foreground uchun GPS olish va yuborish
  async _getAndSendLocation(isRealTime: boolean): Promise<boolean> {
    let location: Location.LocationObject | null = null;

    try {
      location = await Location.getLastKnownPositionAsync();
    } catch {}

    try {
      const locationPromise = Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Location timeout")), 10000),
      );

      const freshLocation = await Promise.race([
        locationPromise,
        timeoutPromise,
      ]);
      location = freshLocation;
    } catch {}

    if (!location) return false;

    await sendLocationToServer(location, isRealTime);
    return true;
  },

  async syncQueue(): Promise<void> {
    await flushQueue();
  },
};
