import Screen from "@/components/Screen";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { tasksApi } from "../api";

interface TaskCategory {
  id: number;
  name: string;
}

interface Task {
  id: number;
  task_category_id: number;
  category: TaskCategory;
  count: number;
  approved_count: number;
  deadline_at: string;
  is_overdue: boolean;
  is_priority: boolean;
}

const daysLeft = (deadline: string): number => {
  const now = new Date();
  const dl = new Date(deadline);
  return Math.ceil((dl.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Xayrli tong";
  if (hour < 18) return "Xayrli kun";
  return "Xayrli kech";
};

export default function VazifalarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = async () => {
    setError(null);
    const response = await tasksApi.getAll();
    if (response.success) {
      setTasks(response.data || []);
    } else {
      setError(response.message || "Xatolik yuz berdi");
    }
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchTasks();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchTasks();
  };

  const stats = {
    active: tasks.filter((t) => !t.is_overdue).length,
    overdue: tasks.filter((t) => t.is_overdue).length,
    priority: tasks.filter((t) => t.is_priority).length,
  };

  const getAccentColor = (task: Task) => {
    if (task.is_overdue) return "#ef4444";
    if (task.is_priority) return "#f59e0b";
    return "#0ea5e9";
  };

  const getStatusBadge = (task: Task) => {
    if (task.is_overdue)
      return {
        text: "Kechikkan",
        color: "#ef4444",
        bg: "#ef444420",
        icon: "alert-circle" as const,
      };
    if (task.is_priority)
      return {
        text: "Muhim",
        color: "#f59e0b",
        bg: "#f59e0b20",
        icon: "flag" as const,
      };
    return {
      text: "Jarayonda",
      color: "#0ea5e9",
      bg: "#0ea5e920",
      icon: "time" as const,
    };
  };

  const renderTask = ({ item }: { item: Task }) => {
    const accent = getAccentColor(item);
    const badge = getStatusBadge(item);
    const days = daysLeft(item.deadline_at);
    const progress =
      item.count > 0
        ? Math.round((item.approved_count / item.count) * 100)
        : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/task/${item.id}`)}
      >
        <View style={[styles.cardAccent, { backgroundColor: accent }]} />

        <View style={styles.cardContent}>
          {/* Card header */}
          <View style={styles.cardTop}>
            <View style={styles.categoryBox}>
              <View style={[styles.categoryIcon, { backgroundColor: `${accent}15` }]}>
                <Ionicons
                  name={item.task_category_id === 1 ? "finger-print-outline" : "document-text-outline"}
                  size={16}
                  color={accent}
                />
              </View>
              <Text style={styles.categoryText} numberOfLines={1}>
                {item.category.name}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Ionicons name={badge.icon} size={11} color={badge.color} />
              <Text style={[styles.badgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>
          </View>

          {/* Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>
                Bajarilish: <Text style={styles.progressValue}>{item.approved_count}/{item.count}</Text>
              </Text>
              <Text style={[styles.progressPercent, { color: accent }]}>
                {progress}%
              </Text>
            </View>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(progress, 100)}%`,
                    backgroundColor: accent,
                  },
                ]}
              />
            </View>
          </View>

          {/* Card footer */}
          <View style={styles.cardBottom}>
            <View style={styles.dateRow}>
              <Ionicons name="calendar-outline" size={13} color="#5a7fa5" />
              <Text style={styles.dateText}>{formatDate(item.deadline_at)}</Text>
            </View>
            <View
              style={[
                styles.daysChip,
                {
                  backgroundColor:
                    days < 0
                      ? "#ef444415"
                      : days <= 3
                        ? "#f59e0b15"
                        : "#0ea5e915",
                },
              ]}
            >
              <Ionicons
                name={days < 0 ? "warning" : "hourglass-outline"}
                size={11}
                color={days < 0 ? "#ef4444" : days <= 3 ? "#f59e0b" : "#0ea5e9"}
              />
              <Text
                style={[
                  styles.daysText,
                  {
                    color:
                      days < 0
                        ? "#ef4444"
                        : days <= 3
                          ? "#f59e0b"
                          : "#0ea5e9",
                  },
                ]}
              >
                {days < 0
                  ? `${Math.abs(days)} kun o'tgan`
                  : days === 0
                    ? "Bugun"
                    : `${days} kun`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={16} color="#3a4a62" />
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color="#0ea5e9" />
        <Text style={styles.loadingText}>Yuklanmoqda...</Text>
      </Screen>
    );
  }

  if (error) {
    return (
      <Screen style={styles.center}>
        <Image
          source={require("../../assets/images/not_found.png")}
          style={styles.errorImage}
          resizeMode="contain"
        />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTasks}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryText}>Qayta urinish</Text>
        </TouchableOpacity>
      </Screen>
    );
  }

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getGreeting()} 👋</Text>
          <Text style={styles.subtitle}>Hokim topshiriqlari</Text>
        </View>
        <View style={styles.taskCount}>
          <Text style={styles.taskCountNum}>{tasks.length}</Text>
          <Text style={styles.taskCountLabel}>vazifa</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <LinearGradient
          colors={["#0ea5e912", "#0ea5e905"]}
          style={[styles.statBox]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statIconBox, { backgroundColor: "#0ea5e918" }]}>
            <Ionicons name="checkmark-done" size={18} color="#0ea5e9" />
          </View>
          <Text style={[styles.statNum, { color: "#0ea5e9" }]}>
            {stats.active}
          </Text>
          <Text style={styles.statLabel}>Faol</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#ef444412", "#ef444405"]}
          style={[styles.statBox]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statIconBox, { backgroundColor: "#ef444418" }]}>
            <Ionicons name="alert-circle" size={18} color="#ef4444" />
          </View>
          <Text style={[styles.statNum, { color: "#ef4444" }]}>
            {stats.overdue}
          </Text>
          <Text style={styles.statLabel}>Kechikkan</Text>
        </LinearGradient>

        <LinearGradient
          colors={["#f59e0b12", "#f59e0b05"]}
          style={[styles.statBox]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={[styles.statIconBox, { backgroundColor: "#f59e0b18" }]}>
            <Ionicons name="flag" size={18} color="#f59e0b" />
          </View>
          <Text style={[styles.statNum, { color: "#f59e0b" }]}>
            {stats.priority}
          </Text>
          <Text style={styles.statLabel}>Muhim</Text>
        </LinearGradient>
      </View>

      {/* Section title */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Vazifalar</Text>
        <View style={styles.sectionBadge}>
          <Text style={styles.sectionBadgeText}>{tasks.length} ta</Text>
        </View>
      </View>

      {/* Tasks List */}
      <FlatList
        data={tasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#0ea5e9"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Image
              source={require("../../assets/images/empty.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyTitle}>Ajoyib!</Text>
            <Text style={styles.emptyText}>
              Barcha vazifalar bajarilgan
            </Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },

  errorImage: { width: 150, height: 150, marginBottom: 20 },
  errorText: { color: "#ef4444", fontSize: 14, textAlign: "center" },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryText: { color: "#fff", fontSize: 14, fontWeight: "600" },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 24, fontWeight: "800", color: "#ffffff", letterSpacing: -0.3 },
  subtitle: { fontSize: 13, color: "#5a7fa5", marginTop: 4 },
  taskCount: {
    alignItems: "center",
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  taskCountNum: { fontSize: 20, fontWeight: "800", color: "#0ea5e9" },
  taskCountLabel: { fontSize: 10, color: "#5a7fa5", marginTop: 1 },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginTop: 8,
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#1e2e45",
    gap: 6,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statNum: { fontSize: 24, fontWeight: "800" },
  statLabel: { color: "#5a7fa5", fontSize: 11, fontWeight: "500" },

  // Section header
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#8a9bb5",
  },
  sectionBadge: {
    backgroundColor: "#1a2a40",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sectionBadgeText: { color: "#5a7fa5", fontSize: 12, fontWeight: "600" },

  // List
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  // Card
  card: {
    flexDirection: "row",
    backgroundColor: "#1a2a40",
    borderRadius: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#233347",
  },
  cardAccent: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: 16,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  categoryBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  categoryIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  categoryText: {
    color: "#e2e8f0",
    fontSize: 15,
    fontWeight: "600",
    flex: 1,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },

  // Progress
  progressSection: { marginBottom: 14 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: { color: "#5a7fa5", fontSize: 13 },
  progressValue: { color: "#8a9bb5", fontWeight: "700" },
  progressPercent: { fontSize: 13, fontWeight: "800" },
  progressBar: {
    height: 6,
    backgroundColor: "#0f1b2d",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 3,
  },

  // Card bottom
  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#0f1b2d",
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { color: "#5a7fa5", fontSize: 12 },
  daysChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  daysText: { fontSize: 12, fontWeight: "700" },

  cardArrow: {
    justifyContent: "center",
    paddingRight: 12,
  },

  // Empty
  emptyBox: { alignItems: "center", marginTop: 40 },
  emptyImage: { width: 160, height: 160, marginBottom: 12 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 4,
  },
  emptyText: { color: "#5a7fa5", fontSize: 14 },
});
