import React, { useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { getGlassStyle, getGlowStyle } from "./icons";

// Premium Page Container with subtle glowing aesthetic
export function Page({ children }: { children: React.ReactNode }) {
  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
      {/* Dynamic background mesh effect for web viewport */}
      {Platform.OS === "web" && (
        <View style={styles.webMeshOverlay as any} />
      )}
      <View style={styles.container}>{children}</View>
    </ScrollView>
  );
}

// Glassmorphic Card Container
export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[getGlassStyle(), style]}>{children}</View>;
}

// Typographically Balanced Heading Component
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

// Glowing Active-State Input Fields
export function Field(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.fieldContainer}>
      <Text style={[styles.label, isFocused && { color: "#6366f1" }]}>{props.label}</Text>
      <TextInput
        placeholderTextColor="#475569"
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
          isFocused && (getGlowStyle("#6366f1", 0.25) as any),
          props.style,
        ]}
      />
    </View>
  );
}

// Animated Haptic-Scale Action Buttons
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

  // Map tones to primary color schemes
  const getToneColor = () => {
    if (glowColor) return glowColor;
    switch (tone) {
      case "danger": return "#ef4444";
      case "success": return "#10b981";
      case "warning": return "#f59e0b";
      case "secondary": return "#64748b";
      default: return "#6366f1";
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
          opacity: disabled ? 0.45 : pressed ? 0.94 : 1,
          transform: [{ scale: pressed ? 0.96 : isHovered ? 1.02 : 1 }],
        },
        !disabled && tone !== "secondary" && (getGlowStyle(activeColor, isHovered ? 0.35 : 0.18) as any),
        !disabled && tone === "secondary" && isHovered && (getGlowStyle("#6366f1", 0.15) as any),
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          tone === "secondary" ? { color: "#cbd5e1" } : { color: "#ffffff" },
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

// Specialized Custom Status Badges
export function Badge({ text, color }: { text: string; color?: string }) {
  const isSuccess = text.toLowerCase().includes("fixed") || text.toLowerCase().includes("validated") || text.toLowerCase().includes("clear") || text.toLowerCase().includes("setuju");
  const isPending = text.toLowerCase().includes("pending") || text.toLowerCase().includes("new") || text.toLowerCase().includes("antrean") || text.toLowerCase().includes("revisi");
  
  const badgeColor = color 
    ? color 
    : isSuccess 
    ? "#10b981" 
    : isPending 
    ? "#f59e0b" 
    : "#6366f1";

  return (
    <View
      style={[
        styles.badge,
        { borderColor: `${badgeColor}33`, backgroundColor: `${badgeColor}12` },
        getGlowStyle(badgeColor, 0.08) as any
      ]}
    >
      <Text
        style={[
          styles.badgeText,
          { color: badgeColor }
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// Glassmorphic High-Impact Stat Display
export function StatCard({ 
  label, 
  value, 
  glowColor = "#6366f1" 
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
        getGlassStyle(0.35, 24) as any, 
        styles.statCard,
        isHovered && (getGlowStyle(glowColor, 0.2) as any),
        {
          transform: [{ translateY: pressed ? -2 : isHovered ? -4 : 0 }]
        }
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, { textShadowColor: glowColor, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }]}>{value}</Text>
      <View style={[styles.statDecor, { backgroundColor: `${glowColor}08` }]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#070a13",
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
    height: 600,
    zIndex: -1,
    opacity: 0.15,
    backgroundImage:
      "radial-gradient(circle at 50% -20%, #4f46e5, transparent 70%), radial-gradient(circle at 10% 20%, #06b6d4, transparent 40%)",
  },
  container: {
    maxWidth: 1200,
    width: "100%",
    alignSelf: "center",
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
    height: 48,
    borderRadius: 99,
    backgroundColor: "#6366f1",
  },
  heading: {
    color: "#f8fafc",
    fontSize: 32,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  subtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
    fontWeight: "500",
  },
  fieldContainer: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingLeft: 4,
  },
  input: {
    color: "#f8fafc",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    fontWeight: "500",
    borderWidth: 1,
    outlineStyle: "none",
    transition: "all 0.25s ease-in-out",
  } as any,
  inputBlur: {
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  inputFocused: {
    backgroundColor: "rgba(2, 6, 23, 0.7)",
    borderColor: "#6366f1",
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
    transition: "all 0.2s ease-in-out",
  } as any,
  btnPrimary: {
    backgroundColor: "#6366f1",
  },
  btnSecondary: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  btnDanger: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  btnSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  btnWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    borderColor: "rgba(245, 158, 11, 0.3)",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  badgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  badgeWarning: {
    backgroundColor: "rgba(245, 158, 11, 0.08)",
    borderColor: "rgba(245, 158, 11, 0.2)",
  },
  badgeInfo: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "900",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  statCard: {
    flex: 1,
    minWidth: 220,
    position: "relative",
    overflow: "hidden",
  },
  statLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  statValue: {
    color: "#ffffff",
    fontSize: 36,
    fontWeight: "900",
    marginTop: 12,
    letterSpacing: -1,
  },
  statDecor: {
    position: "absolute",
    right: -20,
    bottom: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(99, 102, 241, 0.04)",
    zIndex: -1,
  },
});
