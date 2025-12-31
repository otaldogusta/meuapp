import { useEffect, useMemo, useState } from "react";
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
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  deleteClassCascade,
  duplicateClass,
  getClassById,
  getClasses,
  updateClass,
} from "../../src/db/seed";
import type { ClassGroup } from "../../src/core/models";
import { Button } from "../../src/ui/Button";
import { useAppTheme } from "../../src/ui/app-theme";

export default function ClassDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { colors } = useAppTheme();
  const [cls, setCls] = useState<ClassGroup | null>(null);
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("");
  const [ageBand, setAgeBand] = useState<ClassGroup["ageBand"]>("8-9");
  const [startTime, setStartTime] = useState("14:00");
  const [duration, setDuration] = useState("60");
  const [allClasses, setAllClasses] = useState<ClassGroup[]>([]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([]);
  const [goal, setGoal] = useState<ClassGroup["goal"]>("Fundamentos");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];
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
  const formatDays = (days: number[]) =>
    days.length ? days.map((day) => dayNames[day]).join(", ") : "-";
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
  const parseDuration = (value: string) => {
    const minutes = Number(value);
    if (!Number.isFinite(minutes)) return null;
    return minutes >= 30 && minutes <= 180 ? minutes : null;
  };
  const toMinutes = (value: string) => {
    if (!isValidTime(value)) return null;
    const [hour, minute] = value.split(":").map(Number);
    return hour * 60 + minute;
  };
  const clsId = cls?.id ?? "";
  const clsUnit = cls?.unit ?? "";
  const currentUnit = unit.trim() || clsUnit || "Sem unidade";
  const unitLabel = clsUnit || "Sem unidade";
  const className = cls?.name || "Turma";
  const classAgeBand = cls?.ageBand || ageBand;
  const classDays = cls?.daysOfWeek ?? [];
  const classStartTime = cls?.startTime || "-";
  const classDuration = cls?.durationMinutes ?? 60;
  const classGoal = cls?.goal || goal;
  const conflictSummary = useMemo(() => {
    if (!clsId) return [];
    const start = toMinutes(startTime.trim());
    const durationValue = parseDuration(duration.trim());
    if (start === null || !durationValue) return [];
    const end = start + durationValue;
    return allClasses
      .filter((item) => item.id !== clsId)
      .filter((item) => (item.unit || "Sem unidade") === currentUnit)
      .filter((item) => item.daysOfWeek.some((day) => daysOfWeek.includes(day)))
      .filter((item) => {
        const otherStart = toMinutes(item.startTime || "");
        if (otherStart === null) return false;
        const otherEnd = otherStart + (item.durationMinutes || 60);
        return start < otherEnd && otherStart < end;
      })
      .map((item) => {
        const sharedDays = item.daysOfWeek.filter((day) =>
          daysOfWeek.includes(day)
        );
        return `${item.name} (${sharedDays.map((day) => dayNames[day]).join(", ")})`;
      });
  }, [allClasses, clsId, currentUnit, daysOfWeek, duration, startTime]);
  const goalSuggestions = useMemo(() => {
    if (!clsUnit) return [];
    const matches = allClasses.filter((item) => item.unit === clsUnit);
    const counts = new Map<string, number>();
    matches.forEach((item) => {
      counts.set(item.goal, (counts.get(item.goal) ?? 0) + 1);
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([goal]) => goal)
      .filter((goal) => goal && !goals.includes(goal))
      .slice(0, 4);
  }, [allClasses, clsUnit, goals]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getClassById(id);
      const list = await getClasses();
      if (alive) {
        setCls(data);
        setAllClasses(list);
        setName(data?.name ?? "");
        setUnit(data?.unit ?? "");
        setAgeBand(data?.ageBand ?? "8-9");
        setStartTime(data?.startTime ?? "14:00");
        setDuration(String(data?.durationMinutes ?? 60));
        setDaysOfWeek(data?.daysOfWeek ?? []);
        setGoal(data?.goal ?? "Fundamentos");
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  if (!cls) {
    return (
      <SafeAreaView
        style={{ flex: 1, padding: 16, backgroundColor: colors.background }}
      >
        <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
          Turma nao encontrada
        </Text>
      </SafeAreaView>
    );
  }

  const toggleDay = (value: number) => {
    setDaysOfWeek((prev) =>
      prev.includes(value) ? prev.filter((day) => day !== value) : [...prev, value]
    );
  };

  const saveUnit = async () => {
    if (!cls) return;
    const timeValue = startTime.trim();
    if (!isValidTime(timeValue)) {
      setFormError("Horario invalido. Use HH:MM.");
      Vibration.vibrate(40);
      return;
    }
    const durationValue = parseDuration(duration.trim());
    if (!durationValue) {
      setFormError("Duracao invalida. Use minutos entre 30 e 180.");
      Vibration.vibrate(40);
      return;
    }
    setFormError("");
    setSaving(true);
    try {
      await updateClass(cls.id, {
        name: name.trim() || cls.name,
        unit: unit.trim() || "Rede Esperanca",
        daysOfWeek,
        goal,
        ageBand: ageBand.trim() || cls.ageBand,
        startTime: timeValue,
        durationMinutes: durationValue,
      });
      Vibration.vibrate(60);
      const fresh = await getClassById(cls.id);
      setCls(fresh);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const onDuplicate = () => {
    if (!cls) return;
    Alert.alert(
      "Duplicar turma",
      "Deseja criar uma copia desta turma?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Duplicar",
          onPress: async () => {
            await duplicateClass(cls);
            router.replace("/classes");
          },
        },
      ]
    );
  };

  const onDelete = () => {
    if (!cls) return;
    Vibration.vibrate([0, 80, 60, 80]);
    Alert.alert(
      "Excluir turma",
      "Isso remove treinos, chamadas e alunos da turma. Deseja excluir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteClassCascade(cls.id);
            router.replace("/classes");
          },
        },
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
        contentContainerStyle={{ gap: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 8 }}>
        <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
          {className}
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: colors.primaryBg,
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: "700" }}>
              {unitLabel}
            </Text>
          </View>
          <View
            style={{
              paddingVertical: 4,
              paddingHorizontal: 10,
              borderRadius: 999,
              backgroundColor: colors.secondaryBg,
            }}
          >
            <Text style={{ color: colors.text }}>Faixa {classAgeBand}</Text>
          </View>
        </View>
        </View>

        <View
        style={{
          padding: 14,
          borderRadius: 18,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
          gap: 6,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
          Informacoes
        </Text>
        <Text style={{ color: colors.text }}>
          {"Dias: " + formatDays(classDays)}
        </Text>
        <Text style={{ color: colors.text }}>
          {"Horario: " + classStartTime}
        </Text>
        <Text style={{ color: colors.text }}>
          {"Duracao: " + classDuration + " min"}
        </Text>
        <Text style={{ color: colors.text }}>
          {"Objetivo: " + classGoal}
        </Text>
        </View>

        <View
        style={{
          marginTop: 20,
          gap: 12,
          padding: 16,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
          Acoes rapidas
        </Text>
        <View style={{ gap: 10 }}>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/class/[id]/session", params: { id } })
            }
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.primaryBg,
              shadowColor: "#000",
              shadowOpacity: 0.2,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
            }}
          >
            <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 15 }}>
              Ver aula do dia
            </Text>
            <Text style={{ color: colors.primaryText, marginTop: 6, opacity: 0.85 }}>
              Plano e cronometro
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/class/[id]/attendance",
                params: { id },
              })
            }
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.successBg,
              shadowColor: "#000",
              shadowOpacity: 0.12,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 3,
            }}
          >
            <Text style={{ color: colors.successText, fontWeight: "700", fontSize: 15 }}>
              Fazer chamada
            </Text>
            <Text style={{ color: colors.successText, marginTop: 6, opacity: 0.7 }}>
              Presenca rapida
            </Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({ pathname: "/class/[id]/log", params: { id } })
            }
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 16,
              backgroundColor: colors.inputBg,
              borderWidth: 1,
              borderColor: colors.border,
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }}>
              Registrar pos-aula
            </Text>
            <Text style={{ color: colors.muted, marginTop: 6 }}>
              RPE e observacoes
            </Text>
          </Pressable>
        </View>
        </View>

        <View
        style={{
          marginTop: 16,
          gap: 12,
          padding: 16,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
        }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
          Editar turma
        </Text>
        {conflictSummary.length ? (
          <View
            style={{
              padding: 10,
              borderRadius: 12,
              backgroundColor: colors.dangerBg,
              borderWidth: 1,
              borderColor: colors.dangerBorder,
              gap: 4,
            }}
          >
            <Text style={{ color: colors.dangerText, fontWeight: "700" }}>
              Conflito de horario
            </Text>
            <Text style={{ color: colors.dangerText }}>
              {conflictSummary.join(", ")}
            </Text>
          </View>
        ) : null}
        <TextInput
          placeholder="Nome da turma"
          value={name}
          onChangeText={setName}
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
          placeholder="Unidade"
          value={unit}
          onChangeText={setUnit}
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
          value={startTime}
          onChangeText={(value) => setStartTime(normalizeTimeInput(value))}
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
            const active = duration === item;
            return (
              <Pressable
                key={item}
                onPress={() => setDuration(item)}
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
        <TextInput
          placeholder="Duracao (min)"
          value={duration}
          onChangeText={setDuration}
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
        <Text style={{ fontSize: 13, color: colors.muted }}>Faixa etaria</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {ageBandOptions.map((band) => {
            const active = ageBand === band;
            return (
              <Pressable
                key={band}
                onPress={() => setAgeBand(band)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                }}
              >
                <Text style={{ color: active ? colors.primaryText : colors.text }}>{band}</Text>
              </Pressable>
            );
          })}
        </View>
        <TextInput
          placeholder="Faixa etaria (ex: 14-16)"
          value={ageBand}
          onChangeText={setAgeBand}
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
        <Text style={{ fontSize: 13, color: colors.muted }}>Dias da semana</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {dayNames.map((label, index) => {
            const active = daysOfWeek.includes(index);
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
                <Text style={{ color: active ? colors.primaryText : colors.text }}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={{ fontSize: 13, color: colors.muted }}>Objetivo</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          {goals.map((item) => {
            const active = goal === item;
            return (
              <Pressable
                key={item}
                onPress={() => setGoal(item)}
                style={{
                  paddingVertical: 6,
                  paddingHorizontal: 10,
                  borderRadius: 10,
                  backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                }}
              >
                <Text style={{ color: active ? colors.primaryText : colors.text }}>{item}</Text>
              </Pressable>
            );
          })}
        </View>
        {goalSuggestions.length ? (
          <>
            <Text style={{ fontSize: 13, color: colors.muted }}>
              Sugestoes da turma
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {goalSuggestions.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setGoal(item)}
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
        <TextInput
          placeholder="Objetivo (ex: Forca, Potencia)"
          value={goal}
          onChangeText={setGoal}
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
        {formError ? (
          <Text style={{ color: colors.dangerText, fontSize: 12 }}>{formError}</Text>
        ) : null}
        <Button
          label={saving ? "Salvando..." : "Salvar turma"}
          onPress={saveUnit}
        />
        <View style={{ flexDirection: "row", gap: 10 }}>
          <Pressable
            onPress={onDuplicate}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.secondaryBg,
              borderWidth: 1,
              borderColor: colors.border,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700" }}>
              Duplicar turma
            </Text>
          </Pressable>
          <Pressable
            onPress={onDelete}
            style={{
              flex: 1,
              paddingVertical: 10,
              borderRadius: 12,
              backgroundColor: colors.dangerBg,
              borderWidth: 1,
              borderColor: colors.dangerBorder,
              alignItems: "center",
            }}
          >
            <Text style={{ color: colors.dangerText, fontWeight: "700" }}>
              Excluir turma
            </Text>
          </Pressable>
        </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}





