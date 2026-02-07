import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
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

type FilterType = "all" | "active" | "overdue";

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

export default function VazifalarScreen() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
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

  const filteredTasks = tasks.filter((task) => {
    switch (filter) {
      case "active":
        return !task.is_overdue;
      case "overdue":
        return task.is_overdue;
      default:
        return true;
    }
  });

  const stats = {
    all: tasks.length,
    active: tasks.filter((t) => !t.is_overdue).length,
    overdue: tasks.filter((t) => t.is_overdue).length,
  };

  const filters: {
    key: FilterType;
    label: string;
    count: number;
    icon: keyof typeof Ionicons.glyphMap;
  }[] = [
    { key: "all", label: "Barchasi", count: stats.all, icon: "list-outline" },
    {
      key: "active",
      label: "Faol",
      count: stats.active,
      icon: "pulse-outline",
    },
    {
      key: "overdue",
      label: "Kechikkan",
      count: stats.overdue,
      icon: "alert-circle-outline",
    },
  ];

  const getCardStyle = (task: Task) => {
    if (task.is_overdue) return { border: "#ef4444", bg: "#ef444408" };
    if (task.is_priority) return { border: "#f59e0b", bg: "#f59e0b08" };
    return { border: "#2a3a52", bg: "#1a2a40" };
  };

  const getStatusBadge = (task: Task) => {
    if (task.is_overdue)
      return {
        text: "Kechikkan",
        color: "#ef4444",
        bg: "#ef444418",
        icon: "alert-circle-outline" as const,
      };
    if (task.is_priority)
      return {
        text: "Muhim",
        color: "#f59e0b",
        bg: "#f59e0b18",
        icon: "flag-outline" as const,
      };
    return {
      text: "Jarayonda",
      color: "#0ea5e9",
      bg: "#0ea5e918",
      icon: "time-outline" as const,
    };
  };

  const renderTask = ({ item }: { item: Task }) => {
    const card = getCardStyle(item);
    const badge = getStatusBadge(item);
    const days = daysLeft(item.deadline_at);

    return (
      <TouchableOpacity
        style={[
          styles.card,
          { borderColor: card.border, backgroundColor: card.bg },
        ]}
        activeOpacity={0.7}
        onPress={() => router.push(`/task/${item.id}`)}
      >
        {item.is_priority && (
          <View style={styles.priorityBadge}>
            <Ionicons name="flag" size={10} color="#f59e0b" />
          </View>
        )}

        <View style={styles.cardTop}>
          <View style={styles.categoryBox}>
            <Ionicons name="folder-outline" size={14} color="#5a7fa5" />
            <Text style={styles.categoryText}>{item.category.name}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: badge.bg }]}>
            <Ionicons name={badge.icon} size={12} color={badge.color} />
            <Text style={[styles.badgeText, { color: badge.color }]}>
              {badge.text}
            </Text>
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.countRow}>
            <Ionicons name="layers-outline" size={16} color="#5a7fa5" />
            <Text style={styles.countLabel}>Topshiriq:</Text>
            <Text style={styles.countValue}>
              <Text style={{ color: "#10b981" }}>{item.approved_count}</Text>
              <Text style={{ color: "#5a7fa5" }}> / {item.count} ta</Text>
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.min((item.approved_count / item.count) * 100, 100)}%`,
                  backgroundColor:
                    item.approved_count >= item.count ? "#10b981" : "#0ea5e9",
                },
              ]}
            />
          </View>
        </View>

        <View style={styles.cardBottom}>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={14} color="#5a7fa5" />
            <Text style={styles.dateText}>{formatDate(item.deadline_at)}</Text>
          </View>
          <View style={styles.daysRow}>
            <Ionicons
              name={days < 0 ? "warning-outline" : "hourglass-outline"}
              size={13}
              color={days < 0 ? "#ef4444" : days <= 3 ? "#f59e0b" : "#0ea5e9"}
            />
            <Text
              style={[
                styles.daysText,
                {
                  color:
                    days < 0 ? "#ef4444" : days <= 3 ? "#f59e0b" : "#0ea5e9",
                },
              ]}
            >
              {days < 0
                ? `${Math.abs(days)} kun kechikkan`
                : days === 0
                  ? "Bugun tugaydi"
                  : `${days} kun qoldi`}
            </Text>
          </View>
        </View>

        <View style={styles.cardArrow}>
          <Ionicons name="chevron-forward" size={18} color="#2a3a52" />
        </View>
      </TouchableOpacity>
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

  if (error) {
    return (
      <View style={[styles.container, styles.center]}>
        <Ionicons name="cloud-offline-outline" size={48} color="#ef4444" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={fetchTasks}>
          <Ionicons name="refresh-outline" size={18} color="#fff" />
          <Text style={styles.retryText}>Qayta urinish</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.welcome}>Assalomu alaykum</Text>
          <Text style={styles.subtitle}>Hokim topshiriqlari</Text>
        </View>
        <View style={styles.headerIcon}>
          <Ionicons name="notifications-outline" size={22} color="#8a9bb5" />
        </View>
      </View>

      <View style={styles.statsRow}>
        <View style={[styles.statBox, { borderColor: "#0ea5e930" }]}>
          <Ionicons name="pulse-outline" size={18} color="#0ea5e9" />
          <Text style={[styles.statNum, { color: "#0ea5e9" }]}>
            {stats.active}
          </Text>
          <Text style={styles.statLabel}>Faol</Text>
        </View>
        <View style={[styles.statBox, { borderColor: "#ef444430" }]}>
          <Ionicons name="alert-circle-outline" size={18} color="#ef4444" />
          <Text style={[styles.statNum, { color: "#ef4444" }]}>
            {stats.overdue}
          </Text>
          <Text style={styles.statLabel}>Kechikkan</Text>
        </View>
        <View style={[styles.statBox, { borderColor: "#f59e0b30" }]}>
          <Ionicons name="flag-outline" size={18} color="#f59e0b" />
          <Text style={[styles.statNum, { color: "#f59e0b" }]}>
            {tasks.filter((t) => t.is_priority).length}
          </Text>
          <Text style={styles.statLabel}>Muhim</Text>
        </View>
      </View>

      <FlatList
        horizontal
        data={filters}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.key}
        style={styles.filterList}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.filterBtn,
              filter === item.key && styles.filterBtnActive,
            ]}
            onPress={() => setFilter(item.key)}
          >
            <Ionicons
              name={item.icon}
              size={14}
              color={filter === item.key ? "#0ea5e9" : "#5a7fa5"}
              style={{ marginRight: 5 }}
            />
            <Text
              style={[
                styles.filterText,
                filter === item.key && styles.filterTextActive,
              ]}
            >
              {item.label} ({item.count})
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        data={filteredTasks}
        renderItem={renderTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 20 }}
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
            <Ionicons
              name="checkmark-done-circle-outline"
              size={48}
              color="#10b981"
            />
            <Text style={styles.emptyText}>Barcha vazifalar bajarilgan</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f1b2d",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },

  errorText: {
    color: "#ef4444",
    marginTop: 12,
    fontSize: 14,
    textAlign: "center",
  },
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

  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  welcome: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
  subtitle: { fontSize: 13, color: "#5a7fa5", marginTop: 2 },
  headerIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#1a2a40",
    borderWidth: 1,
    borderColor: "#2a3a52",
    justifyContent: "center",
    alignItems: "center",
  },

  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
    gap: 10,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#1a2a40",
    borderWidth: 1,
    gap: 4,
  },
  statNum: { fontSize: 22, fontWeight: "bold" },
  statLabel: { color: "#5a7fa5", fontSize: 11 },

  filterList: {
    marginTop: 20,
    marginBottom: 16,
    minHeight: 44,
    maxHeight: 44,
    flexGrow: 0,
  },
  filterBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: "#1a2a40",
    marginRight: 8,
    borderWidth: 1,
    borderColor: "#2a3a52",
    height: 38,
  },
  filterBtnActive: { backgroundColor: "#0ea5e910", borderColor: "#0ea5e9" },
  filterText: { color: "#5a7fa5", fontSize: 13, fontWeight: "500" },
  filterTextActive: { color: "#0ea5e9" },

  card: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    position: "relative",
  },
  priorityBadge: {
    position: "absolute",
    top: -4,
    left: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#f59e0b20",
    borderWidth: 1,
    borderColor: "#f59e0b40",
    justifyContent: "center",
    alignItems: "center",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  categoryBox: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  categoryText: { color: "#8a9bb5", fontSize: 13 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  badgeText: { fontSize: 11, fontWeight: "600" },

  progressSection: { marginBottom: 12 },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  countLabel: { color: "#5a7fa5", fontSize: 14 },
  countValue: { fontSize: 16, fontWeight: "bold" },

  progressBar: {
    height: 4,
    backgroundColor: "#2a3a52",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 2 },

  cardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2a3a5230",
    paddingTop: 12,
  },
  dateRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dateText: { color: "#5a7fa5", fontSize: 13 },
  daysRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  daysText: { fontSize: 13, fontWeight: "600" },

  cardArrow: { position: "absolute", right: 16, top: "50%", marginTop: -9 },

  emptyBox: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#5a7fa5", fontSize: 15 },
});
