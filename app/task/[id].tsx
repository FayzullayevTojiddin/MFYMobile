import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { tasksApi } from "../api";

interface FileItem {
  name: string;
  path: string;
  url: string;
  size: number;
  mime: string;
}

interface MyTask {
  id: number;
  description: string | null;
  files: FileItem[];
  status: "pending" | "approved";
  location: { lat: number; lng: number } | null;
  created_at: string;
}

interface TaskDetail {
  id: number;
  task_category_id: number;
  category: { id: number; name: string };
  count: number;
  approved_count: number;
  deadline_at: string;
  completed_at: string | null;
  is_overdue: boolean;
  is_priority: boolean;
  my_tasks: MyTask[];
}

type UploadStep = "location" | "files" | "uploading" | "done" | "error";

interface SelectedFile {
  name: string;
  uri: string;
  size?: number;
  type: string;
}

interface LocationCoords {
  latitude: number;
  longitude: number;
  accuracy: number | null;
}

const statusConfig = {
  pending: {
    label: "Kutilmoqda",
    color: "#f59e0b",
    bg: "#f59e0b18",
    icon: "time-outline" as const,
  },
  approved: {
    label: "Tasdiqlangan",
    color: "#10b981",
    bg: "#10b98118",
    icon: "checkmark-circle-outline" as const,
  },
};

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

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileIcon = (fileName: string): keyof typeof Ionicons.glyphMap => {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || ""))
    return "image-outline";
  if (["pdf"].includes(ext || "")) return "document-text-outline";
  if (["doc", "docx"].includes(ext || "")) return "document-outline";
  if (["xls", "xlsx"].includes(ext || "")) return "grid-outline";
  return "document-outline";
};

export default function TaskDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const [task, setTask] = useState<TaskDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalVisible, setModalVisible] = useState(false);
  const [uploadStep, setUploadStep] = useState<UploadStep>("location");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);

  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const isAttendanceTask = task?.task_category_id === 1;

  const fetchTask = async () => {
    setError(null);
    const response = await tasksApi.getById(Number(id));

    if (response.success) {
      setTask(response.data);
    } else {
      setError(response.message || "Xatolik yuz berdi");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (id) {
      fetchTask();
    }
  }, [id]);

  const getLocation = async (): Promise<LocationCoords | null> => {
    setLocationLoading(true);
    setLocationError(null);

    try {
      const { status: existingStatus } =
        await Location.getForegroundPermissionsAsync();
      let granted = existingStatus === "granted";

      if (!granted) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        granted = status === "granted";
      }

      if (!granted) {
        setLocationError("Joylashuv ruxsati berilmagan");
        Alert.alert(
          "Joylashuv kerak",
          "Vazifa yuborish uchun joylashuv ruxsati kerak. Sozlamalardan ruxsat bering.",
          [
            { text: "Bekor qilish", style: "cancel" },
            { text: "Sozlamalar", onPress: () => Linking.openSettings() },
          ],
        );
        setLocationLoading(false);
        return null;
      }

      const isEnabled = await Location.hasServicesEnabledAsync();

      if (!isEnabled) {
        setLocationError("GPS o'chirilgan");
        Alert.alert("GPS o'chirilgan", "Vazifa yuborish uchun GPS ni yoqing.", [
          { text: "OK" },
        ]);
        setLocationLoading(false);
        return null;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const coords = {
        latitude: currentLocation.coords.latitude,
        longitude: currentLocation.coords.longitude,
        accuracy: currentLocation.coords.accuracy,
      };

      setLocation(coords);
      setLocationLoading(false);
      return coords;
    } catch (err) {
      setLocationError("Joylashuvni aniqlab bo'lmadi");
      setLocationLoading(false);
      return null;
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();

      if (status !== "granted") {
        Alert.alert("Ruxsat kerak", "Kamera ruxsati berilmagan.", [
          { text: "Bekor qilish", style: "cancel" },
          { text: "Sozlamalar", onPress: () => Linking.openSettings() },
        ]);
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        quality: 0.6,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];

        console.log("📸 Original URI:", asset.uri);

        const fileName = `photo_${Date.now()}.jpg`;

        setSelectedFiles([
          {
            name: fileName,
            uri: asset.uri,
            size: asset.fileSize,
            type: "image/jpeg",
          },
        ]);
      }
    } catch (err) {
      console.error("Camera error:", err);
    }
  };

  const handlePickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        type: [
          "image/*",
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ],
      });
      if (!result.canceled && result.assets) {
        const files: SelectedFile[] = result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size ?? undefined,
          type: asset.mimeType || "application/octet-stream",
        }));
        setSelectedFiles((prev) => [...prev, ...files]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (!task || !location || selectedFiles.length === 0) return;

    setUploadStep("uploading");
    setUploadError(null);

    console.log("📤 Upload boshlanmoqda...");
    console.log("📁 Files:", selectedFiles);

    try {
      const response = await tasksApi.uploadFiles(
        task.id,
        selectedFiles.map((f) => ({
          uri: f.uri,
          name: f.name,
          type: f.type,
        })),
        undefined,
        { latitude: location.latitude, longitude: location.longitude },
      );

      console.log("📥 Response:", response);

      if (response.success) {
        setUploadStep("done");
        setTimeout(() => {
          setModalVisible(false);
          setSelectedFiles([]);
          setLocation(null);
          setUploadStep("location");
          fetchTask();
        }, 1500);
      } else {
        setUploadStep("error");
        setUploadError(response.message || "Yuklashda xatolik yuz berdi");
      }
    } catch (err) {
      console.error("Upload error:", err);
      setUploadStep("error");
      setUploadError("Serverga ulanib bo'lmadi");
    }
  };

  const openUploadModal = () => {
    setUploadStep("location");
    setSelectedFiles([]);
    setLocation(null);
    setLocationError(null);
    setUploadError(null);
    setModalVisible(true);
    getLocation().then((coords) => {
      if (coords) setUploadStep("files");
    });
  };

  const renderMyTask = ({ item }: { item: MyTask }) => {
    const config = statusConfig[item.status];
    const firstFile = item.files[0];

    return (
      <View style={styles.myTaskCard}>
        <View style={styles.myTaskLeft}>
          <View style={styles.fileIconBox}>
            <Ionicons
              name={
                firstFile ? getFileIcon(firstFile.name) : "document-outline"
              }
              size={22}
              color="#8a9bb5"
            />
          </View>
          <View style={styles.myTaskInfo}>
            <Text style={styles.myTaskFileName} numberOfLines={1}>
              {item.files.length > 1
                ? `${item.files.length} ta fayl`
                : firstFile?.name || "Fayl"}
            </Text>
            <View style={styles.myTaskMeta}>
              <Text style={styles.myTaskDate}>
                {formatDate(item.created_at)} · {formatTime(item.created_at)}
              </Text>
              {item.location && (
                <View style={styles.locationBadge}>
                  <Ionicons name="location" size={10} color="#0ea5e9" />
                </View>
              )}
            </View>
          </View>
        </View>
        <View style={[styles.myTaskBadge, { backgroundColor: config.bg }]}>
          <Ionicons name={config.icon} size={12} color={config.color} />
          <Text style={[styles.myTaskBadgeText, { color: config.color }]}>
            {config.label}
          </Text>
        </View>
      </View>
    );
  };

  const renderUploadContent = () => {
    if (uploadStep === "location") {
      return (
        <View style={[styles.modalBody, styles.center]}>
          {locationLoading ? (
            <>
              <View style={styles.locationCircle}>
                <ActivityIndicator size="large" color="#0ea5e9" />
              </View>
              <Text style={styles.locationLoadingText}>
                Joylashuv aniqlanmoqda...
              </Text>
              <Text style={styles.locationHint}>GPS signalini kutmoqda</Text>
            </>
          ) : locationError ? (
            <>
              <View style={styles.errorCircle}>
                <Ionicons name="location-outline" size={40} color="#ef4444" />
              </View>
              <Text style={styles.errorText}>{locationError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() =>
                  getLocation().then((c) => c && setUploadStep("files"))
                }
              >
                <Ionicons name="refresh-outline" size={18} color="#fff" />
                <Text style={styles.retryBtnText}>Qayta urinish</Text>
              </TouchableOpacity>
            </>
          ) : null}
        </View>
      );
    }

    if (uploadStep === "uploading") {
      return (
        <View style={[styles.modalBody, styles.center]}>
          <ActivityIndicator size="large" color="#0ea5e9" />
          <Text style={styles.uploadingText}>Yuklanmoqda...</Text>
        </View>
      );
    }

    if (uploadStep === "done") {
      return (
        <View style={[styles.modalBody, styles.center]}>
          <View style={styles.doneCircle}>
            <Ionicons name="checkmark" size={40} color="#10b981" />
          </View>
          <Text style={styles.doneText}>
            {isAttendanceTask
              ? "Keldingiz qayd etildi"
              : "Muvaffaqiyatli yuklandi"}
          </Text>
        </View>
      );
    }

    if (uploadStep === "error") {
      return (
        <View style={[styles.modalBody, styles.center]}>
          <View style={styles.errorCircle}>
            <Ionicons name="close" size={40} color="#ef4444" />
          </View>
          <Text style={styles.errorText}>{uploadError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => setUploadStep("files")}
          >
            <Text style={styles.retryBtnText}>Qayta urinish</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (isAttendanceTask) {
      return (
        <View style={styles.modalBody}>
          <Text style={styles.modalTitle}>Ishga keldim</Text>

          {location && (
            <View style={styles.locationInfoBox}>
              <Ionicons name="location" size={16} color="#10b981" />
              <Text style={styles.locationInfoText}>Joylashuv aniqlandi</Text>
              {location.accuracy && (
                <Text style={styles.locationAccuracy}>
                  ±{Math.round(location.accuracy)}m
                </Text>
              )}
            </View>
          )}

          {selectedFiles.length === 0 ? (
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={handlePickImage}
            >
              <View style={styles.cameraIconBox}>
                <Ionicons name="camera" size={40} color="#0ea5e9" />
              </View>
              <Text style={styles.cameraBtnText}>Rasm olish</Text>
              <Text style={styles.cameraBtnHint}>
                Kamerani ochish uchun bosing
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.selectedPhotoBox}>
              <View style={styles.photoPreview}>
                <Ionicons name="image" size={32} color="#10b981" />
              </View>
              <View style={styles.photoInfo}>
                <Text style={styles.photoName} numberOfLines={1}>
                  {selectedFiles[0].name}
                </Text>
                {selectedFiles[0].size && (
                  <Text style={styles.photoSize}>
                    {formatFileSize(selectedFiles[0].size)}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => setSelectedFiles([])}>
                <Ionicons name="close-circle" size={24} color="#ef4444" />
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.uploadBtn,
              selectedFiles.length === 0 && styles.uploadBtnDisabled,
            ]}
            onPress={handleUpload}
            disabled={selectedFiles.length === 0}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
            <Text style={styles.uploadBtnText}>Tasdiqlash</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.modalBody}>
        <Text style={styles.modalTitle}>Fayl yuklash</Text>

        <View style={styles.selectedCatBox}>
          <Ionicons name="folder" size={16} color="#0ea5e9" />
          <Text style={styles.selectedCatText}>{task?.category.name}</Text>
        </View>

        {location && (
          <View style={styles.locationInfoBox}>
            <Ionicons name="location" size={16} color="#10b981" />
            <Text style={styles.locationInfoText}>Joylashuv aniqlandi</Text>
            {location.accuracy && (
              <Text style={styles.locationAccuracy}>
                ±{Math.round(location.accuracy)}m
              </Text>
            )}
          </View>
        )}

        <TouchableOpacity style={styles.pickFileBtn} onPress={handlePickFiles}>
          <Ionicons name="cloud-upload-outline" size={28} color="#0ea5e9" />
          <Text style={styles.pickFileText}>Fayl tanlash</Text>
          <Text style={styles.pickFileHint}>Rasm, PDF, Word, Excel...</Text>
        </TouchableOpacity>

        {selectedFiles.length > 0 && (
          <View style={styles.fileList}>
            <Text style={styles.fileListTitle}>
              Tanlangan ({selectedFiles.length})
            </Text>
            {selectedFiles.map((file, index) => (
              <View key={index} style={styles.fileItem}>
                <View style={styles.fileItemInfo}>
                  <Ionicons
                    name={getFileIcon(file.name)}
                    size={18}
                    color="#8a9bb5"
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fileItemName} numberOfLines={1}>
                      {file.name}
                    </Text>
                    {file.size && (
                      <Text style={styles.fileItemSize}>
                        {formatFileSize(file.size)}
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={() => handleRemoveFile(index)}>
                  <Ionicons name="close-circle" size={22} color="#ef4444" />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.uploadBtn,
            selectedFiles.length === 0 && styles.uploadBtnDisabled,
          ]}
          onPress={handleUpload}
          disabled={selectedFiles.length === 0}
        >
          <Ionicons name="cloud-upload-outline" size={20} color="#fff" />
          <Text style={styles.uploadBtnText}>Yuklash</Text>
        </TouchableOpacity>
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

  if (error || !task) {
    return (
      <View style={[styles.container, styles.center]}>
        <Image
          source={require("../../assets/images/not_found.png")}
          style={styles.errorImage}
          resizeMode="contain"
        />
        <Text style={styles.errorPageText}>{error || "Vazifa topilmadi"}</Text>
        <TouchableOpacity
          style={styles.backBtnLarge}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Orqaga</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {task.category.name}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoRow}>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Jami</Text>
          <Text style={styles.infoValue}>{task.count}</Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Tasdiqlangan</Text>
          <Text style={[styles.infoValue, { color: "#10b981" }]}>
            {task.approved_count}
          </Text>
        </View>
        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Qolgan</Text>
          <Text
            style={[
              styles.infoValue,
              { color: task.is_overdue ? "#ef4444" : "#f59e0b" },
            ]}
          >
            {task.count - task.approved_count}
          </Text>
        </View>
      </View>

      <View style={styles.deadlineBox}>
        <Ionicons name="calendar-outline" size={16} color="#5a7fa5" />
        <Text style={styles.deadlineText}>
          Muddat: {formatDate(task.deadline_at)}
        </Text>
        {task.is_overdue && (
          <View style={styles.overdueTag}>
            <Ionicons name="warning-outline" size={12} color="#ef4444" />
            <Text style={styles.overdueTagText}>Kechikkan</Text>
          </View>
        )}
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Bajarilish</Text>
          <Text style={styles.progressPercent}>
            {task.count > 0
              ? Math.round((task.approved_count / task.count) * 100)
              : 0}
            %
          </Text>
        </View>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min((task.approved_count / task.count) * 100, 100)}%`,
                backgroundColor:
                  task.approved_count >= task.count ? "#10b981" : "#0ea5e9",
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>
          Yuborilganlar ({task.my_tasks.length})
        </Text>
      </View>

      <FlatList
        data={task.my_tasks}
        renderItem={renderMyTask}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Image
              source={require("../../assets/images/empty.png")}
              style={styles.emptyImage}
              resizeMode="contain"
            />
            <Text style={styles.emptyText}>Hali hech narsa yuborilmagan</Text>
          </View>
        }
      />

      {isAttendanceTask ? (
        <TouchableOpacity
          style={styles.attendanceBtn}
          onPress={openUploadModal}
          activeOpacity={0.8}
        >
          <Ionicons name="finger-print-outline" size={24} color="#ffffff" />
          <Text style={styles.attendanceBtnText}>Keldim</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={styles.fab}
          onPress={openUploadModal}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={28} color="#ffffff" />
        </TouchableOpacity>
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHandle} />
              <TouchableOpacity
                style={styles.modalClose}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={22} color="#8a9bb5" />
              </TouchableOpacity>
            </View>
            {renderUploadContent()}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1b2d", paddingHorizontal: 20 },
  center: { justifyContent: "center", alignItems: "center" },
  loadingText: { color: "#5a7fa5", marginTop: 12, fontSize: 14 },
  errorImage: { width: 150, height: 150, marginBottom: 20 },
  errorPageText: { color: "#ef4444", fontSize: 14, textAlign: "center" },
  backBtnLarge: {
    marginTop: 20,
    backgroundColor: "#1a2a40",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  backBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#ffffff",
    flex: 1,
    textAlign: "center",
  },
  infoRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  infoBox: {
    flex: 1,
    backgroundColor: "#1a2a40",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  infoLabel: { color: "#5a7fa5", fontSize: 11, marginBottom: 4 },
  infoValue: { color: "#ffffff", fontSize: 22, fontWeight: "bold" },
  deadlineBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#1a2a40",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  deadlineText: { color: "#8a9bb5", fontSize: 14 },
  overdueTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginLeft: "auto",
    backgroundColor: "#ef444418",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  overdueTagText: { color: "#ef4444", fontSize: 11, fontWeight: "600" },
  progressSection: { marginBottom: 20 },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  progressLabel: { color: "#5a7fa5", fontSize: 13 },
  progressPercent: { color: "#ffffff", fontSize: 13, fontWeight: "600" },
  progressBar: {
    height: 6,
    backgroundColor: "#2a3a52",
    borderRadius: 3,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  listHeader: { marginBottom: 12 },
  listTitle: { color: "#8a9bb5", fontSize: 14, fontWeight: "600" },
  myTaskCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a2a40",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  myTaskLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  fileIconBox: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#0f1b2d",
    justifyContent: "center",
    alignItems: "center",
  },
  myTaskInfo: { flex: 1 },
  myTaskFileName: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  myTaskMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  myTaskDate: { color: "#5a7fa5", fontSize: 12 },
  locationBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#0ea5e918",
    justifyContent: "center",
    alignItems: "center",
  },
  myTaskBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
    marginLeft: 8,
  },
  myTaskBadgeText: { fontSize: 11, fontWeight: "600" },
  emptyBox: { alignItems: "center", marginTop: 40 },
  emptyImage: { width: 150, height: 150, marginBottom: 16 },
  emptyText: { color: "#5a7fa5", fontSize: 15 },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#0ea5e9",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#0ea5e9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  attendanceBtn: {
    position: "absolute",
    bottom: 24,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#10b981",
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 8,
    shadowColor: "#10b981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  attendanceBtnText: { color: "#ffffff", fontSize: 18, fontWeight: "bold" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#0f1b2d",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    minHeight: 350,
    maxHeight: "80%",
    borderWidth: 1,
    borderColor: "#2a3a52",
    borderBottomWidth: 0,
  },
  modalHeader: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 20,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2a3a52",
  },
  modalClose: {
    position: "absolute",
    right: 20,
    top: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#1a2a40",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBody: { paddingHorizontal: 24, paddingBottom: 40 },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#ffffff",
    marginBottom: 16,
  },
  selectedCatBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#0ea5e910",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    alignSelf: "flex-start",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#0ea5e930",
  },
  selectedCatText: { color: "#0ea5e9", fontSize: 13, fontWeight: "600" },
  locationInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#10b98110",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#10b98130",
  },
  locationInfoText: { color: "#10b981", fontSize: 12, flex: 1 },
  locationAccuracy: { color: "#5a7fa5", fontSize: 11 },
  locationCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#0ea5e910",
    borderWidth: 2,
    borderColor: "#0ea5e930",
    justifyContent: "center",
    alignItems: "center",
  },
  locationLoadingText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  locationHint: { color: "#5a7fa5", fontSize: 13, marginTop: 6 },
  cameraBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    borderRadius: 16,
    backgroundColor: "#1a2a40",
    borderWidth: 2,
    borderColor: "#0ea5e930",
    gap: 10,
  },
  cameraIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0ea5e910",
    justifyContent: "center",
    alignItems: "center",
  },
  cameraBtnText: { color: "#0ea5e9", fontSize: 18, fontWeight: "700" },
  cameraBtnHint: { color: "#5a7fa5", fontSize: 13 },
  selectedPhotoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "#1a2a40",
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#10b98140",
  },
  photoPreview: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: "#10b98118",
    justifyContent: "center",
    alignItems: "center",
  },
  photoInfo: { flex: 1 },
  photoName: { color: "#ffffff", fontSize: 14, fontWeight: "500" },
  photoSize: { color: "#5a7fa5", fontSize: 12, marginTop: 2 },
  pickFileBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#2a3a52",
    borderStyle: "dashed",
    backgroundColor: "#1a2a40",
    gap: 6,
  },
  pickFileText: { color: "#0ea5e9", fontSize: 15, fontWeight: "600" },
  pickFileHint: { color: "#5a7fa5", fontSize: 12 },
  fileList: { marginTop: 20 },
  fileListTitle: {
    color: "#8a9bb5",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 10,
  },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#1a2a40",
    borderRadius: 10,
    padding: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "#2a3a52",
  },
  fileItemInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  fileItemName: { color: "#ffffff", fontSize: 14 },
  fileItemSize: { color: "#5a7fa5", fontSize: 11, marginTop: 2 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0ea5e9",
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  uploadBtnDisabled: { opacity: 0.4 },
  uploadBtnText: { color: "#ffffff", fontSize: 16, fontWeight: "bold" },
  uploadingText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
  },
  doneCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#10b98118",
    borderWidth: 1.5,
    borderColor: "#10b98140",
    justifyContent: "center",
    alignItems: "center",
  },
  doneText: {
    color: "#10b981",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 16,
  },
  errorCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#ef444418",
    borderWidth: 1.5,
    borderColor: "#ef444440",
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    color: "#ef4444",
    fontSize: 16,
    marginTop: 16,
    textAlign: "center",
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 20,
    backgroundColor: "#0ea5e9",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
  },
  retryBtnText: { color: "#ffffff", fontSize: 14, fontWeight: "600" },
});
