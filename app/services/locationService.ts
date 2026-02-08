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
  try {
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

    await fetch(`${API_URL}/api/location`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(locationData),
    });
  } catch {
    try {
      const token = await storage.getToken();
      if (!token) return;

      let batteryLevel = 0;
      try {
        batteryLevel = await Battery.getBatteryLevelAsync();
      } catch {}

      await saveToQueue({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracy: location.coords.accuracy,
        battery_level: Math.round(batteryLevel * 100),
        is_real_time: isRealTime,
        recorded_at: new Date().toISOString(),
      });
    } catch {}
  }
}

export const locationService = {
  async requestPermissions(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      return status === "granted";
    } catch {
      return false;
    }
  },

  async sendLocation(isRealTime = false): Promise<boolean> {
    try {
      const hasPermission = await this.requestPermissions();
      if (!hasPermission) return false;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      await sendLocationToServer(location, isRealTime);
      return true;
    } catch {
      return false;
    }
  },

  async syncQueue(): Promise<void> {
    await flushQueue();
  },
};
