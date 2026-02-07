import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: "#1a2a40",
          borderTopColor: "#2a3a52",
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: "#0ea5e9",
        tabBarInactiveTintColor: "#5a7fa5",
        headerStyle: { backgroundColor: "#0f1b2d" },
        headerTintColor: "#ffffff",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Vazifalar",
          tabBarIcon: ({ color }) => (
            <Ionicons name="clipboard-outline" size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profil",
          tabBarIcon: ({ color }) => (
            <Ionicons name="person-outline" size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
