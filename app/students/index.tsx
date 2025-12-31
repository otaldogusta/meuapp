import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

import {
  getClasses,
  getStudents,
  saveStudent,
  updateStudent,
  deleteStudent,
} from "../../src/db/seed";
import type { ClassGroup, Student } from "../../src/core/models";
import { Button } from "../../src/ui/Button";
import { useAppTheme } from "../../src/ui/app-theme";

export default function StudentsScreen() {
  const router = useRouter();
  const { colors } = useAppTheme();
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classId, setClassId] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [phone, setPhone] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [classList, studentList] = await Promise.all([
        getClasses(),
        getStudents(),
      ]);
      if (!alive) return;
      setClasses(classList);
      if (!classId && classList.length > 0) {
        setClassId(classList[0].id);
      }
      setStudents(studentList);
    })();
    return () => {
      alive = false;
    };
  }, [classId]);

  const reload = async () => {
    const data = await getStudents();
    setStudents(data);
  };

  const onSave = async () => {
    if (!classId || !name.trim()) return;
    const nowIso = new Date().toISOString();
    const student: Student = {
      id: editingId ?? "s_" + Date.now(),
      name: name.trim(),
      classId,
      age: Number(age) || 0,
      phone: phone.trim(),
      createdAt: editingCreatedAt ?? nowIso,
    };

    if (editingId) {
      await updateStudent(student);
    } else {
      await saveStudent(student);
    }

    setName("");
    setAge("");
    setPhone("");
    setEditingId(null);
    setEditingCreatedAt(null);
    await reload();
  };

  const onEdit = (student: Student) => {
    setEditingId(student.id);
    setEditingCreatedAt(student.createdAt);
    setName(student.name);
    setAge(String(student.age));
    setPhone(student.phone);
    setClassId(student.classId);
  };

  const onDelete = async (id: string) => {
    await deleteStudent(id);
    if (editingId === id) {
      setEditingId(null);
      setEditingCreatedAt(null);
    }
    await reload();
  };

  const getClassName = (id: string) =>
    classes.find((item) => item.id === id)?.name ?? "Turma";

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
            Alunos
          </Text>
          <Text style={{ color: colors.muted }}>Lista de chamada por turma</Text>
        </View>

        <View
          style={{
            gap: 10,
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
            Cadastrar aluno
          </Text>
          <Text style={{ color: colors.muted }}>Escolha a turma</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {classes.map((item) => {
              const active = item.id === classId;
              return (
                <Pressable
                  key={item.id}
                  onPress={() => setClassId(item.id)}
                  style={{
                    paddingVertical: 6,
                    paddingHorizontal: 10,
                    borderRadius: 10,
                    backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                  }}
                >
                  <Text style={{ color: active ? colors.primaryText : colors.text }}>
                    {item.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <TextInput
            placeholder="Nome do aluno"
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
            placeholder="Idade"
            value={age}
            onChangeText={setAge}
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
          <TextInput
            placeholder="Telefone"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
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

          <Button
            label={editingId ? "Salvar alteracoes" : "Adicionar aluno"}
            onPress={onSave}
          />
          {editingId ? (
            <Button
              label="Cancelar edicao"
              variant="secondary"
              onPress={() => {
                setEditingId(null);
                setEditingCreatedAt(null);
                setName("");
                setAge("");
                setPhone("");
              }}
            />
          ) : null}
        </View>

        <View style={{ gap: 12 }}>
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
            Lista de alunos
          </Text>
          {students.map((student) => (
            <View key={student.id} style={{ gap: 8 }}>
              <View
                style={{
                  padding: 14,
                  borderRadius: 18,
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
                <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                  {student.name + " - " + getClassName(student.classId)}
                </Text>
                <Text style={{ color: colors.muted, marginTop: 6 }}>
                  {"Idade: " + student.age + " | Telefone: " + student.phone}
                </Text>
              </View>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Button label="Editar" onPress={() => onEdit(student)} />
                <Button
                  label="Historico"
                  variant="secondary"
                  onPress={() =>
                    router.push({
                      pathname: "/students/[id]/attendance",
                      params: { id: student.id },
                    })
                  }
                />
                <Button
                  label="Excluir"
                  variant="secondary"
                  onPress={() => onDelete(student.id)}
                />
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}




