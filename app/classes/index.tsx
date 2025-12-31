import { useCallback, useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  Vibration,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";

import { getClasses, saveClass } from "../../src/db/seed";
import type { ClassGroup } from "../../src/core/models";
import { useAppTheme } from "../../src/ui/app-theme";

export default function ClassesScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [classes, setClasses] = useState<ClassGroup[]>([]);

  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
  const formatDays = (days: number[]) =>
    days.length ? days.map((day) => dayNames[day]).join(", ") : "-";

  const [showNew, setShowNew] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newAgeBand, setNewAgeBand] = useState<ClassGroup["ageBand"]>("8-9");
  const [newGoal, setNewGoal] = useState<ClassGroup["goal"]>("Fundamentos");
  const [newStartTime, setNewStartTime] = useState("14:00");
  const [newDuration, setNewDuration] = useState("60");
  const [newDays, setNewDays] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const [showAllGoals, setShowAllGoals] = useState(false);
  const [showAllAges, setShowAllAges] = useState(false);
  const ageBandOptions = ["8-9", "10-12", "13-15", "16-18"];
  const goals: ClassGroup["goal"][] = [
    "Fundamentos",
    "Forca Geral",
    "Potencia/Agilidade",
    "Forca+Potencia",
    "Velocidade",
    "Agilidade",
    "Resistencia",
    "Potencia",
    "Mobilidade",
    "Coordenacao",
    "Prevencao de lesoes",
  ];
  const durationOptions = ["60", "75", "90"];

  const units = useMemo(() => {
    const set = new Set<string>();
    classes.forEach((item) => {
      if (item.unit) set.add(item.unit);
    });
    return ["Todas", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
  }, [classes]);
  const [unitFilter, setUnitFilter] = useState("Todas");

  const filteredClasses = useMemo(() => {
    if (unitFilter === "Todas") return classes;
    return classes.filter((item) => item.unit === unitFilter);
  }, [classes, unitFilter]);

  const goalSuggestions = useMemo(() => {
    const key = newUnit.trim();
    const matches = classes.filter((item) => {
      if (key) return item.unit === key;
      if (newAgeBand) return item.ageBand === newAgeBand;
      return false;
    });
    const counts = new Map<string, number>();
    matches.forEach((item) => {
      counts.set(item.goal, (counts.get(item.goal) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([goal]) => goal)
      .filter((goal) => goal && !goals.includes(goal))
      .slice(0, 4);
  }, [classes, goals, newAgeBand, newUnit]);

  const normalizeTimeInput = (value: string) => {
    const digits = value.replace(/[^\d]/g, "").slice(0, 4);
    if (digits.length <= 2) return digits;
    return digits.slice(0, 2) + ":" + digits.slice(2);
  };

  const isValidTime = (value: string) => {
    const match = value.match(/^(\d{2}):(\d{2})$/);
    if (!match) return false;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
  };

  const toMinutes = (value: string) => {
    if (!isValidTime(value)) return null;
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  };

  const parseDuration = (value: string) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return null;
    return minutes >= 30 && minutes <= 180 ? minutes : null;
  };

  const conflictsById = useMemo(() => {
    const map: Record<string, { name: string; day: number }[]> = {};
    for (let i = 0; i < classes.length; i += 1) {
      const a = classes[i];
      const aStart = toMinutes(a.startTime || "");
      if (aStart === null) continue;
      const aEnd = aStart + (a.durationMinutes || 60);
      for (let j = i + 1; j < classes.length; j += 1) {
        const b = classes[j];
        if ((a.unit || "Sem unidade") !== (b.unit || "Sem unidade")) continue;
        const bStart = toMinutes(b.startTime || "");
        if (bStart === null) continue;
        const bEnd = bStart + (b.durationMinutes || 60);
        const sharedDays = a.daysOfWeek.filter((day) =>
          b.daysOfWeek.includes(day)
        );
        if (!sharedDays.length) continue;
        const overlap = aStart < bEnd && bStart < aEnd;
        if (!overlap) continue;
        sharedDays.forEach((day) => {
          if (!map[a.id]) map[a.id] = [];
          if (!map[b.id]) map[b.id] = [];
          map[a.id].push({ name: b.name, day });
          map[b.id].push({ name: a.name, day });
        });
      }
    }
    return map;
  }, [classes]);

  const grouped = useMemo(() => {
    const map: Record<string, ClassGroup[]> = {};
    filteredClasses.forEach((item) => {
      const key = item.unit || "Sem unidade";
      if (!map[key]) map[key] = [];
      map[key].push(item);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filteredClasses]);

  const loadClasses = useCallback(async (alive?: { current: boolean }) => {
    const data = await getClasses();
    if (!alive || alive.current) setClasses(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      const alive = { current: true };
      loadClasses(alive);
      return () => {
        alive.current = false;
      };
    }, [loadClasses])
  );

  const toggleDay = (value: number) => {
    setNewDays((prev) =>
      prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]
    );
  };

  const saveNewClass = async () => {
    if (!newName.trim()) return;
    const timeValue = newStartTime.trim();
    if (!isValidTime(timeValue)) {
      setFormError("Horario invalido. Use HH:MM.");
      Vibration.vibrate(40);
      return;
    }
    const durationValue = parseDuration(newDuration.trim());
    if (!durationValue) {
      setFormError("Duracao invalida. Use minutos entre 30 e 180.");
      Vibration.vibrate(40);
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await saveClass({
        name: newName.trim(),
        unit: newUnit.trim() || "Sem unidade",
        ageBand: newAgeBand,
        daysOfWeek: newDays,
        goal: newGoal,
        startTime: timeValue,
        durationMinutes: durationValue,
      });
      Vibration.vibrate(60);
      setNewName("");
      setNewUnit("");
      setNewAgeBand("8-9");
      setNewGoal("Fundamentos");
      setNewDays([]);
      setNewStartTime("14:00");
      setNewDuration("60");
      setShowNew(false);
      await loadClasses();
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const isDirty =
    newName.trim() ||
    newUnit.trim() ||
    newStartTime.trim() !== "14:00" ||
    newDuration.trim() !== "60" ||
    newAgeBand.trim() !== "8-9" ||
    newGoal.trim() !== "Fundamentos" ||
    newDays.length > 0;

  const confirmCloseForm = () => {
    if (!isDirty) {
      setShowNew(false);
      return;
    }
    Alert.alert(
      "Deseja sair sem salvar?",
      "Voce tem alteracoes nao salvas.",
      [
        { text: "Salvar", onPress: saveNewClass },
        { text: "Sair mesmo", style: "destructive", onPress: () => setShowNew(false) },
        { text: "Cancelar", style: "cancel" },
      ]
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={{
          gap: 16,
          paddingBottom: showNew ? 120 : 24,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ marginBottom: 4 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
            Turmas
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>Lista completa</Text>
        </View>

        <View style={{ gap: 8 }}>
          <Pressable
            onPress={() => (showNew ? confirmCloseForm() : setShowNew(true))}
            style={{
              width: "100%",
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 16,
              backgroundColor: colors.primaryBg,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 16 }}>
                {showNew ? "Fechar cadastro" : "+ Nova turma"}
              </Text>
              <Text style={{ color: colors.primaryText, fontSize: 12, opacity: 0.85 }}>
                {showNew
                  ? "Voltar para a lista"
                  : "Cadastre uma nova turma agora"}
              </Text>
            </View>
          </Pressable>
          {showNew ? (
            <View
              style={{
                padding: 14,
                borderRadius: 18,
                backgroundColor: colors.card,
                borderWidth: 1,
                borderColor: colors.border,
                gap: 10,
              }}
            >
              <TextInput
                placeholder="Nome da turma"
                value={newName}
                onChangeText={setNewName}
                placeholderTextColor={colors.placeholder}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                }}
              />
              <TextInput
                placeholder="Unidade (ex: Rede Esperanca)"
                value={newUnit}
                onChangeText={setNewUnit}
                placeholderTextColor={colors.placeholder}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                }}
              />
              <TextInput
                placeholder="Horario (HH:MM)"
                value={newStartTime}
                onChangeText={(value) =>
                  setNewStartTime(normalizeTimeInput(value))
                }
                keyboardType="numeric"
                placeholderTextColor={colors.placeholder}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 12,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                }}
              />
              <Text style={{ fontSize: 13, color: colors.muted }}>Duracao</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {durationOptions.map((item) => {
                  const active = newDuration === item;
                  return (
                    <Pressable
                      key={item}
                      onPress={() => {
                        setNewDuration(item);
                        setShowCustomDuration(false);
                      }}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                      }}
                    >
                      <Text style={{ color: active ? colors.primaryText : colors.text }}>
                        {item + " min"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Pressable
                onPress={() => setShowCustomDuration((prev) => !prev)}
                style={{
                  alignSelf: "flex-start",
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.primaryBg, fontWeight: "700" }}>
                  {showCustomDuration ? "Ocultar duracao" : "Personalizar duracao"}
                </Text>
              </Pressable>
              {showCustomDuration ? (
                <TextInput
                  placeholder="Duracao (min)"
                  value={newDuration}
                  onChangeText={setNewDuration}
                  keyboardType="numeric"
                  placeholderTextColor={colors.placeholder}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                  }}
                />
              ) : null}
              <Text style={{ fontSize: 13, color: colors.muted }}>Faixa etaria</Text>
              {showAllAges ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {ageBandOptions.map((band) => {
                    const active = newAgeBand === band;
                    return (
                      <Pressable
                        key={band}
                        onPress={() => setNewAgeBand(band)}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                        }}
                      >
                        <Text style={{ color: active ? colors.primaryText : colors.text }}>
                          {band}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {ageBandOptions.slice(0, 3).map((band) => {
                      const active = newAgeBand === band;
                      return (
                        <Pressable
                          key={band}
                          onPress={() => setNewAgeBand(band)}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                          }}
                        >
                          <Text style={{ color: active ? colors.primaryText : colors.text }}>
                            {band}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              <Pressable
                onPress={() => setShowAllAges((prev) => !prev)}
                style={{
                  alignSelf: "flex-start",
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.primaryBg, fontWeight: "700" }}>
                  {showAllAges ? "Ver menos" : "Ver mais idades"}
                </Text>
              </Pressable>
              {showAllAges ? (
                <TextInput
                  placeholder="Faixa etaria (ex: 14-16)"
                  value={newAgeBand}
                  onChangeText={setNewAgeBand}
                  placeholderTextColor={colors.placeholder}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                  }}
                />
              ) : null}
              <Text style={{ fontSize: 13, color: colors.muted }}>Dias da semana</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                {dayNames.map((label, index) => {
                  const active = newDays.includes(index);
                  return (
                    <Pressable
                      key={label}
                      onPress={() => toggleDay(index)}
                      style={{
                        paddingVertical: 6,
                        paddingHorizontal: 10,
                        borderRadius: 10,
                        backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                      }}
                    >
                      <Text style={{ color: active ? colors.primaryText : colors.text }}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontSize: 13, color: colors.muted }}>Objetivo</Text>
              {showAllGoals ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  {goals.map((item) => {
                    const active = newGoal === item;
                    return (
                      <Pressable
                        key={item}
                        onPress={() => setNewGoal(item)}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                        }}
                      >
                        <Text style={{ color: active ? colors.primaryText : colors.text }}>
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {goals.slice(0, 4).map((item) => {
                      const active = newGoal === item;
                      return (
                        <Pressable
                          key={item}
                          onPress={() => setNewGoal(item)}
                          style={{
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 10,
                            backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                          }}
                        >
                          <Text style={{ color: active ? colors.primaryText : colors.text }}>
                            {item}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </ScrollView>
              )}
              <Pressable
                onPress={() => setShowAllGoals((prev) => !prev)}
                style={{
                  alignSelf: "flex-start",
                  paddingVertical: 4,
                }}
              >
                <Text style={{ color: colors.primaryBg, fontWeight: "700" }}>
                  {showAllGoals ? "Ver menos" : "Ver mais objetivos"}
                </Text>
              </Pressable>
              {goalSuggestions.length ? (
                <>
                  <Text style={{ fontSize: 13, color: colors.muted }}>
                    Sugestoes da turma
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    {goalSuggestions.map((item) => (
                      <Pressable
                        key={item}
                        onPress={() => setNewGoal(item)}
                        style={{
                          paddingVertical: 6,
                          paddingHorizontal: 10,
                          borderRadius: 10,
                          backgroundColor: colors.secondaryBg,
                        }}
                      >
                        <Text style={{ color: colors.text }}>{item}</Text>
                      </Pressable>
                    ))}
                  </View>
                </>
              ) : null}
              {showAllGoals ? (
                <TextInput
                  placeholder="Objetivo (ex: Forca, Potencia)"
                  value={newGoal}
                  onChangeText={setNewGoal}
                  placeholderTextColor={colors.placeholder}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                  }}
                />
              ) : null}
              {formError ? (
            <Text style={{ color: colors.dangerText, fontSize: 12 }}>
              {formError}
            </Text>
              ) : null}
            </View>
          ) : null}
        </View>

        <View
          style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingBottom: 4 }}
        >
          {units.map((unit) => {
            const active = unitFilter === unit;
            return (
              <Pressable
                key={unit}
                onPress={() => setUnitFilter(unit)}
                style={{
                  paddingVertical: 4,
                  paddingHorizontal: 10,
                  borderRadius: 999,
                  backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                  borderWidth: 1,
                  borderColor: active ? colors.primaryBg : colors.border,
                }}
              >
                <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 12 }}>
                  {unit}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {grouped.map(([unit, items]) => (
          <View key={unit} style={{ gap: 10 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {unit}
              </Text>
              <Text style={{ color: colors.muted }}>
                {"Turmas: " + items.length}
              </Text>
            </View>
            <View style={{ gap: 12 }}>
              {items.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() =>
                    router.push({
                      pathname: "/class/[id]",
                      params: { id: item.id },
                    })
                  }
                  style={{
                    padding: 14,
                    borderRadius: 18,
                    backgroundColor: colors.card,
                    borderWidth: 1,
                    borderColor: colors.border,
                    shadowColor: "#000",
                    shadowOpacity: 0.05,
                    shadowRadius: 10,
                    shadowOffset: { width: 0, height: 6 },
                    elevation: 2,
                  }}
                >
                  {conflictsById[item.id]?.length ? (
                    <View
                      style={{
                        alignSelf: "flex-start",
                        paddingVertical: 2,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: colors.dangerBg,
                        marginBottom: 6,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.dangerText,
                          fontWeight: "700",
                          fontSize: 11,
                        }}
                      >
                        Conflito de horario
                      </Text>
                    </View>
                  ) : null}
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                    {item.name + " (" + item.ageBand + ")"}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 6 }}>
                    {"Dias: " + formatDays(item.daysOfWeek)}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    {"Horario: " + (item.startTime || "-")}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    {"Duracao: " + (item.durationMinutes || 60) + " min"}
                  </Text>
                  <Text style={{ color: colors.muted, marginTop: 2 }}>
                    {"Objetivo: " + item.goal}
                  </Text>
                  {conflictsById[item.id]?.length ? (
                    <Text style={{ color: colors.dangerText, marginTop: 6 }}>
                      {"Conflitos: " +
                        conflictsById[item.id]
                          .map(
                            (conflict) =>
                              `${conflict.name} (${dayNames[conflict.day]})`
                          )
                          .join(", ")}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
      </KeyboardAvoidingView>
      {showNew ? (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 16,
            backgroundColor: "#2563eb",
            borderRadius: 16,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Pressable onPress={saveNewClass} style={{ width: "100%" }}>
            <Text
              style={{
                color: colors.primaryText,
                fontWeight: "700",
                textAlign: "center",
                fontSize: 16,
              }}
            >
              {saving ? "Salvando..." : "Salvar turma"}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}



