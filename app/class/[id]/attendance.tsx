import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  getClassById,
  getStudentsByClass,
  saveAttendanceRecords,
  getAttendanceByClass,
  getAttendanceByDate,
} from "../../../src/db/seed";
import type {
  AttendanceRecord,
  ClassGroup,
  Student,
} from "../../../src/core/models";
import { Button } from "../../../src/ui/Button";
import { Typography } from "../../../src/ui/Typography";
import { useAppTheme } from "../../../src/ui/app-theme";

const formatDate = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const monthNames = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const dayLabels = ["D", "S", "T", "Q", "Q", "S", "S"];

const getCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: Date | null }> = [];

  for (let i = 0; i < 42; i += 1) {
    const dayNumber = i - firstDay + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cells.push({ date: null });
    } else {
      cells.push({ date: new Date(year, month, dayNumber) });
    }
  }

  return cells;
};

export default function AttendanceScreen() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [cls, setCls] = useState<ClassGroup | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [date, setDate] = useState(formatDate(new Date()));
  const [statusById, setStatusById] = useState<Record<string, "presente" | "faltou" | undefined>>({});
  const [noteById, setNoteById] = useState<Record<string, string>>({});
  const [history, setHistory] = useState<AttendanceRecord[]>([]);
  const [historyFilter, setHistoryFilter] = useState("");
  const [csvPreview, setCsvPreview] = useState("");
  const [expandedById, setExpandedById] = useState<Record<string, boolean>>({});
  const [showHistory, setShowHistory] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  useEffect(() => {
    let alive = true;
    (async () => {
      const data = await getClassById(id);
      if (alive) setCls(data);
      if (data) {
        const list = await getStudentsByClass(data.id);
        if (alive) setStudents(list);
        const past = await getAttendanceByClass(data.id);
        if (alive) setHistory(past);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  useEffect(() => {
    const initial: Record<string, "presente" | "faltou" | undefined> = {};
    students.forEach((student) => {
      initial[student.id] = statusById[student.id];
    });
    setStatusById(initial);
  }, [students]);

  const items = useMemo(
    () =>
      students.map((student) => ({
        student,
        status: statusById[student.id],
        note: noteById[student.id] ?? "",
      })),
    [students, statusById, noteById]
  );

  const calendarDays = useMemo(() => {
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    return getCalendarDays(year, month);
  }, [calendarMonth]);

  const handleSave = async () => {
    if (!cls) return;
    const createdAt = new Date().toISOString();
    const records: AttendanceRecord[] = items.map((item) => ({
      id: `${cls.id}_${item.student.id}_${date}`,
      classId: cls.id,
      studentId: item.student.id,
      date,
      status: item.status ?? "faltou",
      note: item.note.trim(),
      createdAt,
    }));

    await saveAttendanceRecords(cls.id, date, records);
    const past = await getAttendanceByClass(cls.id);
    setHistory(past);
    router.replace("/");
  };

  const loadDate = async (value: string) => {
    if (!cls) return;
    setDate(value);
    const records = await getAttendanceByDate(cls.id, value);
    if (!records.length) return;
    const nextStatus: Record<string, "presente" | "faltou"> = {};
    const nextNotes: Record<string, string> = {};
    records.forEach((record) => {
      nextStatus[record.studentId] = record.status;
      nextNotes[record.studentId] = record.note;
    });
    setStatusById((prev) => ({ ...prev, ...nextStatus }));
    setNoteById((prev) => ({ ...prev, ...nextNotes }));
  };

  const historyDates = Array.from(
    new Set(history.map((record) => record.date))
  );
  const filteredHistoryDates = historyDates.filter((value) =>
    value.includes(historyFilter.trim())
  );

  const buildCsv = () => {
    const rows = [
      ["date", "class", "student", "status", "note", "phone", "age"],
      ...items.map((item) => [
        date,
        cls?.name ?? "",
        item.student.name,
        item.status,
        item.note ?? "",
        item.student.phone,
        String(item.student.age),
      ]),
    ];
    return rows.map((row) => row.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  };

  const handleExportCsv = () => {
    const csv = buildCsv();
    if (typeof document !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `chamada_${date}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } else {
      setCsvPreview(csv);
    }
  };

  if (!cls) return null;

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <View>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
            Chamada
          </Text>
          <Text style={{ color: colors.muted, marginTop: 4 }}>{cls.name}</Text>
        </View>
      </View>

      <View
        style={{
          gap: 8,
          padding: 14,
          borderRadius: 20,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.06,
          shadowRadius: 10,
          shadowOffset: { width: 0, height: 6 },
          elevation: 3,
          marginBottom: 12,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>
          Data da aula
        </Text>
        <Pressable
          onPress={() => setShowCalendar(true)}
          style={{
            borderWidth: 1,
            borderColor: colors.border,
            padding: 12,
            borderRadius: 14,
            backgroundColor: colors.inputBg,
          }}
        >
          <Text style={{ fontSize: 16, color: colors.text }}>{date}</Text>
        </Pressable>
        <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
          <Button label="Carregar data" onPress={() => loadDate(date)} />
          {historyDates.length > 0 ? (
            <Button
              label="Hoje"
              variant="secondary"
              onPress={() => loadDate(formatDate(new Date()))}
            />
          ) : null}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ gap: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {items.map((item) => (
          <View
            key={item.student.id}
            style={{
              borderRadius: 18,
              padding: 14,
              backgroundColor: colors.card,
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: "#000",
              shadowOpacity: 0.04,
              shadowRadius: 10,
              shadowOffset: { width: 0, height: 6 },
              elevation: 2,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {item.student.name}
              </Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={() =>
                    setStatusById((prev) => ({
                      ...prev,
                      [item.student.id]:
                        prev[item.student.id] === "presente" ? undefined : "presente",
                    }))
                  }
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor:
                      item.status === "presente" ? colors.successBg : colors.secondaryBg,
                  }}
                >
                  <Text
                    style={{
                      color: item.status === "presente" ? colors.primaryText : colors.text,
                      fontWeight: "700",
                    }}
                  >
                    Presente
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setStatusById((prev) => ({
                      ...prev,
                      [item.student.id]:
                        prev[item.student.id] === "faltou" ? undefined : "faltou",
                    }))
                  }
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 12,
                    borderRadius: 999,
                    backgroundColor:
                      item.status === "faltou" ? colors.dangerSolidBg : colors.secondaryBg,
                  }}
                >
                  <Text
                    style={{
                      color: item.status === "faltou" ? colors.primaryText : colors.text,
                      fontWeight: "700",
                    }}
                  >
                    Faltou
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    setExpandedById((prev) => ({
                      ...prev,
                      [item.student.id]: !prev[item.student.id],
                    }))
                  }
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 999,
                    backgroundColor: colors.secondaryBg,
                  }}
                >
                  <Text style={{ fontWeight: "700", color: colors.text }}>
                    {expandedById[item.student.id] ? "\u25B2" : "\u25BC"}
                  </Text>
                </Pressable>
              </View>
            </View>

            {expandedById[item.student.id] ? (
              <View style={{ marginTop: 10, gap: 8 }}>
                <Text style={{ color: colors.text }}>
                  Idade: {item.student.age} | Tel: {item.student.phone}
                </Text>
                <TextInput
                  placeholder="Observacao (opcional)"
                  value={item.note}
                  onChangeText={(text) =>
                    setNoteById((prev) => ({
                      ...prev,
                      [item.student.id]: text,
                    }))
                  }
                  placeholderTextColor={colors.placeholder}
                  style={{
                    borderWidth: 1,
                    borderColor: colors.border,
                    padding: 10,
                    borderRadius: 12,
                    backgroundColor: colors.inputBg,
                    color: colors.inputText,
                  }}
                />
              </View>
            ) : null}
          </View>
        ))}
      </ScrollView>

      <View style={{ marginTop: 8, gap: 8 }}>
        <Button label="Salvar chamada" onPress={handleSave} />
      </View>

      {historyDates.length > 0 ? (
        <View style={{ marginTop: 16 }}>
          <Button
            label={showHistory ? "Esconder historico" : "Mostrar historico"}
            variant="secondary"
            onPress={() => setShowHistory((prev) => !prev)}
          />
          {showHistory ? (
            <View style={{ marginTop: 8 }}>
              <Typography variant="subtitle">Historico por data</Typography>
              <TextInput
                placeholder="Filtrar por data (YYYY-MM-DD)"
                value={historyFilter}
                onChangeText={setHistoryFilter}
                placeholderTextColor={colors.placeholder}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 10,
                  borderRadius: 10,
                  marginTop: 8,
                  backgroundColor: colors.inputBg,
                  color: colors.inputText,
                }}
              />
              <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 8 }}>
                {filteredHistoryDates.map((value) => (
                  <Button
                    key={value}
                    label={value}
                    variant={value === date ? "primary" : "secondary"}
                    onPress={() => loadDate(value)}
                  />
                ))}
              </ScrollView>
              <Button label="Exportar CSV (data)" onPress={handleExportCsv} />
              {csvPreview ? (
                <View>
                  <Typography variant="subtitle">CSV gerado</Typography>
                  <TextInput
                    value={csvPreview}
                    multiline
                    style={{
                      borderWidth: 1,
                      borderColor: colors.border,
                      padding: 10,
                      borderRadius: 10,
                      minHeight: 120,
                      backgroundColor: colors.inputBg,
                      color: colors.inputText,
                    }}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
      ) : null}

      {showCalendar ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 12,
              width: "100%",
              maxWidth: 360,
              gap: 10,
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() - 1,
                      1
                    )
                  )
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>{"<"}</Text>
              </Pressable>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                {monthNames[calendarMonth.getMonth()]}{" "}
                {calendarMonth.getFullYear()}
              </Text>
              <Pressable
                onPress={() =>
                  setCalendarMonth(
                    new Date(
                      calendarMonth.getFullYear(),
                      calendarMonth.getMonth() + 1,
                      1
                    )
                  )
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>{">"}</Text>
              </Pressable>
            </View>

            <View style={{ flexDirection: "row" }}>
              {dayLabels.map((d) => (
                <Text
                  key={d}
                  style={{
                    width: "14.2857%",
                    textAlign: "center",
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  {d}
                </Text>
              ))}
            </View>

            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {calendarDays.map((cell, index) => {
                const selected =
                  cell.date && formatDate(cell.date) === date;
                return (
                  <Pressable
                    key={index}
                    disabled={!cell.date}
                    onPress={() => {
                      if (!cell.date) return;
                      setDate(formatDate(cell.date));
                      setShowCalendar(false);
                    }}
                    style={{
                      width: "14.2857%",
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                      borderRadius: 16,
                      backgroundColor: selected ? colors.primaryBg : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: cell.date
                          ? selected
                            ? colors.primaryText
                            : colors.text
                          : "transparent",
                        fontSize: 12,
                      }}
                    >
                      {cell.date ? cell.date.getDate() : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Pressable
              onPress={() => setShowCalendar(false)}
              style={{
                paddingVertical: 8,
                borderRadius: 10,
                backgroundColor: colors.secondaryBg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}










