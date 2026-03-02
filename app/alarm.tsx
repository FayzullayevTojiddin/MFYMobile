import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { useKeepAwake } from "expo-keep-awake";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  StyleSheet,
  Text,
  TouchableOpacity,
  Vibration,
  View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { meetsApi } from "./api";
import { meetAlarmService } from "./services/notificationService";

export default function AlarmScreen() {
  useKeepAwake();

  const { meetId, title, description, address, meetTime } =
    useLocalSearchParams<{
      meetId: string;
      title: string;
      description?: string;
      address: string;
      meetTime?: string;
    }>();

  const insets = useSafeAreaInsets();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [responding, setResponding] = useState<
    "accepting" | "rejecting" | null
  >(null);
  const [done, setDone] = useState(false);

  // Animatsiya qiymatlari
  const pulseScale = useSharedValue(1);
  const bellRotation = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  // Animatsiyalarni boshlash
  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1.0, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );

    bellRotation.value = withRepeat(
      withSequence(
        withTiming(15, { duration: 80 }),
        withTiming(-15, { duration: 80 }),
        withTiming(10, { duration: 80 }),
        withTiming(-10, { duration: 80 }),
        withTiming(0, { duration: 80 }),
        withTiming(0, { duration: 600 }),
      ),
      -1,
      false,
    );

    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.6, { duration: 1000 }),
        withTiming(0.2, { duration: 1000 }),
      ),
      -1,
      false,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const bellStyle = useAnimatedStyle(() => ({
    transform: [{ rotateZ: `${bellRotation.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  // Ovoz va vibratsiya
  useEffect(() => {
    const startAlarmEffects = async () => {
      // Vibratsiya
      const VIBRATION_PATTERN = [0, 500, 200, 500, 200, 500, 200, 1000];
      Vibration.vibrate(VIBRATION_PATTERN, true);

      // Ovoz
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: false,
        });

        const { sound } = await Audio.Sound.createAsync(
          require("../assets/sounds/alarm.wav"),
          { isLooping: true, volume: 1.0, shouldPlay: true },
        );
        soundRef.current = sound;
      } catch (err) {
        console.error("Alarm sound error:", err);
      }
    };

    startAlarmEffects();

    return () => {
      stopAlarmEffects();
    };
  }, []);

  // Android back tugmani bloklash
  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => true,
    );
    return () => backHandler.remove();
  }, []);

  const stopAlarmEffects = async () => {
    Vibration.cancel();
    if (soundRef.current) {
      try {
        await soundRef.current.stopAsync();
        await soundRef.current.unloadAsync();
      } catch (err) {
        console.error("Sound cleanup error:", err);
      }
      soundRef.current = null;
    }
  };

  const handleAccept = async () => {
    if (responding || done) return;
    setResponding("accepting");
    await stopAlarmEffects();

    const numericMeetId = Number(meetId);
    const res = await meetsApi.respond(numericMeetId, "accepted");

    if (res.success) {
      await meetAlarmService.cancelAlarm(numericMeetId);
      setDone(true);
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile");
        }
      }, 1200);
    } else {
      setResponding(null);
      Vibration.vibrate([0, 500, 200, 500], true);
    }
  };

  const handleReject = async () => {
    if (responding || done) return;
    setResponding("rejecting");
    await stopAlarmEffects();

    const numericMeetId = Number(meetId);
    const res = await meetsApi.respond(numericMeetId, "rejected");

    if (res.success) {
      await meetAlarmService.cancelAlarm(numericMeetId);
      setDone(true);
      setTimeout(() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace("/(tabs)/profile");
        }
      }, 1200);
    } else {
      setResponding(null);
      Vibration.vibrate([0, 500, 200, 500], true);
    }
  };

  // Muvaffaqiyat ekrani
  if (done) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <View style={styles.doneContainer}>
          <View
            style={[
              styles.doneCircle,
              {
                borderColor:
                  responding === "accepting" ? "#10b981" : "#ef4444",
              },
            ]}
          >
            <Ionicons
              name={responding === "accepting" ? "checkmark" : "close"}
              size={48}
              color={responding === "accepting" ? "#10b981" : "#ef4444"}
            />
          </View>
          <Text style={styles.doneText}>
            {responding === "accepting" ? "Qabul qilindi!" : "Rad etildi"}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      {/* Qizil glow fon */}
      <Animated.View style={[styles.backgroundGlow, glowStyle]} />

      {/* Yuqori label */}
      <View style={styles.topSection}>
        <Text style={styles.alarmLabel}>UCHRASHUV TAKLIFI</Text>
      </View>

      {/* Markaz: Qo'ng'iroq + pulsatsiya */}
      <View style={styles.centerSection}>
        <Animated.View style={[styles.pulseRing, pulseStyle]} />
        <Animated.View style={[styles.pulseRingOuter, pulseStyle]} />
        <View style={styles.bellCircle}>
          <Animated.View style={bellStyle}>
            <Ionicons name="notifications" size={48} color="#ffffff" />
          </Animated.View>
        </View>
      </View>

      {/* Uchrashuv ma'lumotlari */}
      <View style={styles.infoSection}>
        <Text style={styles.meetTitle} numberOfLines={2}>
          {title || "Yangi uchrashuv"}
        </Text>

        {meetTime ? (
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={18} color="#ef4444" />
            <Text style={styles.infoText}>{meetTime}</Text>
          </View>
        ) : null}

        {address ? (
          <View style={styles.infoRow}>
            <Ionicons name="location-outline" size={18} color="#ef4444" />
            <Text style={styles.infoText} numberOfLines={2}>
              {address}
            </Text>
          </View>
        ) : null}

        {description ? (
          <View style={styles.infoRow}>
            <Ionicons
              name="document-text-outline"
              size={18}
              color="#ef4444"
            />
            <Text style={styles.infoText} numberOfLines={3}>
              {description}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Tugmalar */}
      <View style={[styles.buttonSection, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={styles.rejectButton}
          onPress={handleReject}
          disabled={responding !== null}
          activeOpacity={0.7}
        >
          {responding === "rejecting" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="close" size={28} color="#ffffff" />
              <Text style={styles.buttonText}>Rad etish</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.acceptButton}
          onPress={handleAccept}
          disabled={responding !== null}
          activeOpacity={0.7}
        >
          {responding === "accepting" ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Ionicons name="checkmark" size={28} color="#ffffff" />
              <Text style={styles.buttonText}>Qabul qilish</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1b2d",
  },
  backgroundGlow: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#ef4444",
  },
  topSection: {
    alignItems: "center",
    paddingTop: 40,
  },
  alarmLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ef4444",
    letterSpacing: 3,
  },
  centerSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pulseRing: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: "#ef4444",
    backgroundColor: "#ef444415",
  },
  pulseRingOuter: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: "#ef444460",
  },
  bellCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ef4444",
    justifyContent: "center",
    alignItems: "center",
    elevation: 10,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  infoSection: {
    paddingHorizontal: 30,
    paddingBottom: 30,
    alignItems: "center",
    gap: 12,
  },
  meetTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#1a2a40",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a3a52",
    width: "100%",
  },
  infoText: {
    color: "#c8d6e5",
    fontSize: 15,
    flex: 1,
  },
  buttonSection: {
    flexDirection: "row",
    paddingHorizontal: 24,
    gap: 16,
  },
  rejectButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#ef4444",
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#ef4444",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  acceptButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#10b981",
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  doneContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  doneCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#1a2a40",
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  doneText: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "700",
    marginTop: 20,
  },
});
