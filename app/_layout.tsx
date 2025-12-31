import { useEffect } from "react";
import { Stack } from "expo-router";
import * as Notifications from "expo-notifications";

import { initDb } from "../src/db/sqlite";
import { AppThemeProvider } from "../src/ui/app-theme";
import { useAppTheme } from "../src/ui/app-theme";

function RootLayoutContent() {
  const { colors } = useAppTheme();
  return (
    <Stack
      screenOptions={{
        headerTitleAlign: "center",
        contentStyle: { backgroundColor: colors.background },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
      }}
    />
  );
}

export default function RootLayout() {
  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    initDb();
  }, []);

  return (
    <AppThemeProvider>
      <RootLayoutContent />
    </AppThemeProvider>
  );
}
