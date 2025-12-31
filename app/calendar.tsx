import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { getClasses, getTrainingPlans } from "../src/db/seed";
import type { ClassGroup, TrainingPlan } from "../src/core/models";
import { useAppTheme } from "../src/ui/app-theme";

const pad2 = (value: number) => String(value).padStart(2, "0");

const startOfWeek = (date: Date) => {
  const copy = new Date(date);
  const day = copy.getDay(); // 0=Sun, 1=Mon
  const diff = day === 0 ? -6 : 1 - day;
  copy.setDate(copy.getDate() + diff);
  copy.setHours(0, 0, 0, 0);
  return copy;
};

const formatDate = (date: Date) =>
  pad2(date.getDate()) + "/" + pad2(date.getMonth() + 1);

const formatIsoDate = (date: Date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseTime = (value: string) => {
  const parts = value.split(":");
  const hour = Number(parts[0]);
  const minute = Number(parts[1] ?? "0");
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

const formatTimeRange = (
  hour: number,
  minute: number,
  durationMinutes: number
) => {
  const start = pad2(hour) + ":" + pad2(minute);
  const endTotal = hour * 60 + minute + durationMinutes;
  const endHour = Math.floor(endTotal / 60) % 24;
  const endMinute = endTotal % 60;
  const end = pad2(endHour) + ":" + pad2(endMinute);
  return start + " - " + end;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { colors, mode } = useAppTheme();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [unitFilter, setUnitFilter] = useState("Todas");
  const dayLabels = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const weekLabels = ["", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"];

  useEffect(() => {
    let alive = true;
    (async () => {
      const [classList, planList] = await Promise.all([
        getClasses(),
        getTrainingPlans(),
      ]);
      if (!alive) return;
      setClasses(classList);
      setPlans(planList);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const latestByClassId = useMemo(() => {
    const map: Record<string, TrainingPlan> = {};
    for (const plan of plans) {
      if (!map[plan.classId]) {
        map[plan.classId] = plan;
      }
    }
    return map;
  }, [plans]);

  const plansByClassId = useMemo(() => {
    const map: Record<string, TrainingPlan[]> = {};
    for (const plan of plans) {
      if (!map[plan.classId]) map[plan.classId] = [];
      map[plan.classId].push(plan);
    }
    return map;
  }, [plans]);

  const getAppliedPlan = (classId: string, date: Date) => {
    const list = plansByClassId[classId] ?? [];
    if (!list.length) return null;
    const iso = formatIsoDate(date);
    const weekDay = date.getDay() === 0 ? 7 : date.getDay();
    const byDate = list.find((plan) => plan.applyDate === iso);
    if (byDate) return byDate;
    const byWeekday = list.find((plan) =>
      (plan.applyDays ?? []).includes(weekDay)
    );
    return byWeekday ?? list[0];
  };

  const weekStart = useMemo(() => startOfWeek(new Date()), []);
  const scheduleDays = useMemo(() => {
    const unique = new Set<number>();
    const filteredClasses =
      unitFilter === "Todas"
        ? classes
        : classes.filter((cls) => (cls.unit || "Sem unidade") === unitFilter);
    filteredClasses.forEach((cls) => {
      cls.daysOfWeek.forEach((day) => unique.add(day));
    });
    const days = Array.from(unique).sort((a, b) => a - b);
    if (!days.length) return [{ day: 2 }, { day: 4 }];
    return days.map((day) => ({ day }));
  }, [classes, unitFilter]);

  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    classes.forEach((cls) => {
      units.add(cls.unit || "Sem unidade");
    });
    return ["Todas", ...Array.from(units).sort((a, b) => a.localeCompare(b))];
  }, [classes]);
  const baseHour = 14;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <View style={{ marginBottom: 12 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
          Calendario semanal
        </Text>
        <Text style={{ color: colors.muted, marginTop: 4 }}>
          Dias por unidade e turmas
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingVertical: 12, gap: 16 }}>
        <View
          style={{
            padding: 12,
            borderRadius: 16,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 2,
            gap: 8,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
            Unidade
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {unitOptions.map((unit) => {
                const active = unitFilter === unit;
                return (
                  <Pressable
                    key={unit}
                    onPress={() => setUnitFilter(unit)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      borderRadius: 999,
                      backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                    }}
                  >
                    <Text style={{ color: active ? colors.primaryText : colors.text }}>
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>
        {scheduleDays.map((dayInfo) => {
          const date = new Date(weekStart);
          const day = dayInfo.day;
          const offset = day === 0 ? 6 : day - 1;
          date.setDate(weekStart.getDate() + offset);
          const filteredClasses =
            unitFilter === "Todas"
              ? classes
              : classes.filter((cls) => (cls.unit || "Sem unidade") === unitFilter);
          const filtered = filteredClasses.filter((cls) =>
            cls.daysOfWeek.includes(day)
          );
          return (
            <View key={String(day)} style={{ gap: 10 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {dayLabels[day]} - {formatDate(date)}
              </Text>
              <View style={{ gap: 10 }}>
                {filtered.map((cls, index) => {
                  const parsed = parseTime(cls.startTime || "");
                  const startHour = parsed?.hour ?? baseHour + index;
                  const startMinute = parsed?.minute ?? 0;
                  const durationMinutes = cls.durationMinutes || 60;
                  const time = formatTimeRange(
                    startHour,
                    startMinute,
                    durationMinutes
                  );
                  const appliedPlan =
                    getAppliedPlan(cls.id, date) ?? latestByClassId[cls.id];
                  const subtitle = appliedPlan
                    ? "Treino: " + appliedPlan.title
                    : "Sem treino cadastrado";
                  const isSpecificDate = Boolean(appliedPlan?.applyDate);
                  const isWeekly = !isSpecificDate && (appliedPlan?.applyDays?.length ?? 0) > 0;
                  const appliedLabel =
                    appliedPlan?.applyDate || appliedPlan?.applyDays?.length
                      ? "Aplicado: " +
                        [
                          appliedPlan.applyDays?.length
                            ? appliedPlan.applyDays
                                .map((day) => weekLabels[day] ?? String(day))
                                .join("/")
                            : null,
                          appliedPlan.applyDate
                            ? formatDate(new Date(appliedPlan.applyDate))
                            : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")
                      : "";
                  return (
                    <Pressable
                      key={cls.id + "-" + day.name}
                      onPress={() =>
                        router.push({
                          pathname: "/class/[id]/session",
                          params: { id: cls.id },
                        })
                      }
                      style={{
                        padding: 14,
                        borderRadius: 18,
                        backgroundColor: isSpecificDate ? colors.warningBg : colors.card,
                        borderWidth: 1,
                        borderColor: isSpecificDate ? colors.warningBg : colors.border,
                        shadowColor: "#000",
                        shadowOpacity: 0.05,
                        shadowRadius: 10,
                        shadowOffset: { width: 0, height: 6 },
                        elevation: 2,
                      }}
                    >
                      {isSpecificDate ? (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingVertical: 2,
                            paddingHorizontal: 8,
                            borderRadius: 999,
                            backgroundColor: colors.warningBg,
                            marginBottom: 6,
                          }}
                        >
                          <Text style={{ color: colors.warningText, fontWeight: "700", fontSize: 11 }}>
                            Data fixa
                          </Text>
                        </View>
                      ) : isWeekly ? (
                        <View
                          style={{
                            alignSelf: "flex-start",
                            paddingVertical: 2,
                            paddingHorizontal: 8,
                            borderRadius: 999,
                            backgroundColor: colors.infoBg,
                            marginBottom: 6,
                          }}
                        >
                          <Text style={{ color: colors.infoText, fontWeight: "700", fontSize: 11 }}>
                            Semanal
                          </Text>
                        </View>
                      ) : null}
                      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                        {time + " - " + cls.name}
                      </Text>
                      <Text style={{ color: colors.muted, marginTop: 6 }}>
                        {subtitle}
                      </Text>
                      {appliedLabel ? (
                        <Text style={{ color: colors.muted, marginTop: 4 }}>
                          {appliedLabel}
                        </Text>
                      ) : null}
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}




