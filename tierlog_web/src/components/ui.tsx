import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getGlassStyle, getGlowStyle } from "./icons";

export function Page({
  children,
  fullWidth = false,
  style,
  contentContainerStyle,
}: {
  children: React.ReactNode;
  fullWidth?: boolean;
  style?: any;
  contentContainerStyle?: any;
}) {
  return (
    <ScrollView style={[styles.page, style]} contentContainerStyle={[styles.pageContent, contentContainerStyle]}>
      {Platform.OS === "web" && (
        <View style={styles.webMeshOverlay as any} />
      )}
      <View style={fullWidth ? styles.containerFull : styles.container}>{children}</View>
    </ScrollView>
  );
}

// ─── Frosted Glass Card ─────────────────────────────────────────────
export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[getGlassStyle(), style]}>{children}</View>;
}

// ─── Section Heading ────────────────────────────────────────────────
export function Heading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <View style={styles.headingWrap}>
      <View style={styles.accentBar} />
      <View style={{ flex: 1 }}>
        <Text style={styles.heading}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

// ─── Input Field ────────────────────────────────────────────────────
export function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, isFocused && { color: "#4F46E5" }]}>{props.label}</Text>
      <TextInput
        placeholderTextColor="#94A3B8"
        {...props}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
        style={[
          styles.input,
          isFocused ? styles.inputFocused : styles.inputBlur,
          props.style,
        ]}
      />
    </View>
  );
}

// ─── Action Button ──────────────────────────────────────────────────
export function Button({
  title,
  onPress,
  disabled,
  tone = "primary",
  glowColor,
}: {
  title: string;
  onPress?: () => void | Promise<void>;
  disabled?: boolean;
  tone?: "primary" | "secondary" | "danger" | "success" | "warning";
  glowColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const getToneColor = () => {
    if (glowColor) return glowColor;
    switch (tone) {
      case "danger": return "#EF4444";
      case "success": return "#059669";
      case "warning": return "#D97706";
      case "secondary": return "#64748B";
      default: return "#4F46E5";
    }
  };

  const activeColor = getToneColor();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      onHoverIn={Platform.OS === "web" ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        styles.button,
        tone === "secondary"
          ? styles.btnSecondary
          : tone === "danger"
          ? styles.btnDanger
          : tone === "success"
          ? styles.btnSuccess
          : tone === "warning"
          ? styles.btnWarning
          : styles.btnPrimary,
        {
          opacity: disabled ? 0.5 : pressed ? 0.92 : 1,
          transform: [{ scale: pressed ? 0.95 : isHovered ? 1.025 : 1 }],
        },
        !disabled && isHovered && (getGlowStyle(activeColor, 0.18) as any),
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "secondary" ? { color: "#F1F5F9" } : { color: "#ffffff" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// ─── Status Badge ───────────────────────────────────────────────────
export function Badge({ text, color }: { text: string; color?: string }) {
  const isSuccess = text.toLowerCase().includes("fixed") || text.toLowerCase().includes("validated") || text.toLowerCase().includes("clear") || text.toLowerCase().includes("setuju") || text.toLowerCase().includes("approved");
  const isPending = text.toLowerCase().includes("pending") || text.toLowerCase().includes("new") || text.toLowerCase().includes("antrean") || text.toLowerCase().includes("revisi") || text.toLowerCase().includes("queue") || text.toLowerCase().includes("revision");

  const badgeColor = color
    ? color
    : isSuccess
    ? "#059669"
    : isPending
    ? "#D97706"
    : "#4F46E5";

  return (
    <View
      style={[
        styles.badge,
        { borderColor: `${badgeColor}22`, backgroundColor: `${badgeColor}0A` },
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ─── Stat Metric Card ───────────────────────────────────────────────
export function StatCard({
  label,
  value,
  glowColor = "#4F46E5",
}: {
  label: string;
  value: string | number;
  glowColor?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onHoverIn={Platform.OS === "web" ? () => setIsHovered(true) : undefined}
      onHoverOut={Platform.OS === "web" ? () => setIsHovered(false) : undefined}
      style={({ pressed }) => [
        getGlassStyle(0.82, 20) as any,
        styles.statCard,
        isHovered && (getGlowStyle(glowColor, 0.14) as any),
        {
          transform: [{ translateY: pressed ? -1 : isHovered ? -3 : 0 }],
        },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { color: glowColor }]}>{value}</Text>
      <View style={[styles.statDecor, { backgroundColor: `${glowColor}08` }]} />
    </Pressable>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#020617", // Midnight Obsidian
  },
  pageContent: {
    paddingVertical: 32,
    paddingHorizontal: 24,
    minHeight: "100%",
  },
  webMeshOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
    zIndex: -1,
    opacity: 0.45,
    backgroundImage:
      "radial-gradient(circle at 60% -10%, rgba(99, 102, 241, 0.15), transparent 60%), radial-gradient(circle at 10% 30%, rgba(20, 184, 166, 0.1), transparent 50%)",
  },
  container: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
    gap: 24,
  },
  containerFull: {
    width: "100%",
    gap: 24,
  },
  headingWrap: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  accentBar: {
    width: 4,
    height: 44,
    borderRadius: 99,
    backgroundColor: "#6366F1",
  },
  heading: {
    color: "#F8FAFC", // Titanium White
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#94A3B8", // Slate Silver
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
    fontWeight: "500",
  },
  fieldContainer: {
    marginBottom: 18,
    gap: 6,
  },
  label: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    paddingLeft: 2,
    transition: "color 0.2s ease",
  } as any,
  input: {
    color: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    fontSize: 14,
    fontWeight: "500",
    borderWidth: 1,
    outlineStyle: "none",
    transition: "all 0.2s ease",
  } as any,
  inputBlur: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  inputFocused: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "#6366F1",
    boxShadow: "0 0 12px rgba(99, 102, 241, 0.2)",
  } as any,
  button: {
    paddingVertical: 13,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    transition: "all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)",
  } as any,
  btnPrimary: {
    backgroundColor: "#4F46E5",
  },
  btnSecondary: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  btnDanger: {
    backgroundColor: "#EF4444",
  },
  btnSuccess: {
    backgroundColor: "#059669",
  },
  btnWarning: {
    backgroundColor: "#D97706",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  statCard: {
    flex: 1,
    minWidth: 200,
    position: "relative",
    overflow: "hidden",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  statValue: {
    color: "#F8FAFC",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 10,
    letterSpacing: -1,
  },
  statDecor: {
    position: "absolute",
    right: -16,
    bottom: -16,
    width: 72,
    height: 72,
    borderRadius: 36,
    zIndex: -1,
  },
});
