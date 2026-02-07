import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, StyleSheet, Text, View } from "react-native";
import { storage } from "./storage";

const ONBOARDING_KEY = "onboarding_completed";

export default function SplashScreen() {
  const [status, setStatus] = useState("Tekshirilmoqda...");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const token = await storage.getToken();

      if (token) {
        setStatus("Kirish...");
        router.replace("/(tabs)");
        return;
      }

      const onboardingCompleted = await storage.get(ONBOARDING_KEY);

      if (onboardingCompleted) {
        router.replace("/login");
      } else {
        router.replace("/onboarding");
      }
    } catch (error) {
      console.error("Auth check error:", error);
      router.replace("/login");
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoBox}>
        <Image
          source={require("../assets/images/app_icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>MFY Hokim Yordamchisi</Text>
      <View style={styles.loadingBox}>
        <ActivityIndicator size="small" color="#0ea5e9" />
        <Text style={styles.statusText}>{status}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1b2d",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logoBox: {
    width: 100,
    height: 100,
    borderRadius: 24,
    backgroundColor: "#0ea5e910",
    borderWidth: 1,
    borderColor: "#0ea5e930",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    overflow: "hidden",
  },
  logo: {
    width: 80,
    height: 80,
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 40,
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusText: {
    color: "#5a7fa5",
    fontSize: 14,
  },
});
