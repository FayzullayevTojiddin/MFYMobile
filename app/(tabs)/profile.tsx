import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// ========== TIPLAR ==========

interface Meet {
  id: number;
  user_id: number;
  title: string;
  description: string;
  address: string;
  location: { lat: number; lng: number } | null;
  meet_at: string;
  status: string;
  pivot: {
    status: "pending" | "accepted" | "rejected";
    seen_at: string | null;
    responded_at: string | null;
  };
}

interface RatingData {
  rank: number;
  totalWorkers: number;
  completedTasks: number;
  totalTasks: number;
  onTimePercent: number;
}

interface UserProfile {
  id: number;
  name: string;
  phone: string;
  email: string;
  mfy: string;
  role: string;
  avatar: string | null;
}

// ========== SOXTA MA'LUMOTLAR ==========

const FAKE_PROFILE: UserProfile = {
  id: 1,
  name: "Islomov Sardor",
  phone: "+998 90 123 45 67",
  email: "hokim@mfy.uz",
  mfy: "Tinchlik MFY",
  role: "Hokim yordamchisi",
  avatar: null,
};

const FAKE_RATING: RatingData = {
  rank: 7,
  totalWorkers: 51,
  completedTasks: 35,
  totalTasks: 48,
  onTimePercent: 78,
};

const FAKE_MEETS: Meet[] = [
  {
    id: 1,
    user_id: 10,
    title: "Haftalik yig'ilish",
    description: "MFY faoliyati bo'yicha haftalik hisobot",
    address: "Hokim devoni, 2-zal",
    location: null,
    meet_at: "2025-02-07T10:00:00",
    status: "scheduled",
    pivot: {
      status: "accepted",
      seen_at: "2025-02-05T08:00:00",
      responded_at: "2025-02-05T08:05:00",
    },
  },
  {
    id: 2,
    user_id: 10,
    title: "Suv ta'minoti masalasi",
    description: "3-mahalla suv quvuri loyihasi muhokamasi",
    address: "MFY binosi, katta zal",
    location: null,
    meet_at: "2025-02-10T14:00:00",
    status: "scheduled",
    pivot: { status: "pending", seen_at: null, responded_at: null },
  },
  {
    id: 3,
    user_id: 10,
    title: "Oylik hisobot yig'ilishi",
    description: "Yanvar oyi natijalari",
    address: "Tuman hokimligi",
    location: null,
    meet_at: "2025-02-01T09:00:00",
    status: "completed",
    pivot: {
      status: "accepted",
      seen_at: "2025-01-30T10:00:00",
      responded_at: "2025-01-30T10:02:00",
    },
  },
  {
    id: 4,
    user_id: 10,
    title: "Mahalla kengashi",
    description: "2025-yil rejasi muhokamasi",
    address: "Mahalla markazi",
    location: null,
    meet_at: "2025-01-25T11:00:00",
    status: "completed",
    pivot: {
      status: "accepted",
      seen_at: "2025-01-24T09:00:00",
      responded_at: "2025-01-24T09:10:00",
    },
  },
];

// ========== YORDAMCHI FUNKSIYALAR ==========

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("uz-UZ", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("uz-UZ", { hour: "2-digit", minute: "2-digit" });
};

const isFutureMeet = (meet: Meet): boolean => {
  return new Date(meet.meet_at) > new Date();
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

// ========== KOMPONENT ==========

type MeetFilter = "upcoming" | "past";

export default function ProfileScreen() {
  const [meetFilter, setMeetFilter] = useState<MeetFilter>("upcoming");

  const profile = FAKE_PROFILE;
  const rating = FAKE_RATING;

  const upcomingMeets = FAKE_MEETS.filter((m) => isFutureMeet(m));
  const pastMeets = FAKE_MEETS.filter((m) => !isFutureMeet(m));
  const displayedMeets = meetFilter === "upcoming" ? upcomingMeets : pastMeets;

  const handleAccept = (meetId: number) => {
    // TODO: API — qabul qilish
    Alert.alert("Tasdiqlandi", "Uchrashuvga qatnashishingiz tasdiqlandi");
  };

  const handleReject = (meetId: number) => {
    // TODO: API — rad etish
    Alert.alert("Rad etildi", "Uchrashuv rad etildi");
  };

  const handleLogout = () => {
    Alert.alert("Chiqish", "Tizimdan chiqmoqchimisiz?", [
      { text: "Yo'q", style: "cancel" },
      { text: "Ha", onPress: () => router.replace("/") },
    ]);
  };

  // Reyting yulduzlari
  const renderStars = (value: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.floor(value)) {
        stars.push(<Ionicons key={i} name="star" size={18} color="#f59e0b" />);
      } else if (i - 0.5 <= value) {
        stars.push(
          <Ionicons key={i} name="star-half" size={18} color="#f59e0b" />,
        );
      } else {
        stars.push(
          <Ionicons key={i} name="star-outline" size={18} color="#2a3a52" />,
        );
      }
    }
    return stars;
  };

  const renderMeetCard = (meet: Meet) => {
    const config = pivotStatusConfig[meet.pivot.status];
    const isFuture = isFutureMeet(meet);

    return (
      <View key={meet.id} style={styles.meetCard}>
        <View style={styles.meetTop}>
          <View style={styles.meetDateBox}>
            <Text style={styles.meetDay}>
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
            <Text style={styles.meetDesc} numberOfLines={1}>
              {meet.description}
            </Text>
            <View style={styles.meetMeta}>
              <Ionicons name="time-outline" size={13} color="#5a7fa5" />
              <Text style={styles.meetMetaText}>
                {formatTime(meet.meet_at)}
              </Text>
              <Ionicons
                name="location-outline"
                size={13}
                color="#5a7fa5"
                style={{ marginLeft: 10 }}
              />
              <Text style={styles.meetMetaText} numberOfLines={1}>
                {meet.address}
              </Text>
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

          {isFuture && meet.pivot.status === "pending" && (
            <View style={styles.meetActions}>
              <TouchableOpacity
                style={styles.acceptBtn}
                onPress={() => handleAccept(meet.id)}
              >
                <Ionicons name="checkmark" size={16} color="#10b981" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.rejectBtn}
                onPress={() => handleReject(meet.id)}
              >
                <Ionicons name="close" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Profil */}
      <View style={styles.profileSection}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={36} color="#0ea5e9" />
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <View style={styles.roleTag}>
          <Ionicons name="shield-checkmark-outline" size={14} color="#0ea5e9" />
          <Text style={styles.roleText}>{profile.role}</Text>
        </View>
      </View>

      {/* Shaxsiy ma'lumotlar */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ma'lumotlar</Text>
        <View style={styles.infoCard}>
          <View style={styles.infoItem}>
            <Ionicons name="business-outline" size={18} color="#5a7fa5" />
            <View>
              <Text style={styles.infoLabel}>MFY</Text>
              <Text style={styles.infoValue}>{profile.mfy}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="call-outline" size={18} color="#5a7fa5" />
            <View>
              <Text style={styles.infoLabel}>Telefon</Text>
              <Text style={styles.infoValue}>{profile.phone}</Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoItem}>
            <Ionicons name="mail-outline" size={18} color="#5a7fa5" />
            <View>
              <Text style={styles.infoLabel}>Email</Text>
              <Text style={styles.infoValue}>{profile.email}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Reyting */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Reyting</Text>
        <View style={styles.ratingCard}>
          <View style={styles.rankRow}>
            <View style={styles.rankBox}>
              <Ionicons name="trophy-outline" size={20} color="#f59e0b" />
              <Text style={styles.rankNumber}>{rating.rank}</Text>
              <Text style={styles.rankTotal}>/ {rating.totalWorkers}</Text>
            </View>
            <Text style={styles.rankLabel}>o'rin</Text>
          </View>

          <View style={styles.rankDivider} />

          <View style={styles.rankStats}>
            <View style={styles.rankStatItem}>
              <Text style={styles.rankStatValue}>
                {rating.completedTasks}/{rating.totalTasks}
              </Text>
              <Text style={styles.rankStatLabel}>Vazifalar</Text>
            </View>
            <View style={styles.rankStatDot} />
            <View style={styles.rankStatItem}>
              <Text style={styles.rankStatValue}>{rating.onTimePercent}%</Text>
              <Text style={styles.rankStatLabel}>O'z vaqtida</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Uchrashuvlar */}
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
            <Text style={styles.emptyMeetsText}>Uchrashuvlar yo'q</Text>
          </View>
        )}
      </View>

      {/* Tizimdan chiqish */}
      <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color="#ef4444" />
        <Text style={styles.logoutText}>Tizimdan chiqish</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

// ========== STILLAR ==========

const styles = StyleSheet.create({
  rankRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    gap: 4,
  },
  rankBox: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
  },
  rankNumber: { fontSize: 44, fontWeight: "bold", color: "#ffffff" },
  rankTotal: { fontSize: 18, color: "#5a7fa5", fontWeight: "500" },
  rankLabel: { color: "#5a7fa5", fontSize: 16, marginLeft: 4 },

  rankDivider: { height: 1, backgroundColor: "#2a3a5240", marginVertical: 16 },

  rankStats: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  rankStatItem: { alignItems: "center" },
  rankStatValue: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  rankStatLabel: { color: "#5a7fa5", fontSize: 12, marginTop: 2 },
  rankStatDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a3a52",
  },
  container: {
    flex: 1,
    backgroundColor: "#0f1b2d",
    paddingHorizontal: 20,
    paddingTop: 16,
  },

  // Profil
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
  profileName: { fontSize: 22, fontWeight: "700", color: "#ffffff" },
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

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    color: "#8a9bb5",
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
  },

  // Ma'lumotlar
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

  // Reyting
  ratingCard: {
    backgroundColor: "#1a2a40",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  ratingTop: { alignItems: "center", marginBottom: 20 },
  ratingScoreBox: { alignItems: "center" },
  ratingScore: {
    fontSize: 40,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 6,
  },
  starsRow: { flexDirection: "row", gap: 4 },

  ratingStats: { gap: 16 },
  ratingStat: {},
  ratingStatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  ratingStatLabel: { color: "#5a7fa5", fontSize: 13 },
  ratingStatValue: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  ratingBar: {
    height: 6,
    backgroundColor: "#2a3a52",
    borderRadius: 3,
    overflow: "hidden",
  },
  ratingBarFill: { height: "100%", borderRadius: 3 },

  // Uchrashuvlar
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
  meetDay: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#0ea5e9",
    lineHeight: 22,
  },
  meetMonth: { fontSize: 10, color: "#5a7fa5", textTransform: "uppercase" },
  meetInfo: { flex: 1 },
  meetTitle: { color: "#ffffff", fontSize: 15, fontWeight: "600" },
  meetDesc: { color: "#5a7fa5", fontSize: 13, marginTop: 2 },
  meetMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  meetMetaText: { color: "#5a7fa5", fontSize: 12 },

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

  meetActions: { flexDirection: "row", gap: 8 },
  acceptBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#10b98118",
    borderWidth: 1,
    borderColor: "#10b98140",
    justifyContent: "center",
    alignItems: "center",
  },
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ef444418",
    borderWidth: 1,
    borderColor: "#ef444440",
    justifyContent: "center",
    alignItems: "center",
  },

  emptyMeets: { alignItems: "center", paddingVertical: 30, gap: 10 },
  emptyMeetsText: { color: "#5a7fa5", fontSize: 14 },

  // Chiqish
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
