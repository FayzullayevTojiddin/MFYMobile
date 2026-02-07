import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { tasksApi } from "../api";

// Android uchun LayoutAnimation
if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface Category {
  id: number;
  title: string;
  description: string | null;
}

export default function CategoriesScreen() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const fetchCategories = async () => {
    const res = await tasksApi.getCategories();
    if (res.success) {
      setCategories(res.data || []);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchCategories();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchCategories();
  };

  const toggleExpand = (id: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const renderCategory = (category: Category) => {
    const isExpanded = expandedIds.includes(category.id);
    const hasDescription =
      category.description && category.description.trim().length > 0;

    return (
      <View key={category.id} style={styles.categoryCard}>
        <TouchableOpacity
          style={styles.categoryHeader}
          onPress={() => hasDescription && toggleExpand(category.id)}
          activeOpacity={hasDescription ? 0.7 : 1}
        >
          <View style={styles.categoryIconBox}>
            <Ionicons name="folder" size={22} color="#0ea5e9" />
          </View>

          <View style={styles.categoryInfo}>
            <Text style={styles.categoryTitle} numberOfLines={1}>
              {category.title}
            </Text>
            {!isExpanded && hasDescription && (
              <Text style={styles.categoryDescPreview} numberOfLines={1}>
                {category.description}
              </Text>
            )}
          </View>

          {hasDescription && (
            <Ionicons
              name={isExpanded ? "chevron-up" : "chevron-down"}
              size={20}
              color="#5a7fa5"
            />
          )}
        </TouchableOpacity>

        {/* Expanded - faqat tavsif */}
        {isExpanded && hasDescription && (
          <View style={styles.categoryContent}>
            <Text style={styles.categoryDescription}>
              {category.description}
            </Text>
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Bo'limlar</Text>
        <Text style={styles.headerSubtitle}>{categories.length} ta bo'lim</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
      >
        {categories.length > 0 ? (
          categories.map(renderCategory)
        ) : (
          <View style={styles.emptyBox}>
            <Ionicons name="folder-open-outline" size={48} color="#2a3a52" />
            <Text style={styles.emptyText}>Bo'limlar topilmadi</Text>
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },

  // Header
  header: {
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "bold", color: "#ffffff" },
  headerSubtitle: { color: "#5a7fa5", fontSize: 14, marginTop: 4 },

  scrollContent: { paddingHorizontal: 20 },

  // Category Card
  categoryCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#2a3a52",
    overflow: "hidden",
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  categoryIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#0ea5e910",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryInfo: { flex: 1 },
  categoryTitle: { color: "#ffffff", fontSize: 16, fontWeight: "600" },
  categoryDescPreview: { color: "#5a7fa5", fontSize: 12, marginTop: 4 },

  // Expanded Content
  categoryContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: "#2a3a5240",
  },
  categoryDescription: {
    color: "#8a9bb5",
    fontSize: 14,
    marginTop: 12,
    lineHeight: 20,
  },

  // Empty
  emptyBox: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#5a7fa5", fontSize: 15 },
});
