import * as Location from "expo-location";
import { useEffect, useState } from "react";
import { Alert, Linking } from "react-native";

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

interface UseLocationResult {
  location: LocationCoords | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  hasPermission: boolean;
}

export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasPermission, setHasPermission] = useState(false);

  const requestPermission = async (): Promise<boolean> => {
    const { status: existingStatus } =
      await Location.getForegroundPermissionsAsync();

    if (existingStatus === "granted") {
      setHasPermission(true);
      return true;
    }

    const { status } = await Location.requestForegroundPermissionsAsync();

    if (status === "granted") {
      setHasPermission(true);
      return true;
    }

    setHasPermission(false);
    return false;
  };

  const getLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const permitted = await requestPermission();

      if (!permitted) {
        setError("Joylashuv ruxsati berilmagan");
        Alert.alert(
          "Joylashuv kerak",
          "Vazifa yuborish uchun joylashuv ruxsati kerak. Sozlamalardan ruxsat bering.",
          [
            { text: "Bekor qilish", style: "cancel" },
            { text: "Sozlamalar", onPress: () => Linking.openSettings() },
          ],
        );
        setLoading(false);
        return;
      }

      const isEnabled = await Location.hasServicesEnabledAsync();

      if (!isEnabled) {
        setError("GPS o'chirilgan");
        Alert.alert("GPS o'chirilgan", "Vazifa yuborish uchun GPS ni yoqing.", [
          { text: "OK" },
        ]);
        setLoading(false);
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        timeInterval: 5000,
        distanceInterval: 0,
      });

      setLocation({
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      });
    } catch (err) {
      setError("Joylashuvni aniqlab bo'lmadi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getLocation();
  }, []);

  return {
    location,
    loading,
    error,
    refresh: getLocation,
    hasPermission,
  };
}

export async function getCurrentLocation(): Promise<LocationCoords | null> {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();

    if (status !== "granted") {
      const { status: newStatus } =
        await Location.requestForegroundPermissionsAsync();
      if (newStatus !== "granted") {
        return null;
      }
    }

    const isEnabled = await Location.hasServicesEnabledAsync();
    if (!isEnabled) {
      return null;
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      accuracy: location.coords.accuracy,
    };
  } catch {
    return null;
  }
}
