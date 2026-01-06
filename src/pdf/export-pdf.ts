import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

export const safeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const exportPdf = async ({
  html,
  fileName,
}: {
  html: string;
  fileName: string;
}) => {
  const { uri } = await Print.printToFileAsync({
    html,
    base64: false,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: "application/pdf",
      dialogTitle: "Salvar/Compartilhar PDF",
      UTI: "com.adobe.pdf",
    });
  } else if (Platform.OS === "web" && typeof window !== "undefined") {
    window.open(uri, "_blank");
  }

  return { uri, fileName };
};
