import { Pressable, Text } from "react-native";

import { useAppTheme } from "./app-theme";

export function Button({
  label,
  onPress,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary";
}) {
  const { colors } = useAppTheme();
  const bg =
    variant === "primary" ? colors.primaryBg : colors.secondaryBg;
  const textColor =
    variant === "primary" ? colors.primaryText : colors.secondaryText;

  return (
    <Pressable
      onPress={onPress}
      style={{
        paddingVertical: 12,
        paddingHorizontal: 14,
        borderRadius: 14,
        backgroundColor: bg,
        alignItems: "center",
      }}
    >
      <Text style={{ color: textColor, fontWeight: "700" }}>{label}</Text>
    </Pressable>
  );
}
