import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
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
import { api, BASE_URL } from "./api";

interface WorkerRank {
  rank: number;
  id: number;
  name: string;
  image: string | null;
  title: string;
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
}

interface RankData {
  my_rank: number | null;
  total_workers: number;
  my_stats: WorkerRank | null;
  top_workers: WorkerRank[];
}

const getImageUrl = (image: string | null): string | null => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${BASE_URL}/storage/${image}`;
};

const getMedalColor = (rank: number): string => {
  if (rank === 1) return "#FFD700"; // Oltin
  if (rank === 2) return "#C0C0C0"; // Kumush
  if (rank === 3) return "#CD7F32"; // Bronza
  return "#5a7fa5";
};

const getMedalIcon = (rank: number): string => {
  if (rank <= 3) return "medal-outline";
  return "ribbon-outline";
};

export default function RankScreen() {
  const [data, setData] = useState<RankData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchRank = async () => {
    const res = await api.get<RankData>("/api/rank");
    if (res.success) {
      setData(res.data);
    }
    setLoading(false);
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      fetchRank();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchRank();
  };

  const renderWorker = ({
    item,
    index,
  }: {
    item: WorkerRank;
    index: number;
  }) => {
    const isMe = data?.my_stats?.id === item.id;
    const medalColor = getMedalColor(item.rank);

    return (
      <View style={[styles.workerCard, isMe && styles.workerCardMe]}>
        {/* O'rin */}
        <View
          style={[
            styles.rankBadge,
            { backgroundColor: item.rank <= 3 ? `${medalColor}20` : "#1a2a40" },
          ]}
        >
          {item.rank <= 3 ? (
            <Ionicons name="medal" size={20} color={medalColor} />
          ) : (
            <Text style={styles.rankNumber}>{item.rank}</Text>
          )}
        </View>

        {/* Avatar */}
        {item.image ? (
          <Image
            source={{ uri: getImageUrl(item.image)! }}
            style={styles.workerAvatar}
          />
        ) : (
          <View style={styles.workerAvatarPlaceholder}>
            <Ionicons name="person" size={20} color="#5a7fa5" />
          </View>
        )}

        {/* Ma'lumot */}
        <View style={styles.workerInfo}>
          <Text
            style={[styles.workerName, isMe && styles.workerNameMe]}
            numberOfLines={1}
          >
            {item.name} {isMe && "(Siz)"}
          </Text>
          <Text style={styles.workerTitle}>{item.title}</Text>
        </View>

        {/* Statistika */}
        <View style={styles.workerStats}>
          <Text style={styles.completionRate}>{item.completion_rate}%</Text>
          <Text style={styles.taskCount}>
            {item.completed_tasks}/{item.total_tasks}
          </Text>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (!data?.my_stats) return null;

    return (
      <View style={styles.headerSection}>
        {/* Mening o'rnim */}
        <View style={styles.myRankCard}>
          <View style={styles.myRankTop}>
            <Ionicons name="trophy" size={32} color="#f59e0b" />
            <View style={styles.myRankInfo}>
              <Text style={styles.myRankLabel}>Sizning o'rningiz</Text>
              <View style={styles.myRankRow}>
                <Text style={styles.myRankNumber}>{data.my_rank || "—"}</Text>
                <Text style={styles.myRankTotal}>
                  / {data.total_workers} ishchi
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.myRankDivider} />

          <View style={styles.myStatsRow}>
            <View style={styles.myStatItem}>
              <Text style={styles.myStatValue}>
                {data.my_stats.completed_tasks}
              </Text>
              <Text style={styles.myStatLabel}>Bajarilgan</Text>
            </View>
            <View style={styles.myStatDot} />
            <View style={styles.myStatItem}>
              <Text style={[styles.myStatValue, { color: "#10b981" }]}>
                {data.my_stats.completion_rate}%
              </Text>
              <Text style={styles.myStatLabel}>Samaradorlik</Text>
            </View>
            <View style={styles.myStatDot} />
            <View style={styles.myStatItem}>
              <Text style={[styles.myStatValue, { color: "#ef4444" }]}>
                {data.my_stats.overdue_tasks}
              </Text>
              <Text style={styles.myStatLabel}>Kechikkan</Text>
            </View>
          </View>
        </View>

        {/* Top 10 sarlavhasi */}
        <View style={styles.listHeader}>
          <Ionicons name="podium-outline" size={18} color="#8a9bb5" />
          <Text style={styles.listHeaderText}>
            Top {data.top_workers.length} ishchi
          </Text>
        </View>
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
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reyting</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={data?.top_workers || []}
        renderItem={renderWorker}
        keyExtractor={(item) => item.id.toString()}
        ListHeaderComponent={renderHeader}
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
            <Ionicons name="trophy-outline" size={48} color="#2a3a52" />
            <Text style={styles.emptyText}>Reyting ma'lumotlari yo'q</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d" },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a2a40",
    borderWidth: 1,
    borderColor: "#2a3a52",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: { fontSize: 18, fontWeight: "700", color: "#ffffff" },

  listContent: { paddingHorizontal: 20, paddingBottom: 30 },

  // My Rank Card
  headerSection: { marginBottom: 10 },
  myRankCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#f59e0b30",
    marginBottom: 20,
  },
  myRankTop: { flexDirection: "row", alignItems: "center", gap: 16 },
  myRankInfo: { flex: 1 },
  myRankLabel: { color: "#5a7fa5", fontSize: 13 },
  myRankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginTop: 4,
  },
  myRankNumber: { fontSize: 36, fontWeight: "bold", color: "#f59e0b" },
  myRankTotal: { fontSize: 16, color: "#5a7fa5" },
  myRankDivider: {
    height: 1,
    backgroundColor: "#2a3a5240",
    marginVertical: 16,
  },
  myStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  myStatItem: { alignItems: "center" },
  myStatValue: { fontSize: 20, fontWeight: "bold", color: "#ffffff" },
  myStatLabel: { fontSize: 11, color: "#5a7fa5", marginTop: 4 },
  myStatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a3a52",
  },

  // List Header
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  listHeaderText: { color: "#8a9bb5", fontSize: 14, fontWeight: "600" },

  // Worker Card
  workerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a2a40",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a3a52",
    gap: 12,
  },
  workerCardMe: {
    borderColor: "#0ea5e950",
    backgroundColor: "#0ea5e910",
  },

  rankBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  rankNumber: { fontSize: 14, fontWeight: "bold", color: "#8a9bb5" },

  workerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  workerAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#0f1b2d",
    borderWidth: 1,
    borderColor: "#2a3a52",
    justifyContent: "center",
    alignItems: "center",
  },

  workerInfo: { flex: 1 },
  workerName: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  workerNameMe: { color: "#0ea5e9" },
  workerTitle: { color: "#5a7fa5", fontSize: 12, marginTop: 2 },

  workerStats: { alignItems: "flex-end" },
  completionRate: { color: "#10b981", fontSize: 16, fontWeight: "bold" },
  taskCount: { color: "#5a7fa5", fontSize: 11, marginTop: 2 },

  // Empty
  emptyBox: { alignItems: "center", marginTop: 60, gap: 12 },
  emptyText: { color: "#5a7fa5", fontSize: 15 },
});
