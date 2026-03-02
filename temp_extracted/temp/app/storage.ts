import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
const WORKER_KEY = "auth_worker";

export const storage = {
  // Token
  async setToken(token: string) {
    await AsyncStorage.setItem(TOKEN_KEY, token);
  },

  async getToken(): Promise<string | null> {
    return AsyncStorage.getItem(TOKEN_KEY);
  },

  // User
  async setUser(user: any) {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  async getUser(): Promise<any | null> {
    const data = await AsyncStorage.getItem(USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Worker
  async setWorker(worker: any) {
    await AsyncStorage.setItem(WORKER_KEY, JSON.stringify(worker));
  },

  async getWorker(): Promise<any | null> {
    const data = await AsyncStorage.getItem(WORKER_KEY);
    return data ? JSON.parse(data) : null;
  },

  // Generic get/set (onboarding va boshqalar uchun)
  async get(key: string): Promise<string | null> {
    return AsyncStorage.getItem(key);
  },

  async set(key: string, value: string) {
    await AsyncStorage.setItem(key, value);
  },

  // Auth tozalash
  async clear() {
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY, WORKER_KEY]);
  },
};
