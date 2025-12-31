import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  saveTrainingPlan,
  getTrainingPlans,
  getClasses,
  updateTrainingPlan,
  deleteTrainingPlan,
  getTrainingTemplates,
  saveTrainingTemplate,
  updateTrainingTemplate,
  deleteTrainingTemplate,
  getHiddenTemplates,
  hideTrainingTemplate,
} from "../../src/db/seed";
import type {
  ClassGroup,
  TrainingPlan,
  TrainingTemplate,
  HiddenTemplate,
} from "../../src/core/models";
import { trainingTemplates } from "../../src/core/trainingTemplates";
import { Button } from "../../src/ui/Button";
import { Card } from "../../src/ui/Card";
import { notifyTrainingSaved } from "../../src/notifications";
import { useAppTheme } from "../../src/ui/app-theme";

const toLines = (value: string) =>
  value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const formatIsoDate = (value: Date) => {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, "0");
  const d = String(value.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const formatShortDate = (value?: string) => {
  if (!value) return "";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return `${day}/${month}/${year}`;
  }
  return formatDate(value);
};

const weekdays = [
  { id: 1, label: "Seg" },
  { id: 2, label: "Ter" },
  { id: 3, label: "Qua" },
  { id: 4, label: "Qui" },
  { id: 5, label: "Sex" },
  { id: 6, label: "Sab" },
  { id: 7, label: "Dom" },
];

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

const formatWeekdays = (days?: number[]) => {
  if (!days || !days.length) return "";
  const labels = days
    .map((day) => weekdays.find((item) => item.id === day)?.label)
    .filter(Boolean);
  return labels.join(", ");
};

export default function TrainingList() {
  const { colors } = useAppTheme();
  const [title, setTitle] = useState("");
  const [tagsText, setTagsText] = useState("");
  const [warmup, setWarmup] = useState("");
  const [main, setMain] = useState("");
  const [cooldown, setCooldown] = useState("");
  const [warmupTime, setWarmupTime] = useState("");
  const [mainTime, setMainTime] = useState("");
  const [cooldownTime, setCooldownTime] = useState("");
  const [items, setItems] = useState<TrainingPlan[]>([]);
  const [templateItems, setTemplateItems] = useState<TrainingTemplate[]>([]);
  const [hiddenTemplates, setHiddenTemplates] = useState<HiddenTemplate[]>([]);
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [classId, setClassId] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingCreatedAt, setEditingCreatedAt] = useState<string | null>(null);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showAllClasses, setShowAllClasses] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<TrainingPlan | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formY, setFormY] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const [scrollRequested, setScrollRequested] = useState(false);
  const [templateAgeBand, setTemplateAgeBand] = useState("");
  const [formMode, setFormMode] = useState<"plan" | "template">("plan");
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateCreatedAt, setEditingTemplateCreatedAt] = useState<string | null>(null);
  const [templateEditorSource, setTemplateEditorSource] = useState<"built" | "custom">(
    "custom"
  );
  const [templateEditorTemplateId, setTemplateEditorTemplateId] = useState<string | null>(null);
  const [renameTemplateId, setRenameTemplateId] = useState<string | null>(null);
  const [renameTemplateText, setRenameTemplateText] = useState("");
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateEditorId, setTemplateEditorId] = useState<string | null>(null);
  const [templateEditorCreatedAt, setTemplateEditorCreatedAt] = useState<string | null>(null);
  const [templateTitle, setTemplateTitle] = useState("");
  const [templateAge, setTemplateAge] = useState("");
  const [templateTags, setTemplateTags] = useState("");
  const [templateWarmup, setTemplateWarmup] = useState("");
  const [templateMain, setTemplateMain] = useState("");
  const [templateCooldown, setTemplateCooldown] = useState("");
  const [templateWarmupTime, setTemplateWarmupTime] = useState("");
  const [templateMainTime, setTemplateMainTime] = useState("");
  const [templateCooldownTime, setTemplateCooldownTime] = useState("");
  const [applyUnit, setApplyUnit] = useState("");
  const [applyClassId, setApplyClassId] = useState("");
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyPlan, setApplyPlan] = useState<TrainingPlan | null>(null);
  const [applyDays, setApplyDays] = useState<number[]>([]);
  const [applyDate, setApplyDate] = useState("");
  const [showApplyCalendar, setShowApplyCalendar] = useState(false);
  const [applyCalendarMonth, setApplyCalendarMonth] = useState(new Date());

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === classId),
    [classes, classId]
  );

  const unitLabel = (value?: string) =>
    value && value.trim() ? value.trim() : "Sem unidade";

  const unitOptions = useMemo(() => {
    const units = new Set<string>();
    classes.forEach((item) => {
      units.add(unitLabel(item.unit));
    });
    return Array.from(units).sort((a, b) => a.localeCompare(b));
  }, [classes]);

  const classOptionsForUnit = useMemo(() => {
    if (!applyUnit) return classes;
    return classes.filter((item) => unitLabel(item.unit) === applyUnit);
  }, [classes, applyUnit]);

  useEffect(() => {
    if (!applyPlan) return;
    const currentClass = classes.find((item) => item.id === applyPlan.classId);
    const nextUnit = unitLabel(currentClass?.unit);
    setApplyUnit(nextUnit);
    setApplyClassId(applyPlan.classId);
    setApplyDays(applyPlan.applyDays ?? []);
    setApplyDate(applyPlan.applyDate ?? "");
    if (applyPlan.applyDate) {
      const parsed = new Date(applyPlan.applyDate);
      setApplyCalendarMonth(
        Number.isNaN(parsed.getTime()) ? new Date() : parsed
      );
    } else {
      setApplyCalendarMonth(new Date());
    }
  }, [applyPlan, classes]);

  const applyCalendarDays = useMemo(() => {
    const year = applyCalendarMonth.getFullYear();
    const month = applyCalendarMonth.getMonth();
    return getCalendarDays(year, month);
  }, [applyCalendarMonth]);

  useEffect(() => {
    if (!applyClassId) return;
    const stillValid = classOptionsForUnit.some(
      (item) => item.id === applyClassId
    );
    if (!stillValid) {
      setApplyClassId(classOptionsForUnit[0]?.id ?? "");
    }
  }, [classOptionsForUnit, applyClassId]);

  const ageBands = useMemo(() => {
    const values = new Set<string>();
    classes.forEach((item) => {
      if (item.ageBand) values.add(item.ageBand);
    });
    trainingTemplates.forEach((template) => {
      template.ageBands.forEach((band) => values.add(band));
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b));
  }, [classes]);

  const templates = useMemo(() => {
    const combined = [
      ...trainingTemplates.map((template) => ({
        id: "built_" + template.id,
        title: template.title,
        tags: template.tags,
        warmup: template.warmup,
        main: template.main,
        cooldown: template.cooldown,
        warmupTime: template.warmupTime,
        mainTime: template.mainTime,
        cooldownTime: template.cooldownTime,
        ageBands: template.ageBands,
        source: "built" as const,
      })),
      ...templateItems.map((template) => ({
        id: template.id,
        title: template.title,
        tags: template.tags,
        warmup: template.warmup,
        main: template.main,
        cooldown: template.cooldown,
        warmupTime: template.warmupTime,
        mainTime: template.mainTime,
        cooldownTime: template.cooldownTime,
        ageBands: [template.ageBand],
        createdAt: template.createdAt,
        source: "custom" as const,
      })),
    ];
    const hiddenSet = new Set(
      hiddenTemplates.map((item) => item.templateId)
    );
    const visible = combined.filter(
      (template) => !hiddenSet.has(template.id)
    );
    if (!templateAgeBand) return visible;
    return visible.filter((template) =>
      template.ageBands.includes(templateAgeBand)
    );
  }, [templateAgeBand, templateItems, hiddenTemplates]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [classList, plans, templatesDb, hidden] = await Promise.all([
        getClasses(),
        getTrainingPlans(),
        getTrainingTemplates(),
        getHiddenTemplates(),
      ]);
      if (!alive) return;
      setClasses(classList);
      if (!classId && classList.length > 0) {
        setClassId(classList[0].id);
      }
      if (!templateAgeBand && classList.length > 0) {
        setTemplateAgeBand(classList[0].ageBand);
      }
      setTemplateItems(templatesDb);
      setHiddenTemplates(hidden);
      setItems(plans);
    })();
    return () => {
      alive = false;
    };
  }, [classId]);

  const tagCounts = useMemo(() => {
    const source = items;
    const map: Record<string, number> = {};
    source.forEach((item) => {
      (item.tags ?? []).forEach((tag) => {
        const key = tag.toLowerCase();
        map[key] = (map[key] ?? 0) + 1;
      });
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items;
  }, [items]);

  const currentTags = useMemo(() => {
    return tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .map((t) => t.toLowerCase());
  }, [tagsText]);

  const suggestions = useMemo(() => {
    return tagCounts
      .map(([tag]) => tag)
      .filter((tag) => !currentTags.includes(tag))
      .slice(0, 6);
  }, [tagCounts, currentTags]);

  const reload = async () => {
    const data = await getTrainingPlans();
    setItems(data);
  };

  const savePlan = async () => {
    if (!classId) return;
    const nowIso = new Date().toISOString();
    const plan: TrainingPlan = {
      id: editingId ?? "t_" + Date.now(),
      classId,
      title: title.trim() || "Treino sem titulo",
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      warmup: toLines(warmup),
      main: toLines(main),
      cooldown: toLines(cooldown),
      warmupTime: warmupTime.trim(),
      mainTime: mainTime.trim(),
      cooldownTime: cooldownTime.trim(),
      applyDays: [],
      applyDate: "",
      createdAt: editingCreatedAt ?? nowIso,
    };

    if (editingId) {
      await updateTrainingPlan(plan);
    } else {
      await saveTrainingPlan(plan);
    }
    Alert.alert("Treino salvo", "Treino salvo com sucesso.");
    void notifyTrainingSaved();
    setTitle("");
    setTagsText("");
    setWarmup("");
    setMain("");
    setCooldown("");
    setWarmupTime("");
    setMainTime("");
    setCooldownTime("");
    setEditingId(null);
    setEditingCreatedAt(null);
    setFormMode("plan");
    setShowForm(false);
    await reload();
  };

  const saveTemplate = async () => {
    const band =
      selectedClass?.ageBand ||
      templateAgeBand ||
      (classes[0] ? classes[0].ageBand : "");
    if (!band) {
      Alert.alert("Selecione uma turma", "Defina a faixa etaria primeiro.");
      return;
    }
    const nowIso = new Date().toISOString();
    const template: TrainingTemplate = {
      id: editingTemplateId ?? "tpl_" + Date.now(),
      title: title.trim() || "Modelo sem titulo",
      ageBand: band,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      warmup: toLines(warmup),
      main: toLines(main),
      cooldown: toLines(cooldown),
      warmupTime: warmupTime.trim(),
      mainTime: mainTime.trim(),
      cooldownTime: cooldownTime.trim(),
      createdAt: editingTemplateCreatedAt ?? nowIso,
    };
    if (editingTemplateId) {
      await updateTrainingTemplate(template);
    } else {
      await saveTrainingTemplate(template);
    }
    const templatesDb = await getTrainingTemplates();
    setTemplateItems(templatesDb);
    setEditingTemplateId(null);
    setEditingTemplateCreatedAt(null);
    setFormMode("plan");
    setShowForm(false);
    Alert.alert("Modelo salvo", "Agora ele aparece em Modelos prontos.");
  };

  const onEdit = (plan: TrainingPlan) => {
    setEditingId(plan.id);
    setEditingCreatedAt(plan.createdAt);
    setTitle(plan.title);
    setTagsText(plan.tags?.join(", ") ?? "");
    setWarmup(plan.warmup.join("\n"));
    setMain(plan.main.join("\n"));
    setCooldown(plan.cooldown.join("\n"));
    setWarmupTime(plan.warmupTime);
    setMainTime(plan.mainTime);
    setCooldownTime(plan.cooldownTime);
    setClassId(plan.classId);
    setFormMode("plan");
    setShowForm(true);
    setScrollRequested(true);
  };

  const onDelete = async (id: string) => {
    Alert.alert(
      "Excluir treino",
      "Essa acao nao pode ser desfeita. Deseja excluir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            await deleteTrainingPlan(id);
            if (editingId === id) {
              setEditingId(null);
              setEditingCreatedAt(null);
            }
            await reload();
          },
        },
      ]
    );
  };

  const getClassName = (id: string) =>
    classes.find((item) => item.id === id)?.name ?? "Turma";

  const applyTemplate = (template: {
    id: string;
    title: string;
    tags: string[];
    warmup: string[];
    main: string[];
    cooldown: string[];
    warmupTime: string;
    mainTime: string;
    cooldownTime: string;
    ageBands: string[];
    source?: "built" | "custom";
    createdAt?: string;
  }) => {
    setEditingId(null);
    setEditingCreatedAt(null);
    setTitle(template.title);
    setTagsText(template.tags.join(", "));
    setWarmup(template.warmup.join("\n"));
    setMain(template.main.join("\n"));
    setCooldown(template.cooldown.join("\n"));
    setWarmupTime(template.warmupTime);
    setMainTime(template.mainTime);
    setCooldownTime(template.cooldownTime);
    setShowForm(true);
    setScrollRequested(true);
  };

  const useTemplateAsPlan = (template: {
    id: string;
    title: string;
    tags: string[];
    warmup: string[];
    main: string[];
    cooldown: string[];
    warmupTime: string;
    mainTime: string;
    cooldownTime: string;
    ageBands: string[];
    source?: "built" | "custom";
    createdAt?: string;
  }) => {
    setFormMode("plan");
    applyTemplate(template);
  };

  const openTemplateForEdit = (template: {
    id: string;
    title: string;
    tags: string[];
    warmup: string[];
    main: string[];
    cooldown: string[];
    warmupTime: string;
    mainTime: string;
    cooldownTime: string;
    ageBands: string[];
    source?: "built" | "custom";
    createdAt?: string;
  }) => {
    setEditingTemplateId(template.source === "custom" ? template.id : null);
    setEditingTemplateCreatedAt(
      template.source === "custom" ? template.createdAt ?? null : null
    );
    setFormMode("template");
    if (template.ageBands.length) {
      setTemplateAgeBand(template.ageBands[0]);
    }
    applyTemplate(template);
  };

  const deleteTemplateItem = async (
    id: string,
    source: "built" | "custom"
  ) => {
    Alert.alert(
      "Excluir modelo",
      "Essa acao nao pode ser desfeita. Deseja excluir?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Excluir",
          style: "destructive",
          onPress: async () => {
            if (source === "custom") {
              await deleteTrainingTemplate(id);
              const templatesDb = await getTrainingTemplates();
              setTemplateItems(templatesDb);
            } else {
              await hideTrainingTemplate(id);
              const hidden = await getHiddenTemplates();
              setHiddenTemplates(hidden);
            }
          },
        },
      ]
    );
  };

  const duplicateTemplateFromEditor = async () => {
    const band = templateAge.trim() || templateAgeBand;
    if (!band) {
      Alert.alert("Defina a faixa etaria", "Informe a faixa etaria do modelo.");
      return;
    }
    const copy: TrainingTemplate = {
      id: "tpl_" + Date.now(),
      title: (templateTitle.trim() || "Modelo sem titulo") + " (copia)",
      ageBand: band,
      tags: templateTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      warmup: toLines(templateWarmup),
      main: toLines(templateMain),
      cooldown: toLines(templateCooldown),
      warmupTime: templateWarmupTime.trim(),
      mainTime: templateMainTime.trim(),
      cooldownTime: templateCooldownTime.trim(),
      createdAt: new Date().toISOString(),
    };
    await saveTrainingTemplate(copy);
    const templatesDb = await getTrainingTemplates();
    setTemplateItems(templatesDb);
    Alert.alert("Modelo duplicado", "Aparece em Modelos prontos.");
  };

  const openTemplateEditor = (template: {
    id: string;
    title: string;
    tags: string[];
    warmup: string[];
    main: string[];
    cooldown: string[];
    warmupTime: string;
    mainTime: string;
    cooldownTime: string;
    ageBands: string[];
    source?: "built" | "custom";
    createdAt?: string;
  }) => {
    const isCustom = template.source === "custom";
    setTemplateEditorId(isCustom ? template.id : null);
    setTemplateEditorCreatedAt(isCustom ? template.createdAt ?? null : null);
    setTemplateEditorSource(isCustom ? "custom" : "built");
    setTemplateEditorTemplateId(template.id);
    setTemplateTitle(template.title);
    setTemplateAge(template.ageBands[0] || templateAgeBand);
    setTemplateTags(template.tags.join(", "));
    setTemplateWarmup(template.warmup.join("\n"));
    setTemplateMain(template.main.join("\n"));
    setTemplateCooldown(template.cooldown.join("\n"));
    setTemplateWarmupTime(template.warmupTime);
    setTemplateMainTime(template.mainTime);
    setTemplateCooldownTime(template.cooldownTime);
    setShowTemplateEditor(true);
  };

  const saveTemplateEditor = async () => {
    const ageBand = templateAge.trim() || templateAgeBand;
    if (!ageBand) {
      Alert.alert("Defina a faixa etaria", "Informe a faixa etaria do modelo.");
      return;
    }
    const nowIso = new Date().toISOString();
    const template: TrainingTemplate = {
      id: templateEditorId ?? "tpl_" + Date.now(),
      title: templateTitle.trim() || "Modelo sem titulo",
      ageBand,
      tags: templateTags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      warmup: toLines(templateWarmup),
      main: toLines(templateMain),
      cooldown: toLines(templateCooldown),
      warmupTime: templateWarmupTime.trim(),
      mainTime: templateMainTime.trim(),
      cooldownTime: templateCooldownTime.trim(),
      createdAt: templateEditorCreatedAt ?? nowIso,
    };
    if (templateEditorId) {
      await updateTrainingTemplate(template);
    } else {
      await saveTrainingTemplate(template);
    }
    const templatesDb = await getTrainingTemplates();
    setTemplateItems(templatesDb);
    setShowTemplateEditor(false);
    setTemplateEditorId(null);
    setTemplateEditorCreatedAt(null);
    setTemplateEditorTemplateId(null);
    setTemplateEditorSource("custom");
  };

  const buildShareText = (plan: TrainingPlan) => {
    const lines = [
      plan.title,
      "Turma: " + getClassName(plan.classId),
      "",
      "Aquecimento " + (plan.warmupTime ? "(" + plan.warmupTime + ")" : ""),
      plan.warmup.length ? "- " + plan.warmup.join("\n- ") : "- Sem itens",
      "",
      "Parte principal " + (plan.mainTime ? "(" + plan.mainTime + ")" : ""),
      plan.main.length ? "- " + plan.main.join("\n- ") : "- Sem itens",
      "",
      "Volta a calma " + (plan.cooldownTime ? "(" + plan.cooldownTime + ")" : ""),
      plan.cooldown.length ? "- " + plan.cooldown.join("\n- ") : "- Sem itens",
    ];
    if (plan.tags?.length) {
      lines.push("");
      lines.push("Tags: " + plan.tags.join(", "));
    }
    return lines.join("\n");
  };

  const shareTraining = async (plan: TrainingPlan) => {
    const message = buildShareText(plan);
    await Share.share({ message });
  };

  const saveCurrentAsTemplate = async () => {
    const band =
      selectedClass?.ageBand ||
      templateAgeBand ||
      (classes[0] ? classes[0].ageBand : "");
    if (!band) {
      Alert.alert("Selecione uma turma", "Defina a faixa etaria primeiro.");
      return;
    }
    const nowIso = new Date().toISOString();
    const template: TrainingTemplate = {
      id: "tpl_" + Date.now(),
      title: title.trim() || "Modelo sem titulo",
      ageBand: band,
      tags: tagsText
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      warmup: toLines(warmup),
      main: toLines(main),
      cooldown: toLines(cooldown),
      warmupTime: warmupTime.trim(),
      mainTime: mainTime.trim(),
      cooldownTime: cooldownTime.trim(),
      createdAt: nowIso,
    };
    await saveTrainingTemplate(template);
    const templatesDb = await getTrainingTemplates();
    setTemplateItems(templatesDb);
    Alert.alert("Modelo salvo", "Agora ele aparece em Modelos prontos.");
  };

  const savePlanAsTemplate = async (plan: TrainingPlan) => {
    const band =
      classes.find((item) => item.id === plan.classId)?.ageBand ||
      templateAgeBand ||
      (classes[0] ? classes[0].ageBand : "");
    if (!band) {
      Alert.alert("Selecione uma turma", "Defina a faixa etaria primeiro.");
      return;
    }
    const template: TrainingTemplate = {
      id: "tpl_" + Date.now(),
      title: plan.title,
      ageBand: band,
      tags: plan.tags ?? [],
      warmup: plan.warmup ?? [],
      main: plan.main ?? [],
      cooldown: plan.cooldown ?? [],
      warmupTime: plan.warmupTime ?? "",
      mainTime: plan.mainTime ?? "",
      cooldownTime: plan.cooldownTime ?? "",
      createdAt: new Date().toISOString(),
    };
    await saveTrainingTemplate(template);
    const templatesDb = await getTrainingTemplates();
    setTemplateItems(templatesDb);
    Alert.alert("Modelo salvo", "Agora ele aparece em Modelos prontos.");
  };

  const isFormDirty =
    title.trim() ||
    tagsText.trim() ||
    warmup.trim() ||
    main.trim() ||
    cooldown.trim() ||
    warmupTime.trim() ||
    mainTime.trim() ||
    cooldownTime.trim() ||
    editingId;

  const hasFormContent = Boolean(
    title.trim() ||
      tagsText.trim() ||
      warmup.trim() ||
      main.trim() ||
      cooldown.trim() ||
      warmupTime.trim() ||
      mainTime.trim() ||
      cooldownTime.trim()
  );

  const confirmCloseForm = () => {
    if (!isFormDirty) {
      setShowForm(false);
      return;
    }
    Alert.alert(
      "Descartar treino?",
      "Voce tem alteracoes nao salvas.",
      [
        { text: "Continuar editando", style: "cancel" },
        {
          text: "Descartar",
          style: "destructive",
          onPress: () => {
            setShowForm(false);
            setEditingId(null);
            setEditingCreatedAt(null);
            setEditingTemplateId(null);
            setEditingTemplateCreatedAt(null);
            setFormMode("plan");
            setTitle("");
            setTagsText("");
            setWarmup("");
            setMain("");
            setCooldown("");
            setWarmupTime("");
            setMainTime("");
            setCooldownTime("");
          },
        },
      ]
    );
  };

  const scrollToForm = () => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(formY - 8, 0),
        animated: true,
      });
    }, 50);
  };

  useEffect(() => {
    if (!showForm || !scrollRequested) return;
    scrollToForm();
    setScrollRequested(false);
  }, [formY, showForm, scrollRequested]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ paddingBottom: 24, gap: 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ gap: 6 }}>
          <Text style={{ fontSize: 26, fontWeight: "700", color: colors.text }}>
            Treinos
          </Text>
          <Text style={{ color: colors.muted }}>
            Aquecimento, parte principal e volta a calma
          </Text>
        </View>

        <View
          style={{
            gap: 10,
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
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
            Modelos prontos
          </Text>
          <Text style={{ color: colors.muted }}>Escolha a faixa etaria</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {ageBands.map((band) => {
                const active = band === templateAgeBand;
                return (
                  <Pressable
                    key={band}
                    onPress={() => setTemplateAgeBand(band)}
                    style={{
                      paddingVertical: 4,
                      paddingHorizontal: 8,
                      borderRadius: 8,
                      backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                    }}
                  >
                    <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 12 }}>
                      {band}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
          <Pressable
            onPress={() => {
              if (!templates.length) return;
              setShowTemplates((prev) => !prev);
            }}
            style={{
              paddingVertical: 8,
              paddingHorizontal: 12,
              borderRadius: 10,
              backgroundColor: templates.length ? colors.primaryBg : colors.secondaryBg,
            }}
          >
            <Text
              style={{
                color: templates.length ? colors.primaryText : colors.text,
                fontWeight: "700",
                fontSize: 12,
              }}
            >
              {showTemplates ? "Esconder modelos" : "Abrir modelos"} (
              {templates.length})
            </Text>
          </Pressable>
            {showTemplates ? (
              <View style={{ gap: 8 }}>
                {templates.length ? (
                  <>
                    <Text style={{ color: colors.muted }}>Para a faixa selecionada</Text>
                    {templates.map((template) => (
                      <View key={template.id} style={{ gap: 6 }}>
                        <View
                          style={{
                            padding: 12,
                            borderRadius: 14,
                            backgroundColor: colors.card,
                            borderWidth: 1,
                            borderColor: colors.border,
                          }}
                        >
                          <Pressable onPress={() => openTemplateEditor(template)}>
                            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.text }}>
                              {template.title}
                            </Text>
                            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 12 }}>
                              {"Tags: " + template.tags.join(", ")}
                            </Text>
                            <Text style={{ color: colors.muted, marginTop: 2, fontSize: 10 }}>
                              {template.source === "built"
                                ? "Fonte: Instituto Compartilhar e CMV (Volei Veilig)"
                                : "Fonte: Modelo criado"}
                            </Text>
                          </Pressable>
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                            <Pressable
                              onPress={() => useTemplateAsPlan(template)}
                              style={{
                                paddingVertical: 4,
                                paddingHorizontal: 10,
                                borderRadius: 999,
                                backgroundColor: "#2563eb",
                              }}
                            >
                              <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 12 }}>
                                Usar
                              </Text>
                            </Pressable>
                            {template.source === "custom" ? (
                              <Pressable
                                onPress={() => {
                                  setRenameTemplateId(template.id);
                                  setRenameTemplateText(template.title);
                                }}
                                style={{
                                  paddingVertical: 4,
                                  paddingHorizontal: 10,
                                  borderRadius: 999,
                                  backgroundColor: colors.secondaryBg,
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                }}
                              >
                                <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
                                  Renomear
                                </Text>
                              </Pressable>
                            ) : null}
                          </View>
                          {renameTemplateId === template.id ? (
                            <View style={{ gap: 8, marginTop: 10 }}>
                              <TextInput
                                placeholder="Novo nome"
                                value={renameTemplateText}
                                onChangeText={setRenameTemplateText}
                                style={{
                                  borderWidth: 1,
                                  borderColor: colors.border,
                                  padding: 8,
                                  borderRadius: 10,
                                  backgroundColor: colors.inputBg,
                                }}
                              />
                              <View style={{ flexDirection: "row", gap: 8 }}>
                                <Pressable
                                  onPress={async () => {
                                    if (!renameTemplateText.trim()) return;
                                    await updateTrainingTemplate({
                                      id: template.id,
                                      title: renameTemplateText.trim(),
                                      ageBand: template.ageBands[0],
                                      tags: template.tags ?? [],
                                      warmup: template.warmup ?? [],
                                      main: template.main ?? [],
                                      cooldown: template.cooldown ?? [],
                                      warmupTime: template.warmupTime ?? "",
                                      mainTime: template.mainTime ?? "",
                                      cooldownTime: template.cooldownTime ?? "",
                                      createdAt: template.createdAt ?? new Date().toISOString(),
                                    });
                                    const templatesDb = await getTrainingTemplates();
                                    setTemplateItems(templatesDb);
                                    setRenameTemplateId(null);
                                    setRenameTemplateText("");
                                  }}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: colors.primaryBg,
                                    alignItems: "center",
                                  }}
                                >
                                  <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 12 }}>
                                    Salvar nome
                                  </Text>
                                </Pressable>
                                <Pressable
                                  onPress={() => {
                                    setRenameTemplateId(null);
                                    setRenameTemplateText("");
                                  }}
                                  style={{
                                    flex: 1,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: colors.secondaryBg,
                                    borderWidth: 1,
                                    borderColor: colors.border,
                                    alignItems: "center",
                                  }}
                                >
                                  <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
                                    Cancelar
                                  </Text>
                                </Pressable>
                              </View>
                            </View>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </>
                ) : (
                <Text style={{ color: colors.muted }}>
                  Nenhum modelo para essa faixa etaria.
                </Text>
              )}
            </View>
          ) : null}
        </View>

        <View
          onLayout={(event) => setFormY(event.nativeEvent.layout.y)}
          style={{
            gap: 10,
            padding: 14,
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
          <Pressable
            onPress={() =>
              showForm ? confirmCloseForm() : setShowForm(true)
            }
            style={{
              paddingVertical: 12,
              paddingHorizontal: 14,
              borderRadius: 14,
              backgroundColor: showForm ? colors.secondaryBg : colors.primaryBg,
              borderWidth: showForm ? 1 : 0,
              borderColor: colors.border,
            }}
          >
            <View style={{ gap: 4 }}>
              <Text
                style={{
                  color: showForm ? colors.text : colors.primaryText,
                  fontWeight: "700",
                  fontSize: 16,
                }}
              >
                {showForm ? "Fechar treino" : "+ Novo treino"}
              </Text>
              <Text style={{ color: showForm ? colors.muted : colors.primaryText, fontSize: 12 }}>
                {showForm ? "Ocultar formulario" : "Criar e salvar treino"}
              </Text>
            </View>
          </Pressable>
          {showForm ? (
            <>
          <Text style={{ color: colors.muted }}>Selecione a turma</Text>
          {showAllClasses ? (
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
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {classes.slice(0, 5).map((item) => {
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
            </ScrollView>
          )}
          {classes.length > 5 ? (
            <Pressable
              onPress={() => setShowAllClasses((prev) => !prev)}
              style={{ alignSelf: "flex-start", paddingVertical: 4 }}
            >
              <Text style={{ color: "#2563eb", fontWeight: "700" }}>
                {showAllClasses ? "Ver menos turmas" : "Ver mais turmas"}
              </Text>
            </Pressable>
          ) : null}

          <TextInput
            placeholder="Titulo do treino"
            value={title}
            onChangeText={setTitle}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
              backgroundColor: colors.inputBg,
              color: colors.inputText,
            }}
          />
          <TextInput
            placeholder="Tags (separe por virgula)"
            value={tagsText}
            onChangeText={setTagsText}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
              backgroundColor: colors.inputBg,
              color: colors.inputText,
            }}
          />
          {suggestions.length > 0 ? (
            <>
              <Text style={{ color: colors.muted, marginTop: 2 }}>Sugestoes</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {suggestions.map((tag) => (
                    <Pressable
                      key={tag}
                      onPress={() =>
                        setTagsText((prev) =>
                          prev.trim()
                            ? prev.trim().replace(/\s*,\s*$/, "") + ", " + tag
                            : tag
                        )
                      }
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 10,
                        borderRadius: 999,
                        backgroundColor: colors.secondaryBg,
                      }}
                    >
                      <Text style={{ color: colors.text }}>{tag}</Text>
                    </Pressable>
                  ))}
                </View>
              </ScrollView>
            </>
          ) : null}
          <TextInput
            placeholder="Aquecimento (1 por linha)"
            value={warmup}
            onChangeText={setWarmup}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
              minHeight: 60,
            }}
          />
          <TextInput
            placeholder="Tempo do aquecimento (ex: 10')"
            value={warmupTime}
            onChangeText={setWarmupTime}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
            }}
          />
          <TextInput
            placeholder="Parte principal (1 por linha)"
            value={main}
            onChangeText={setMain}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
              minHeight: 80,
            }}
          />
          <TextInput
            placeholder="Tempo da parte principal (ex: 40')"
            value={mainTime}
            onChangeText={setMainTime}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
            }}
          />
          <TextInput
            placeholder="Volta a calma (1 por linha)"
            value={cooldown}
            onChangeText={setCooldown}
            multiline
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
              minHeight: 60,
            }}
          />
          <TextInput
            placeholder="Tempo da volta a calma (ex: 5')"
            value={cooldownTime}
            onChangeText={setCooldownTime}
            style={{
              borderWidth: 1,
              borderColor: colors.border,
              padding: 8,
              borderRadius: 10,
            }}
          />
          {formMode !== "template" ? (
            <Pressable
              onPress={saveCurrentAsTemplate}
              style={{
                paddingVertical: 8,
                borderRadius: 12,
                backgroundColor: colors.secondaryBg,
                borderWidth: 1,
                borderColor: colors.border,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.text, fontWeight: "700" }}>
                Salvar como modelo
              </Text>
            </Pressable>
          ) : null}
          <View style={{ height: 64 }} />
          {editingId ? (
            <Button
              label="Cancelar edicao"
              variant="secondary"
              onPress={() => {
                setEditingId(null);
                setEditingCreatedAt(null);
                setEditingTemplateId(null);
                setEditingTemplateCreatedAt(null);
                setFormMode("plan");
                setTitle("");
                setWarmup("");
                setMain("");
                setCooldown("");
                setWarmupTime("");
                setMainTime("");
                setCooldownTime("");
                setShowForm(false);
              }}
            />
          ) : null}
            </>
          ) : null}
        </View>

        <View
          style={{
            gap: 10,
            padding: 14,
            borderRadius: 18,
            backgroundColor: colors.card,
            borderWidth: 1,
            borderColor: colors.border,
            shadowColor: "#000",
            shadowOpacity: 0.05,
            shadowRadius: 10,
            shadowOffset: { width: 0, height: 5 },
            elevation: 2,
          }}
        >
          <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
            Treinos salvos
          </Text>

          {filteredItems
            .slice()
            .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            .map((item) => (
              <View
                key={item.id}
                style={{
                  gap: 8,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                }}
              >
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>
                    {item.title}
                  </Text>
                  <Text style={{ color: colors.muted }}>
                    {getClassName(item.classId)}
                  </Text>
                  <Text style={{ color: colors.muted, fontSize: 12 }}>
                    Criado em {formatDate(item.createdAt)}
                  </Text>
                  {item.applyDays?.length || item.applyDate ? (
                    <Text style={{ color: colors.muted, fontSize: 12 }}>
                      Aplicado:{" "}
                  {item.applyDays?.length
                        ? formatWeekdays(item.applyDays)
                        : ""}
                  {item.applyDays?.length && item.applyDate ? " • " : ""}
                  {item.applyDate ? formatShortDate(item.applyDate) : ""}
                </Text>
              ) : null}
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <Pressable
                    onPress={() => setSelectedPlan(item)}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: colors.secondaryBg,
                      borderWidth: 1,
                      borderColor: colors.border,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>
                      Ver planejamento
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setApplyPlan(item);
                      setShowApplyModal(true);
                    }}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      backgroundColor: colors.primaryBg,
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: colors.primaryText, fontWeight: "700", fontSize: 12 }}>
                      Aplicar treino
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
      {showForm && hasFormContent ? (
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
          <Pressable
            onPress={formMode === "template" ? saveTemplate : savePlan}
            style={{ width: "100%" }}
          >
            <Text
              style={{
                color: colors.primaryText,
                fontWeight: "700",
                textAlign: "center",
                fontSize: 16,
              }}
            >
              {formMode === "template"
                ? "Salvar modelo"
                : editingId
                  ? "Salvar alteracoes"
                  : "Salvar treino"}
            </Text>
          </Pressable>
        </View>
      ) : null}
      <Modal
        visible={showTemplateEditor}
        animationType="slide"
        transparent
        onRequestClose={() => setShowTemplateEditor(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "90%",
              backgroundColor: colors.card,
              padding: 12,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                Editar modelo
              </Text>
              <Pressable
                onPress={() => setShowTemplateEditor(false)}
                style={{
                  height: 32,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: colors.text }}
                >
                  Fechar
                </Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              <TextInput
                placeholder="Titulo do modelo"
                value={templateTitle}
                onChangeText={setTemplateTitle}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <TextInput
                placeholder="Faixa etaria (ex: 10-12)"
                value={templateAge}
                onChangeText={setTemplateAge}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <TextInput
                placeholder="Tags (separe por virgula)"
                value={templateTags}
                onChangeText={setTemplateTags}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <TextInput
                placeholder="Aquecimento (1 por linha)"
                value={templateWarmup}
                onChangeText={setTemplateWarmup}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                  minHeight: 60,
                }}
              />
              <TextInput
                placeholder="Tempo do aquecimento (ex: 10')"
                value={templateWarmupTime}
                onChangeText={setTemplateWarmupTime}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <TextInput
                placeholder="Parte principal (1 por linha)"
                value={templateMain}
                onChangeText={setTemplateMain}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                  minHeight: 80,
                }}
              />
              <TextInput
                placeholder="Tempo da parte principal (ex: 40')"
                value={templateMainTime}
                onChangeText={setTemplateMainTime}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <TextInput
                placeholder="Volta a calma (1 por linha)"
                value={templateCooldown}
                onChangeText={setTemplateCooldown}
                multiline
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                  minHeight: 60,
                }}
              />
              <TextInput
                placeholder="Tempo da volta a calma (ex: 5')"
                value={templateCooldownTime}
                onChangeText={setTemplateCooldownTime}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 8,
                  borderRadius: 10,
                }}
              />
              <Pressable
                onPress={saveTemplateEditor}
                style={{
                  paddingVertical: 10,
                  borderRadius: 14,
                  backgroundColor: colors.primaryBg,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.primaryText, fontWeight: "700" }}>
                  Salvar modelo
                </Text>
              </Pressable>
              <View style={{ flexDirection: "row", gap: 8 }}>
                <Pressable
                  onPress={duplicateTemplateFromEditor}
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
                    Duplicar modelo
                  </Text>
                </Pressable>
                <Pressable
                  onPress={async () => {
                    if (!templateEditorTemplateId) return;
                    await deleteTemplateItem(
                      templateEditorTemplateId,
                      templateEditorSource
                    );
                    setShowTemplateEditor(false);
                    setTemplateEditorTemplateId(null);
                    setTemplateEditorSource("custom");
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    backgroundColor: "#fee2e2",
                    borderWidth: 1,
                    borderColor: "#fecaca",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ color: "#991b1b", fontWeight: "700" }}>
                    Excluir modelo
                  </Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={Boolean(selectedPlan)}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setSelectedPlan(null);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "90%",
              backgroundColor: colors.card,
              padding: 12,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <View style={{ gap: 4, paddingRight: 12 }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                  {selectedPlan?.title}
                </Text>
                <Text style={{ color: colors.muted }}>
                  {selectedPlan ? getClassName(selectedPlan.classId) : ""}
                </Text>
              </View>
              <Pressable
                onPress={() => {
                  setSelectedPlan(null);
                }}
                style={{
                  height: 32,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: colors.text }}
                >
                  Fechar
                </Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8, paddingVertical: 10 }}>
              <View
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  Aquecimento{" "}
                  {selectedPlan?.warmupTime ? "(" + selectedPlan.warmupTime + ")" : ""}
                </Text>
                <Text style={{ color: colors.text }}>
                  {selectedPlan?.warmup.length
                    ? selectedPlan.warmup.join(" - ")
                    : "Sem itens"}
                </Text>
              </View>
              <View
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.secondaryBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  Parte principal{" "}
                  {selectedPlan?.mainTime ? "(" + selectedPlan.mainTime + ")" : ""}
                </Text>
                <Text style={{ color: colors.text }}>
                  {selectedPlan?.main.length
                    ? selectedPlan.main.join(" - ")
                    : "Sem itens"}
                </Text>
              </View>
              <View
                style={{
                  padding: 10,
                  borderRadius: 12,
                  backgroundColor: colors.inputBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  gap: 6,
                }}
              >
                <Text style={{ fontWeight: "700", color: colors.text }}>
                  Volta a calma{" "}
                  {selectedPlan?.cooldownTime
                    ? "(" + selectedPlan.cooldownTime + ")"
                    : ""}
                </Text>
                <Text style={{ color: colors.text }}>
                  {selectedPlan?.cooldown.length
                    ? selectedPlan.cooldown.join(" - ")
                    : "Sem itens"}
                </Text>
              </View>
              {selectedPlan?.tags?.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {selectedPlan.tags.map((tag) => (
                    <View
                      key={tag}
                      style={{
                        paddingVertical: 3,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: colors.secondaryBg,
                      }}
                    >
                      <Text style={{ color: colors.text, fontSize: 12 }}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showApplyModal}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowApplyModal(false);
          setApplyPlan(null);
          setShowApplyCalendar(false);
        }}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              maxHeight: "70%",
              backgroundColor: colors.card,
              padding: 12,
              borderTopLeftRadius: 18,
              borderTopRightRadius: 18,
              gap: 10,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: colors.text }}>
                Aplicar treino
              </Text>
              <Pressable
                onPress={() => {
                  setShowApplyModal(false);
                  setApplyPlan(null);
                  setShowApplyCalendar(false);
                }}
                style={{
                  height: 32,
                  paddingHorizontal: 12,
                  borderRadius: 16,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text
                  style={{ fontSize: 12, fontWeight: "700", color: colors.text }}
                >
                  Fechar
                </Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Unidade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {unitOptions.map((unit) => {
                    const active = applyUnit === unit;
                    return (
                      <Pressable
                        key={unit}
                        onPress={() => setApplyUnit(unit)}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 999,
                          backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                        }}
                      >
                        <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 12 }}>
                          {unit}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Turma</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {classOptionsForUnit.map((item) => {
                    const active = applyClassId === item.id;
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => setApplyClassId(item.id)}
                        style={{
                          paddingVertical: 4,
                          paddingHorizontal: 8,
                          borderRadius: 999,
                          backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                        }}
                      >
                        <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 12 }}>
                          {item.name}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Dias da semana</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {weekdays.map((day) => {
                  const active = applyDays.includes(day.id);
                  return (
                    <Pressable
                      key={day.id}
                      onPress={() =>
                        setApplyDays((prev) =>
                          prev.includes(day.id)
                            ? prev.filter((value) => value !== day.id)
                            : [...prev, day.id].sort((a, b) => a - b)
                        )
                      }
                      style={{
                        paddingVertical: 4,
                        paddingHorizontal: 8,
                        borderRadius: 999,
                        backgroundColor: active ? colors.primaryBg : colors.secondaryBg,
                      }}
                    >
                      <Text style={{ color: active ? colors.primaryText : colors.text, fontSize: 12 }}>
                        {day.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ color: colors.muted, fontSize: 12 }}>Data especifica</Text>
              <Pressable
                onPress={() => setShowApplyCalendar(true)}
                style={{
                  borderWidth: 1,
                  borderColor: colors.border,
                  padding: 10,
                  borderRadius: 10,
                  backgroundColor: colors.inputBg,
                }}
              >
                <Text style={{ color: applyDate ? colors.text : colors.muted }}>
                  {applyDate ? formatShortDate(applyDate) : "Selecione a data"}
                </Text>
              </Pressable>
            </ScrollView>
            <Pressable
              onPress={async () => {
                if (!applyPlan || !applyClassId) return;
                if (!applyDays.length) {
                  Alert.alert(
                    "Selecione os dias",
                    "Escolha pelo menos um dia da semana."
                  );
                  return;
                }
                if (!applyDate) {
                  Alert.alert(
                    "Informe a data",
                    "Digite a data especifica do treino."
                  );
                  return;
                }
                if (Number.isNaN(new Date(applyDate).getTime())) {
                  Alert.alert(
                    "Data invalida",
                    "Escolha uma data valida."
                  );
                  return;
                }
                const updated: TrainingPlan = {
                  ...applyPlan,
                  classId: applyClassId,
                  applyDays,
                  applyDate,
                };
                await updateTrainingPlan(updated);
                await reload();
                setShowApplyModal(false);
                setApplyPlan(null);
              }}
              style={{
                paddingVertical: 10,
                borderRadius: 12,
                backgroundColor: colors.primaryBg,
                alignItems: "center",
              }}
            >
              <Text style={{ color: colors.primaryText, fontWeight: "700" }}>
                Aplicar nessa turma
              </Text>
            </Pressable>
            <View style={{ gap: 8 }}>
              <Pressable
                onPress={() => {
                  if (!applyPlan) return;
                  onEdit(applyPlan);
                  setShowApplyModal(false);
                  setApplyPlan(null);
                }}
                style={{
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: colors.secondaryBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Editar treino
                </Text>
              </Pressable>
              <Pressable
                onPress={async () => {
                  if (!applyPlan) return;
                  await savePlanAsTemplate(applyPlan);
                }}
                style={{
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: colors.secondaryBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Salvar como modelo
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!applyPlan) return;
                  useTemplateAsPlan({
                    id: "dup_" + Date.now(),
                    title: applyPlan.title + " (copia)",
                    tags: applyPlan.tags ?? [],
                    warmup: applyPlan.warmup ?? [],
                    main: applyPlan.main ?? [],
                    cooldown: applyPlan.cooldown ?? [],
                    warmupTime: applyPlan.warmupTime ?? "",
                    mainTime: applyPlan.mainTime ?? "",
                    cooldownTime: applyPlan.cooldownTime ?? "",
                    ageBands: ["8-9", "10-12", "13-15", "16-18"],
                    source: "custom",
                  });
                  setShowApplyModal(false);
                  setApplyPlan(null);
                }}
                style={{
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: colors.secondaryBg,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: "center",
                }}
              >
                <Text style={{ color: colors.text, fontWeight: "700" }}>
                  Duplicar
                </Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (!applyPlan) return;
                  onDelete(applyPlan.id);
                  setShowApplyModal(false);
                  setApplyPlan(null);
                }}
                style={{
                  paddingVertical: 9,
                  borderRadius: 12,
                  backgroundColor: "#fee2e2",
                  borderWidth: 1,
                  borderColor: "#fecaca",
                  alignItems: "center",
                }}
              >
                <Text style={{ color: "#991b1b", fontWeight: "700" }}>
                  Excluir treino
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
      <Modal
        visible={showApplyCalendar}
        animationType="fade"
        transparent
        onRequestClose={() => setShowApplyCalendar(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.4)",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <View
            style={{
              width: "100%",
              maxWidth: 360,
              backgroundColor: colors.card,
              borderRadius: 16,
              padding: 12,
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
                  setApplyCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
                  )
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{"<"}</Text>
              </Pressable>
              <Text style={{ fontWeight: "700", color: colors.text }}>
                {monthNames[applyCalendarMonth.getMonth()]}{" "}
                {applyCalendarMonth.getFullYear()}
              </Text>
              <Pressable
                onPress={() =>
                  setApplyCalendarMonth(
                    (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
                  )
                }
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  borderRadius: 8,
                  backgroundColor: colors.secondaryBg,
                }}
              >
                <Text style={{ fontWeight: "700" }}>{">"}</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: "row" }}>
              {dayLabels.map((label) => (
                <Text
                  key={label}
                  style={{
                    width: "14.2857%",
                    textAlign: "center",
                    fontSize: 12,
                    color: colors.muted,
                  }}
                >
                  {label}
                </Text>
              ))}
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
              {applyCalendarDays.map((cell, index) => {
                const isSelected =
                  cell.date && formatIsoDate(cell.date) === applyDate;
                return (
                  <Pressable
                    key={`${cell.date?.toISOString() ?? "empty"}_${index}`}
                    disabled={!cell.date}
                    onPress={() => {
                      if (!cell.date) return;
                      setApplyDate(formatIsoDate(cell.date));
                      setShowApplyCalendar(false);
                    }}
                    style={{
                      width: "14.2857%",
                      height: 32,
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 4,
                      borderRadius: 16,
                      backgroundColor: isSelected ? colors.primaryBg : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color: cell.date
                          ? isSelected
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
              onPress={() => setShowApplyCalendar(false)}
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
      </Modal>
    </SafeAreaView>
  );
}







