import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { authApi } from "./api";
import { storage } from "./storage";
import { getFcmToken } from "./utils/notifications";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnim, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showError = (message: string) => {
    setError(message);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    triggerShake();
    setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => setError(""));
    }, 4000);
  };

  const handleLogin = async () => {
    const fcmToken = await getFcmToken();

    if (!fcmToken) {
      Alert.alert(
        "Xatolik",
        "Push notification ruxsati kerak. Sozlamalardan yoqing.",
      );
      return;
    }
    if (!email && !password) {
      showError("Email va parolni kiriting!");
      return;
    }
    if (!email) {
      showError("Email manzilni kiriting!");
      return;
    }
    if (!password) {
      showError("Parolni kiriting!");
      return;
    }

    setLoading(true);

    const response = await authApi.login(email, password, fcmToken);

    if (!response.success) {
      if (response.errors) {
        const firstError = Object.values(response.errors).flat()[0];
        showError(firstError);
      } else {
        showError(response.message || "Email yoki parol noto'g'ri!");
      }
      setLoading(false);
      return;
    }

    if (response.data?.token) {
      await storage.setToken(response.data.token);
    }
    if (response.data?.user) {
      await storage.setUser(response.data.user);
    }
    if (response.data?.worker) {
      await storage.setWorker(response.data.worker);
    }

    setLoading(false);
    router.replace("/(tabs)");
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <View style={styles.header}>
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={32} color="#0ea5e9" />
        </View>
        <Text style={styles.title}>Tizimga kirish</Text>
        <Text style={styles.subtitle}>
          MFY Hokim yordamchisi tizimiga kiring
        </Text>
      </View>

      {error !== "" && (
        <Animated.View
          style={[
            styles.errorBox,
            { opacity: fadeAnim, transform: [{ translateX: shakeAnim }] },
          ]}
        >
          <Ionicons name="alert-circle" size={20} color="#f87171" />
          <Text style={styles.errorText}>{error}</Text>
        </Animated.View>
      )}

      <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
        <Text style={styles.label}>Email manzil</Text>
        <View style={[styles.inputRow, error && !email && styles.inputError]}>
          <Ionicons name="mail-outline" size={18} color="#5a7fa5" />
          <TextInput
            style={styles.input}
            placeholder="email@mfy.uz"
            placeholderTextColor="#4a5568"
            value={email}
            onChangeText={(text) => {
              setEmail(text);
              if (error) setError("");
            }}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        </View>

        <Text style={styles.label}>Parol</Text>
        <View
          style={[styles.inputRow, error && !password && styles.inputError]}
        >
          <Ionicons name="key-outline" size={18} color="#5a7fa5" />
          <TextInput
            style={styles.input}
            placeholder="Parolingiz"
            placeholderTextColor="#4a5568"
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (error) setError("");
            }}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <Text style={styles.buttonText}>Tekshirilmoqda...</Text>
          ) : (
            <View style={styles.buttonInner}>
              <Text style={styles.buttonText}>Kirish</Text>
              <Ionicons name="log-in-outline" size={20} color="#fff" />
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1b2d",
    paddingHorizontal: 30,
    justifyContent: "center",
  },
  header: { alignItems: "center", marginBottom: 30 },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "#0ea5e915",
    borderWidth: 1.5,
    borderColor: "#0ea5e930",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 28, fontWeight: "bold", color: "#ffffff" },
  subtitle: {
    fontSize: 14,
    color: "#8a9bb5",
    marginTop: 8,
    textAlign: "center",
  },

  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#dc262615",
    borderWidth: 1,
    borderColor: "#dc2626",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 20,
    gap: 10,
  },
  errorText: { color: "#f87171", fontSize: 14, fontWeight: "500", flex: 1 },

  label: { color: "#8a9bb5", fontSize: 14, marginBottom: 6, marginTop: 16 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2a40",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#2a3a52",
    gap: 10,
  },
  input: { flex: 1, paddingVertical: 14, color: "#ffffff", fontSize: 16 },
  inputError: { borderColor: "#dc2626" },

  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 30,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonInner: { flexDirection: "row", alignItems: "center", gap: 8 },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
});
