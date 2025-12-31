import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Notifications from "expo-notifications";

import { Typography } from "../../src/ui/Typography";
import { Button } from "../../src/ui/Button";
import { useAppTheme } from "../../src/ui/app-theme";

const STORAGE_KEY = "notify_settings_v1";

const dayOptions = [
  { label: "Dom", value: 1 },
  { label: "Seg", value: 2 },
  { label: "Ter", value: 3 },
  { label: "Qua", value: 4 },
  { label: "Qui", value: 5 },
  { label: "Sex", value: 6 },
  { label: "Sab", value: 7 },
];

const parseTime = (value: string) => {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const isWeb = Platform.OS === "web";

export default function NotificationsScreen() {
  const { colors } = useAppTheme();
  const [enabled, setEnabled] = useState(false);
  const [time, setTime] = useState("13:30");
  const [days, setDays] = useState<number[]>([3, 5]);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw || !alive) return;
      const data = JSON.parse(raw) as {
        enabled: boolean;
        time: string;
        days: number[];
      };
      setEnabled(Boolean(data.enabled));
      setTime(data.time || "13:30");
      setDays(Array.isArray(data.days) ? data.days : [3, 5]);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const sortedDays = useMemo(() => [...days].sort(), [days]);

  const toggleDay = (value: number) => {
    setDays((prev) =>
      prev.includes(value) ? prev.filter((d) => d !== value) : [...prev, value]
    );
  };

  const requestPermissions = async () => {
    if (isWeb) return false;
    const { status } = await Notifications.getPermissionsAsync();
    if (status === "granted") return true;
    const result = await Notifications.requestPermissionsAsync();
    return result.status === "granted";
  };

  const scheduleNotifications = async () => {
    if (isWeb) {
      setStatus("Notificacoes nao sao suportadas no navegador.");
      return;
    }
    const parsed = parseTime(time);
    if (!parsed) {
      setStatus("Horario invalido. Use HH:MM.");
      return;
    }

    const ok = await requestPermissions();
    if (!ok) {
      setStatus("Permissao negada.");
      return;
    }

    await Notifications.cancelAllScheduledNotificationsAsync();

    for (const weekday of sortedDays) {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Lembrete de aula",
          body: "Confira a chamada e o treino do dia.",
        },
        trigger: {
          weekday,
          hour: parsed.hour,
          minute: parsed.minute,
          repeats: true,
        },
      });
    }

    setStatus("Lembretes agendados.");
  };

  const disableNotifications = async () => {
    if (isWeb) {
      setStatus("Notificacoes nao sao suportadas no navegador.");
      return;
    }
    await Notifications.cancelAllScheduledNotificationsAsync();
    setStatus("Lembretes removidos.");
  };

  const saveSettings = async () => {
    await AsyncStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ enabled, time, days: sortedDays })
    );
  };

  const apply = async () => {
    setStatus("");
    await saveSettings();
    if (enabled) {
      await scheduleNotifications();
    } else {
      await disableNotifications();
    }
  };

  return (
    <SafeAreaView
      style={{ flex: 1, padding: 16, backgroundColor: colors.background }}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <Typography variant="title">Notificacoes</Typography>
      <Typography variant="subtitle">Lembrete geral de aula</Typography>

      <View style={{ marginTop: 16, gap: 12 }}>
        <Pressable
          onPress={() => setEnabled((prev) => !prev)}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: enabled ? colors.primaryBg : colors.secondaryBg,
          }}
        >
          <Text style={{ color: enabled ? colors.primaryText : colors.text, fontWeight: "700" }}>
            {enabled ? "Lembrete ligado" : "Lembrete desligado"}
          </Text>
        </Pressable>

        <View>
          <Typography variant="body">Dias da semana</Typography>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
            {dayOptions.map((day) => {
              const active = days.includes(day.value);
              return (
                <Pressable
                  key={day.value}
                  onPress={() => toggleDay(day.value)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                  }}
                >
                  <Text style={{ color: active ? colors.primaryText : colors.text }}>
                    {day.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>

        <View>
          <Typography variant="body">Horario (HH:MM)</Typography>
          <TextInput
            value={time}
            onChangeText={setTime}
            placeholder="13:30"
            style={{
              borderWidth: 1,
              borderColor: "#ddd",
              padding: 10,
              borderRadius: 10,
              marginTop: 8,
            }}
          />
        </View>

        <Button label="Aplicar" onPress={apply} />
        {status ? (
          <Text style={{ color: colors.text, marginTop: 6 }}>{status}</Text>
        ) : null}
      </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}



