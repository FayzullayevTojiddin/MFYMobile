import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewToken,
} from "react-native";

const { width } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    icon: "shield-checkmark-outline" as const,
    title: "Hokim Yordamchisi",
    description:
      "MFY faoliyatini boshqarish, hokim topshiriqlarini nazorat qilish va hisobot berish uchun yagona platforma.",
  },
  {
    id: "2",
    icon: "clipboard-outline" as const,
    title: "Vazifalarni Boshqaring",
    description:
      "Hokim bergan vazifalarni qabul qiling, bajarish muddatini kuzating va natijalarni yuklang. Hech qanday topshiriq e'tibordan chetda qolmaydi.",
  },
  {
    id: "3",
    icon: "stats-chart-outline" as const,
    title: "Hisobot va Natija",
    description:
      "Bajarilgan ishlar bo'yicha hisobot yuboring, mahalla aholisiga xizmat ko'rsatish sifatini oshiring.",
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentIndex(viewableItems[0].index);
      }
    },
  ).current;

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.push("/login");
    }
  };

  const handleSkip = () => {
    router.push("/login");
  };

  const renderSlide = ({ item }: { item: (typeof slides)[0] }) => (
    <View style={styles.slide}>
      <View style={styles.iconCircle}>
        <Ionicons name={item.icon} size={48} color="#0ea5e9" />
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
        <Text style={styles.skipText}>
          {currentIndex < slides.length - 1 ? "O'tkazish" : ""}
        </Text>
      </TouchableOpacity>

      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ viewAreaCoveragePercentThreshold: 50 }}
      />

      <View style={styles.indicatorContainer}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>

      <View style={styles.bottom}>
        <TouchableOpacity style={styles.button} onPress={handleNext}>
          <Text style={styles.buttonText}>
            {currentIndex < slides.length - 1 ? "Keyingisi" : "Boshlash"}
          </Text>
          <Ionicons
            name={
              currentIndex < slides.length - 1
                ? "arrow-forward"
                : "checkmark-circle"
            }
            size={20}
            color="#fff"
            style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d" },
  skipBtn: { position: "absolute", top: 55, right: 24, zIndex: 10 },
  skipText: { color: "#5a7fa5", fontSize: 15 },
  slide: {
    width: width,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 80,
  },
  iconCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#0ea5e915",
    borderWidth: 1.5,
    borderColor: "#0ea5e930",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 36,
  },
  title: {
    fontSize: 28,
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
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 30,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#2a3a52",
    marginHorizontal: 5,
  },
  activeDot: { backgroundColor: "#0ea5e9", width: 28 },
  bottom: { paddingHorizontal: 30, paddingBottom: 50 },
  button: {
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  buttonText: { color: "#ffffff", fontSize: 17, fontWeight: "bold" },
});
