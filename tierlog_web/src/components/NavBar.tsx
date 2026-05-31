import { router, usePathname } from "expo-router";
import React, { useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";
import { getGlassStyle, getGlowStyle } from "./icons";
import {
  DashboardIcon,
  ConsultationIcon,
  ArchiveIcon,
  ProfileIcon,
  SecurityIcon,
  AIGatewayIcon,
  LogoutIcon,
} from "./icons";

const studentLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/consultations", label: "Consultation", Icon: ConsultationIcon },
  { href: "/archive", label: "Archive", Icon: ArchiveIcon },
  { href: "/settings/profile", label: "Profile", Icon: ProfileIcon },
  { href: "/settings/security", label: "Security", Icon: SecurityIcon },
  { href: "/settings/ai-gateway", label: "AI Gateway", Icon: AIGatewayIcon },
] as const;

const lecturerLinks = [
  { href: "/lecturer-dashboard", label: "Students", Icon: ProfileIcon },
  { href: "/archive", label: "Archive", Icon: ArchiveIcon },
  { href: "/settings/profile", label: "Profile", Icon: ProfileIcon },
  { href: "/settings/security", label: "Security", Icon: SecurityIcon },
] as const;

export function NavBar() {
  const pathname = usePathname();
  const { logout, user } = useAuth();
  const [hoveredLink, setHoveredLink] = useState<string | null>(null);
  const links = user?.role === "lecturer" ? lecturerLinks : studentLinks;

  return (
    <View style={[getGlassStyle(0.85, 16), styles.wrap]}>
      {/* Brand */}
      <View style={styles.left}>
        <Text style={styles.brand}>TierLog</Text>
        <View style={styles.metaRow}>
          <View style={styles.statusDot} />
          <Text style={styles.meta}>
            {user?.name} · {user?.role === "lecturer" ? "Advisor" : "Student"}
          </Text>
        </View>
      </View>

      {/* Navigation Links */}
      <View style={styles.right}>
        {links.map((link) => {
          const isActive = pathname === link.href;
          const isHovered = hoveredLink === link.href;
          const Icon = link.Icon;

          return (
            <Pressable
              key={link.href}
              onPress={() => router.push(link.href)}
              onHoverIn={Platform.OS === "web" ? () => setHoveredLink(link.href) : undefined}
              onHoverOut={Platform.OS === "web" ? () => setHoveredLink(null) : undefined}
              style={({ pressed }) => [
                styles.link,
                isActive ? styles.linkActive : styles.linkInactive,
                {
                  transform: [{ scale: pressed ? 0.97 : isHovered ? 1.01 : 1 }],
                },
                isActive && (getGlowStyle("#6366F1", 0.15) as any),
                !isActive && isHovered && styles.linkHovered,
              ] as any}
            >
              <Icon
                color={isActive ? "#ffffff" : isHovered ? "#6366F1" : "#94A3B8"}
                size={15}
                style={{ transition: "color 0.2s ease" }}
              />
              <Text
                style={[
                  styles.linkText,
                  isActive
                    ? { color: "#ffffff" }
                    : isHovered
                    ? { color: "#6366F1" }
                    : { color: "#94A3B8" },
                ]}
              >
                {link.label}
              </Text>
            </Pressable>
          );
        })}

        <Pressable
          onPress={() => void logout()}
          onHoverIn={Platform.OS === "web" ? () => setHoveredLink("logout") : undefined}
          onHoverOut={Platform.OS === "web" ? () => setHoveredLink(null) : undefined}
          style={({ pressed }) => [
            styles.link,
            styles.logout,
            hoveredLink === "logout" && styles.logoutHovered,
            {
              transform: [{ scale: pressed ? 0.97 : hoveredLink === "logout" ? 1.01 : 1 }],
            },
          ] as any}
        >
          <LogoutIcon
            color={hoveredLink === "logout" ? "#ffffff" : "#EF4444"}
            size={15}
            style={{ transition: "color 0.2s ease" }}
          />
          <Text style={[styles.linkText, { color: hoveredLink === "logout" ? "#ffffff" : "#EF4444" }]}>
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 14,
    marginBottom: 8,
  },
  left: {
    gap: 3,
  },
  brand: {
    color: "#F8FAFC", // Titanium White
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "#10B981",
    boxShadow: "0 0 6px rgba(16, 185, 129, 0.4)",
  } as any,
  meta: {
    color: "#94A3B8", // Slate Silver
    fontSize: 12,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    alignItems: "center",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    transition: "all 0.2s ease",
  } as any,
  linkActive: {
    backgroundColor: "#6366F1",
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  linkInactive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  linkHovered: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.15)",
  },
  logout: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  logoutHovered: {
    backgroundColor: "#EF4444",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.1,
    transition: "color 0.2s ease",
  } as any,
});
