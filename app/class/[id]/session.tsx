import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getClassById,
  getLatestTrainingPlanByClass,
  getClasses,
} from "../../../src/db/seed";
import type { ClassGroup, TrainingPlan } from "../../../src/core/models";
import { generateSession } from "../../../src/core/sessionGenerator";
import { useAppTheme } from "../../../src/ui/app-theme";

export default function SessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, mode } = useAppTheme();
  const [cls, setCls] = useState<ClassGroup | null>(null);
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [scheduleText, setScheduleText] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [running, setRunning] = useState(false);
  const [remainingSec, setRemainingSec] = useState(0);
  const parseTime = (value: string) => {
    const parts = value.split(":");
    const hour = Number(parts[0]);
    const minute = Number(parts[1] ?? "0");
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return { hour, minute };
  };
  const formatRange = (hour: number, minute: number, durationMinutes: number) => {
    const start = String(hour).padStart(2, "0") + ":" + String(minute).padStart(2, "0");
    const endTotal = hour * 60 + minute + durationMinutes;
    const endHour = Math.floor(endTotal / 60) % 24;
    const endMinute = endTotal % 60;
    const end = String(endHour).padStart(2, "0") + ":" + String(endMinute).padStart(2, "0");
    return start + " - " + end;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getClassById(id);
      if (alive) setCls(data);
      if (data) {
        const latest = await getLatestTrainingPlanByClass(data.id);
        if (alive) setPlan(latest);
        const classes = await getClasses();
        const index = classes.findIndex((item) => item.id === data.id);
        if (index >= 0) {
          const parsed = parseTime(data.startTime || "");
          const startHour = parsed?.hour ?? 14 + index;
          const startMinute = parsed?.minute ?? 0;
          const durationMinutes = data.durationMinutes ?? 60;
          const time = formatRange(startHour, startMinute, durationMinutes);
          const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
          const days = data.daysOfWeek.length
            ? data.daysOfWeek.map((day) => dayNames[day]).join(", ")
            : "-";
          if (alive) setScheduleText("Dias: " + days + " - " + time);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const title = plan ? "Treino mais recente" : "Aula do dia";
  const session = useMemo(() => {
    if (!cls) return null;
    return generateSession(cls);
  }, [cls]);
  const block = plan ? plan.title : session?.block ?? "";
  const warmup = plan?.warmup ?? session?.warmup ?? [];
  const main = plan?.main ?? session?.main ?? [];
  const cooldown = plan?.cooldown ?? session?.cooldown ?? [];
  const warmupLabel = plan?.warmupTime
    ? "Aquecimento (" + plan.warmupTime + ")"
    : "Aquecimento (10 min)";
  const mainLabel = plan?.mainTime
    ? "Parte principal (" + plan.mainTime + ")"
    : "Parte principal (45 min)";
  const cooldownLabel = plan?.cooldownTime
    ? "Volta a calma (" + plan.cooldownTime + ")"
    : "Volta a calma (5 min)";

  const parseMinutes = (value: string, fallback: number) => {
    const match = value.match(/\d+/);
    if (!match) return fallback;
    const minutes = Number(match[0]);
    return Number.isFinite(minutes) && minutes > 0 ? minutes : fallback;
  };

  const durations = useMemo(() => {
    return [
      plan?.warmupTime
        ? parseMinutes(plan.warmupTime, 10)
        : 10,
      plan?.mainTime
        ? parseMinutes(plan.mainTime, 45)
        : 45,
      plan?.cooldownTime
        ? parseMinutes(plan.cooldownTime, 5)
        : 5,
    ];
  }, [plan]);

  useEffect(() => {
    setRemainingSec(durations[activeIndex] * 60);
    setRunning(false);
  }, [activeIndex, durations]);

  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => {
      setRemainingSec((prev) => {
        if (prev <= 1) {
          setRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [running]);

  const formatTime = (value: number) => {
    const mins = Math.floor(value / 60);
    const secs = value % 60;
    return String(mins).padStart(2, "0") + ":" + String(secs).padStart(2, "0");
  };

  if (!cls) return null;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View style={{ gap: 6, marginBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
          {title}
        </Text>
        <Text style={{ color: colors.muted }}>{cls.name + " - " + block}</Text>
        {scheduleText ? (
          <Text style={{ color: colors.text }}>Horario: {scheduleText}</Text>
        ) : null}
      </View>

      <View
        style={{
          padding: 16,
          borderRadius: 20,
          backgroundColor: colors.primaryBg,
          marginBottom: 12,
        }}
      >
        <Text style={{ color: colors.primaryText, fontSize: 14, opacity: 0.85 }}>
          Cronometro do bloco
        </Text>
        <Text style={{ color: colors.primaryText, fontSize: 28, fontWeight: "700" }}>
          {formatTime(remainingSec)}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
          <Pressable
            onPress={() => setRunning((prev) => !prev)}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: running ? colors.warningBg : colors.successBg,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.warningText }}>
              {running ? "Pausar" : "Iniciar"}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setRemainingSec(durations[activeIndex] * 60);
              setRunning(false);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.secondaryBg,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.text }}>Reset</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              setActiveIndex((prev) => Math.min(prev + 1, 2))
            }
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 999,
              backgroundColor: colors.secondaryBg,
            }}
          >
            <Text style={{ fontWeight: "700", color: colors.text }}>
              Proximo bloco
            </Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 12 }}>
        {[
          { label: warmupLabel, items: warmup },
          { label: mainLabel, items: main },
          { label: cooldownLabel, items: cooldown },
        ].map((section, index) => (
          <View
            key={section.label}
            style={{
              padding: 14,
              borderRadius: 18,
              backgroundColor: index === activeIndex ? (mode === "dark" ? "#1e293b" : "#e0f2fe") : colors.card,
              borderWidth: 1,
              borderColor: index === activeIndex ? "#38bdf8" : colors.border,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
              {section.label}
            </Text>
            <Text style={{ color: colors.text, marginTop: 4 }}>
              {"Tempo: " + durations[index] + " min"}
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              {section.items.length ? section.items.join(" - ") : "Sem itens"}
            </Text>
            <Pressable
              onPress={() => setActiveIndex(index)}
              style={{
                marginTop: 10,
                alignSelf: "flex-start",
                paddingVertical: 6,
                paddingHorizontal: 10,
                borderRadius: 999,
                backgroundColor: index === activeIndex ? colors.primaryBg : colors.secondaryBg,
              }}
            >
              <Text
                style={{
                  color: index === activeIndex ? colors.primaryText : colors.text,
                  fontWeight: "700",
                }}
              >
                {index === activeIndex ? "Bloco atual" : "Usar bloco"}
              </Text>
            </Pressable>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}



