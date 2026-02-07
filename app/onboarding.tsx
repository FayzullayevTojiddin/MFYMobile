import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { storage } from "./storage";

const { width } = Dimensions.get("window");
const ONBOARDING_KEY = "onboarding_completed";

const slides = [
  {
    id: "1",
    title: "Vazifalarni boshqaring",
    description: "Hokim topshiriqlarini qabul qiling va o'z vaqtida bajaring",
    image: require("../assets/images/slide_1.png"),
  },
  {
    id: "2",
    title: "Joylashuvni tasdiqlang",
    description: "GPS orqali ishga kelganingizni avtomatik qayd eting",
    image: require("../assets/images/slide_2.png"),
  },
  {
    id: "3",
    title: "Uchrashuvlar",
    description: "Yig'ilishlar haqida xabar oling va qatnashingizni tasdiqlang",
    image: require("../assets/images/slide_3.png"),
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const completeOnboarding = async () => {
    await storage.set(ONBOARDING_KEY, "true");
    router.replace("/login");
  };

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image
          source={item.image}
          style={styles.slideImage}
          resizeMode="contain"
        />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>O'tkazib yuborish</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(e) => {
          const index = Math.round(e.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.footer}>
        <View style={styles.dots}>
          {slides.map((_, index) => (
            <View
              key={index}
              style={[styles.dot, currentIndex === index && styles.dotActive]}
            />
          ))}
        </View>

        <TouchableOpacity style={styles.nextBtn} onPress={handleNext}>
          <Text style={styles.nextText}>
            {currentIndex === slides.length - 1 ? "Boshlash" : "Keyingisi"}
          </Text>
          <Ionicons name="arrow-forward" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d" },

  skipBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  skipText: { color: "#5a7fa5", fontSize: 14 },

  slide: {
    width,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },

  imageContainer: {
    width: 280,
    height: 280,
    marginBottom: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  slideImage: {
    width: "100%",
    height: "100%",
  },

  title: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: "#8a9bb5",
    textAlign: "center",
    lineHeight: 24,
  },

  footer: { paddingHorizontal: 30, paddingBottom: 50 },

  dots: { flexDirection: "row", justifyContent: "center", marginBottom: 30 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2a3a52",
    marginHorizontal: 4,
  },
  dotActive: { backgroundColor: "#0ea5e9", width: 24 },

  nextBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  nextText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
});
