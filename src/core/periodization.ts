import { ClassGroup } from "./models";

export function getBlockForToday(cls: ClassGroup): string {
  const goal = cls.goal.toLowerCase();
  if (goal.includes("forca") && goal.includes("potencia")) {
    return "Meso B/C - Forca + Potencia";
  }
  if (goal.includes("forca")) {
    return "Meso B - Forca Geral";
  }
  if (goal.includes("potencia") || goal.includes("agilidade")) {
    return "Meso C - Potencia/Agilidade";
  }
  return "Meso A - Fundamentos/Tecnica";
}
