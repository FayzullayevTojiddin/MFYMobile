import Screen from "@/components/Screen";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { api, authApi, BASE_URL, ENDPOINTS, meetsApi } from "../api";
import { storage } from "../storage";

interface Meet {
  id: number;
  title: string;
  description: string | null;
  address: string;
  location: { lat: number; lng: number } | null;
  meet_at: string;
  meet_date: string;
  meet_time: string;
  is_today: boolean;
  is_past: boolean;
  status: string;
  status_label: string;
  creator: { id: number; name: string } | null;
  my_status: "pending" | "accepted" | "rejected";
  my_status_label: string;
  seen_at: string | null;
  responded_at: string | null;
  workers_count: number;
  accepted_count: number;
}

interface RankData {
  my_rank: number | null;
  total_workers: number;
  my_stats: {
    id: number;
    name: string;
    image: string | null;
    title: string;
    total_tasks: number;
    completed_tasks: number;
    pending_tasks: number;
    overdue_tasks: number;
    completion_rate: number;
  } | null;
}

interface UserProfile {
  id: number;
  name: string;
  email: string;
  image: string | null;
  role: string;
  worker: {
    id: number;
    title: string;
    phone_number: string;
  } | null;
}

const getImageUrl = (image: string | null): string | null => {
  if (!image) return null;
  if (image.startsWith("http")) return image;
  return `${BASE_URL}/storage/${image}`;
};

const pivotStatusConfig = {
  pending: {
    label: "Kutilmoqda",
    color: "#f59e0b",
    bg: "#f59e0b18",
    icon: "time-outline" as const,
  },
  accepted: {
    label: "Qabul qilingan",
    color: "#10b981",
    bg: "#10b98118",
    icon: "checkmark-circle-outline" as const,
  },
  rejected: {
    label: "Rad etilgan",
    color: "#ef4444",
    bg: "#ef444418",
    icon: "close-circle-outline" as const,
  },
};

type MeetFilter = "upcoming" | "past";

export default function ProfileScreen() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [rankData, setRankData] = useState<RankData | null>(null);
  const [meets, setMeets] = useState<Meet[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [meetFilter, setMeetFilter] = useState<MeetFilter>("upcoming");
  const [respondingMeetId, setRespondingMeetId] = useState<number | null>(null);

  const fetchData = async () => {
    try {
      const [profileRes, rankRes, meetsRes] = await Promise.all([
        api.get<UserProfile>(ENDPOINTS.profile),
        api.get<RankData>("/api/rank"),
        meetsApi.getAll({ filter: "all" }),
      ]);

      if (profileRes.success) setProfile(profileRes.data);
      if (rankRes.success) setRankData(rankRes.data);
      if (meetsRes.success) setMeets(meetsRes.data || []);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, []),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const upcomingMeets = meets.filter((m) => !m.is_past);
  const pastMeets = meets.filter((m) => m.is_past);
  const displayedMeets = meetFilter === "upcoming" ? upcomingMeets : pastMeets;

  const handleAcceptMeet = async (meetId: number) => {
    setRespondingMeetId(meetId);
    const res = await meetsApi.respond(meetId, "accepted");
    setRespondingMeetId(null);
    if (res.success) fetchData();
  };

  const handleRejectMeet = async (meetId: number) => {
    setRespondingMeetId(meetId);
    const res = await meetsApi.respond(meetId, "rejected");
    setRespondingMeetId(null);
    if (res.success) fetchData();
  };

  const handleOpenMap = (location: { lat: number; lng: number }) => {
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    Linking.openURL(url);
  };

  const handleLogout = () => {
    Alert.alert("Chiqish", "Tizimdan chiqmoqchimisiz?", [
      { text: "Yo'q", style: "cancel" },
      {
        text: "Ha",
        style: "destructive",
        onPress: async () => {
          await authApi.logout();
          await storage.clear();
          router.replace("/login");
        },
      },
    ]);
  };

  const renderMeetCard = (meet: Meet) => {
    const config = pivotStatusConfig[meet.my_status];
    const isFuture = !meet.is_past;
    const isResponding = respondingMeetId === meet.id;

    return (
      <View
        key={meet.id}
        style={[styles.meetCard, meet.is_today && styles.meetCardToday]}
      >
        <View style={styles.meetTop}>
          <View
            style={[
              styles.meetDateBox,
              meet.is_today && styles.meetDateBoxToday,
            ]}
          >
            <Text
              style={[styles.meetDay, meet.is_today && styles.meetDayToday]}
            >
              {new Date(meet.meet_at).getDate()}
            </Text>
            <Text style={styles.meetMonth}>
              {new Date(meet.meet_at).toLocaleDateString("uz-UZ", {
                month: "short",
              })}
            </Text>
          </View>

          <View style={styles.meetInfo}>
            <Text style={styles.meetTitle} numberOfLines={1}>
              {meet.title}
            </Text>

            <View style={styles.meetMetaRow}>
              <Ionicons name="time-outline" size={13} color="#5a7fa5" />
              <Text style={styles.meetMetaText}>{meet.meet_time}</Text>
              {meet.is_today && (
                <View style={styles.todayBadge}>
                  <Text style={styles.todayBadgeText}>Bugun</Text>
                </View>
              )}
            </View>

            <View style={styles.meetMetaRow}>
              <Ionicons name="location-outline" size={13} color="#5a7fa5" />
              <Text style={styles.meetAddress} numberOfLines={1}>
                {meet.address}
              </Text>
              {meet.location && (
                <TouchableOpacity
                  style={styles.mapBtnSmall}
                  onPress={() => handleOpenMap(meet.location!)}
                >
                  <Ionicons name="navigate" size={12} color="#0ea5e9" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        <View style={styles.meetBottom}>
          <View style={[styles.meetBadge, { backgroundColor: config.bg }]}>
            <Ionicons name={config.icon} size={12} color={config.color} />
            <Text style={[styles.meetBadgeText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>

          {isFuture && meet.my_status === "pending" && (
            <View style={styles.meetActions}>
              {isResponding ? (
                <ActivityIndicator size="small" color="#0ea5e9" />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptMeet(meet.id)}
                  >
                    <Ionicons name="checkmark" size={16} color="#10b981" />
                    <Text style={styles.acceptBtnText}>Boraman</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.rejectBtn}
                    onPress={() => handleRejectMeet(meet.id)}
                  >
                    <Ionicons name="close" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {meet.my_status === "accepted" && (
            <View style={styles.acceptedHint}>
              <Ionicons name="checkmark-done" size={14} color="#10b981" />
              <Text style={styles.acceptedHintText}>Qatnashasiz</Text>
            </View>
          )}
        </View>
      </View>
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

  return (
    <Screen>
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
        <View style={styles.profileSection}>
          {profile?.image ? (
            <Image
              source={{ uri: getImageUrl(profile.image)! }}
              style={styles.avatarImage}
            />
          ) : (
            <View style={styles.avatarBox}>
              <Ionicons name="person" size={36} color="#0ea5e9" />
            </View>
          )}
          <Text style={styles.profileName} numberOfLines={2}>
            {profile?.name || "Foydalanuvchi"}
          </Text>
          <View style={styles.roleTag}>
            <Ionicons
              name="shield-checkmark-outline"
              size={14}
              color="#0ea5e9"
            />
            <Text style={styles.roleText}>
              {profile?.worker?.title || profile?.role || "Ishchi"}
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ma'lumotlar</Text>
          <View style={styles.infoCard}>
            {profile?.worker?.phone_number && (
              <>
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={18} color="#5a7fa5" />
                  <View>
                    <Text style={styles.infoLabel}>Telefon</Text>
                    <Text style={styles.infoValue}>
                      {profile.worker.phone_number}
                    </Text>
                  </View>
                </View>
                <View style={styles.divider} />
              </>
            )}
            <View style={styles.infoItem}>
              <Ionicons name="mail-outline" size={18} color="#5a7fa5" />
              <View>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>{profile?.email || "—"}</Text>
              </View>
            </View>
          </View>
        </View>

        {rankData?.my_stats && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Reyting</Text>
            <TouchableOpacity
              style={styles.ratingCard}
              activeOpacity={0.7}
              onPress={() => router.push("/rank")}
            >
              <View style={styles.rankRow}>
                <View style={styles.rankBox}>
                  <Ionicons name="trophy-outline" size={22} color="#f59e0b" />
                  <Text style={styles.rankNumber}>
                    {rankData.my_rank || "—"}
                  </Text>
                  <Text style={styles.rankTotal}>
                    / {rankData.total_workers}
                  </Text>
                </View>
                <Text style={styles.rankLabel}>o'rin</Text>
              </View>

              <View style={styles.rankDivider} />

              <View style={styles.rankStats}>
                <View style={styles.rankStatItem}>
                  <Text style={styles.rankStatValue}>
                    {rankData.my_stats.completed_tasks}/
                    {rankData.my_stats.total_tasks}
                  </Text>
                  <Text style={styles.rankStatLabel}>Bajarilgan</Text>
                </View>
                <View style={styles.rankStatDot} />
                <View style={styles.rankStatItem}>
                  <Text style={[styles.rankStatValue, { color: "#10b981" }]}>
                    {rankData.my_stats.completion_rate}%
                  </Text>
                  <Text style={styles.rankStatLabel}>Samaradorlik</Text>
                </View>
                <View style={styles.rankStatDot} />
                <View style={styles.rankStatItem}>
                  <Text style={[styles.rankStatValue, { color: "#ef4444" }]}>
                    {rankData.my_stats.overdue_tasks}
                  </Text>
                  <Text style={styles.rankStatLabel}>Kechikkan</Text>
                </View>
              </View>

              <View style={styles.viewRankHint}>
                <Text style={styles.viewRankText}>Reytingni ko'rish</Text>
                <Ionicons name="chevron-forward" size={16} color="#0ea5e9" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uchrashuvlar</Text>

          <View style={styles.meetFilterRow}>
            <TouchableOpacity
              style={[
                styles.meetFilterBtn,
                meetFilter === "upcoming" && styles.meetFilterBtnActive,
              ]}
              onPress={() => setMeetFilter("upcoming")}
            >
              <Text
                style={[
                  styles.meetFilterText,
                  meetFilter === "upcoming" && styles.meetFilterTextActive,
                ]}
              >
                Kelgusi ({upcomingMeets.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.meetFilterBtn,
                meetFilter === "past" && styles.meetFilterBtnActive,
              ]}
              onPress={() => setMeetFilter("past")}
            >
              <Text
                style={[
                  styles.meetFilterText,
                  meetFilter === "past" && styles.meetFilterTextActive,
                ]}
              >
                O'tgan ({pastMeets.length})
              </Text>
            </TouchableOpacity>
          </View>

          {displayedMeets.length > 0 ? (
            displayedMeets.map(renderMeetCard)
          ) : (
            <View style={styles.emptyMeets}>
              <Ionicons name="calendar-outline" size={40} color="#2a3a52" />
              <Text style={styles.emptyMeetsText}>
                {meetFilter === "upcoming"
                  ? "Kelgusi uchrashuvlar yo'q"
                  : "O'tgan uchrashuvlar yo'q"}
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#ef4444" />
          <Text style={styles.logoutText}>Tizimdan chiqish</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },
  scrollContent: { paddingHorizontal: 20, paddingTop: 16 },

  profileSection: { alignItems: "center", marginBottom: 24 },
  avatarBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0ea5e915",
    borderWidth: 1.5,
    borderColor: "#0ea5e930",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "#0ea5e930",
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#ffffff",
    textAlign: "center",
    paddingHorizontal: 20,
  },
  roleTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 8,
    backgroundColor: "#0ea5e910",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#0ea5e920",
  },
  roleText: { color: "#0ea5e9", fontSize: 13, fontWeight: "600" },

  section: { marginBottom: 24 },
  sectionTitle: {
    color: "#8a9bb5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },

  infoCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 4,
  },
  infoLabel: { color: "#5a7fa5", fontSize: 12 },
  infoValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "500",
    marginTop: 1,
  },
  divider: { height: 1, backgroundColor: "#2a3a5240", marginVertical: 12 },

  ratingCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  rankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
  },
  rankBox: { flexDirection: "row", alignItems: "baseline", gap: 8 },
  rankNumber: { fontSize: 44, fontWeight: "bold", color: "#ffffff" },
  rankTotal: { fontSize: 18, color: "#5a7fa5", fontWeight: "500" },
  rankLabel: { color: "#5a7fa5", fontSize: 16, marginLeft: 4 },
  rankDivider: { height: 1, backgroundColor: "#2a3a5240", marginVertical: 16 },
  rankStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  rankStatItem: { alignItems: "center", flex: 1 },
  rankStatValue: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  rankStatLabel: { color: "#5a7fa5", fontSize: 11, marginTop: 4 },
  rankStatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a3a52",
  },
  viewRankHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#2a3a5240",
  },
  viewRankText: { color: "#0ea5e9", fontSize: 13, fontWeight: "500" },

  meetFilterRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  meetFilterBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    backgroundColor: "#1a2a40",
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  meetFilterBtnActive: { backgroundColor: "#0ea5e910", borderColor: "#0ea5e9" },
  meetFilterText: { color: "#5a7fa5", fontSize: 14, fontWeight: "500" },
  meetFilterTextActive: { color: "#0ea5e9" },

  meetCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  meetCardToday: {
    borderColor: "#10b98140",
    backgroundColor: "#10b98108",
  },
  meetTop: { flexDirection: "row", gap: 14, marginBottom: 12 },
  meetDateBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#0ea5e910",
    borderWidth: 1,
    borderColor: "#0ea5e920",
    justifyContent: "center",
    alignItems: "center",
  },
  meetDateBoxToday: { backgroundColor: "#10b98118", borderColor: "#10b98140" },
  meetDay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0ea5e9",
    lineHeight: 22,
  },
  meetDayToday: { color: "#10b981" },
  meetMonth: { fontSize: 10, color: "#5a7fa5", textTransform: "uppercase" },
  meetInfo: { flex: 1, gap: 4 },
  meetTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  meetMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  meetMetaText: { color: "#5a7fa5", fontSize: 12 },
  meetAddress: { color: "#5a7fa5", fontSize: 12, flex: 1 },
  todayBadge: {
    backgroundColor: "#10b98120",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 6,
  },
  todayBadgeText: { color: "#10b981", fontSize: 10, fontWeight: "600" },
  mapBtnSmall: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#0ea5e915",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  meetBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#2a3a5240",
    paddingTop: 12,
  },
  meetBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  meetBadgeText: { fontSize: 12, fontWeight: "600" },
  meetActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  acceptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#10b98118",
    borderWidth: 1,
    borderColor: "#10b98140",
  },
  acceptBtnText: { color: "#10b981", fontSize: 12, fontWeight: "600" },
  rejectBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#ef444418",
    borderWidth: 1,
    borderColor: "#ef444440",
    justifyContent: "center",
    alignItems: "center",
  },
  acceptedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  acceptedHintText: { color: "#10b981", fontSize: 12 },

  emptyMeets: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyMeetsText: { color: "#5a7fa5", fontSize: 14 },

  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#ef444440",
    backgroundColor: "#ef444410",
  },
  logoutText: { color: "#ef4444", fontSize: 16, fontWeight: "600" },
});
