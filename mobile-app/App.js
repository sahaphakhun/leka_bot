/**
 * Main App Entry Point
 */

import React, { useEffect, useRef } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";

import { AuthProvider, useAuth } from "./src/contexts/AuthContext";
import colors from "./src/utils/colors";
import {
  registerForPushNotifications,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from "./src/services/notifications";

// Screens
import LoginScreen from "./src/screens/LoginScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import TasksScreen from "./src/screens/TasksScreen";
import TaskDetailScreen from "./src/screens/TaskDetailScreen";
import MembersScreen from "./src/screens/MembersScreen";
import LeaderboardScreen from "./src/screens/LeaderboardScreen";
import FilesScreen from "./src/screens/FilesScreen";
import ActivityScreen from "./src/screens/ActivityScreen";
import ProfileScreen from "./src/screens/ProfileScreen";

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === "Dashboard") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Tasks") {
            iconName = focused ? "checkbox" : "checkbox-outline";
          } else if (route.name === "Members") {
            iconName = focused ? "people" : "people-outline";
          } else if (route.name === "Files") {
            iconName = focused ? "folder" : "folder-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: "#fff",
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
        },
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: "#fff",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: "แดชบอร์ด" }}
      />
      <Tab.Screen
        name="Tasks"
        component={TasksScreen}
        options={{ title: "งาน" }}
      />
      <Tab.Screen
        name="Members"
        component={MembersScreen}
        options={{ title: "สมาชิก" }}
      />
      <Tab.Screen
        name="Files"
        component={FilesScreen}
        options={{ title: "ไฟล์" }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: "โปรไฟล์" }}
      />
    </Tab.Navigator>
  );
}

function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return null; // Or a loading screen
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {!isAuthenticated ? (
        <Stack.Screen name="Login" component={LoginScreen} />
      ) : (
        <>
          <Stack.Screen name="Main" component={TabNavigator} />
          <Stack.Screen
            name="TaskDetail"
            component={TaskDetailScreen}
            options={{
              headerShown: true,
              title: "รายละเอียดงาน",
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: "#fff",
            }}
          />
          <Stack.Screen
            name="Leaderboard"
            component={LeaderboardScreen}
            options={{
              headerShown: true,
              title: "กระดานผู้นำ",
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: "#fff",
            }}
          />
          <Stack.Screen
            name="Activity"
            component={ActivityScreen}
            options={{
              headerShown: true,
              title: "กิจกรรม",
              headerStyle: { backgroundColor: colors.primary },
              headerTintColor: "#fff",
            }}
          />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  const navigationRef = useRef();
  const notificationListener = useRef();
  const responseListener = useRef();

  useEffect(() => {
    // Register for push notifications
    registerForPushNotifications().then((token) => {
      if (token) {
        console.log("Push notification token:", token);
        // TODO: Send token to backend
      }
    });

    // Listen for notifications while app is running
    notificationListener.current = addNotificationReceivedListener(
      (notification) => {
        console.log("Notification received:", notification);
      },
    );

    // Listen for user interactions with notifications
    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      console.log("Notification tapped:", data);

      // Navigate based on notification type
      if (data.taskId && navigationRef.current) {
        navigationRef.current.navigate("TaskDetail", { taskId: data.taskId });
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return (
    <AuthProvider>
      <NavigationContainer ref={navigationRef}>
        <StatusBar style="light" />
        <AppNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}
