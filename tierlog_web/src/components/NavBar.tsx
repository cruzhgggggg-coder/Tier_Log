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
    <View style={[getGlassStyle(0.6, 20), styles.wrap]}>
      {/* Brand Logo and Active Client Status */}
      <View style={styles.left}>
        <Text style={styles.brand}>TierLog // Academic</Text>
        <View style={styles.metaRow}>
          <View style={styles.statusDot} />
          <Text style={styles.meta}>
            {user?.name} ({user?.role === "lecturer" ? "Lecturer" : "Student"})
          </Text>
        </View>
      </View>

      {/* Grid Links and Logout Gateway */}
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
                  transform: [{ scale: pressed ? 0.96 : isHovered ? 1.02 : 1 }],
                },
                isActive && (getGlowStyle("#6366f1", 0.3) as any),
              ] as any}
            >
              <Icon
                color={isActive ? "#ffffff" : isHovered ? "#6366f1" : "#64748b"}
                size={16}
                style={{ transition: "color 0.2s ease" }}
              />
              <Text
                style={[
                  styles.linkText,
                  isActive
                    ? { color: "#ffffff" }
                    : isHovered
                    ? { color: "#f8fafc" }
                    : { color: "#94a3b8" },
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
            {
              transform: [{ scale: pressed ? 0.96 : hoveredLink === "logout" ? 1.02 : 1 }],
            },
          ] as any}
        >
          <LogoutIcon
            color={hoveredLink === "logout" ? "#ffffff" : "#fca5a5"}
            size={16}
            style={{ transition: "color 0.2s ease" }}
          />
          <Text style={[styles.linkText, { color: hoveredLink === "logout" ? "#ffffff" : "#fca5a5" }]}>
            Logout
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
    borderColor: "rgba(99, 102, 241, 0.12)",
    borderRadius: 20,
    marginBottom: 8,
  },
  left: {
    gap: 4,
  },
  brand: {
    color: "#f8fafc",
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
    backgroundColor: "#10b981",
    boxShadow: "0 0 8px #10b981",
  } as any,
  meta: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
  },
  right: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    alignItems: "center",
  },
  link: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    transition: "all 0.2s ease-in-out",
  } as any,
  linkActive: {
    backgroundColor: "#6366f1",
    borderColor: "rgba(99, 102, 241, 0.2)",
  },
  linkInactive: {
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderColor: "rgba(255, 255, 255, 0.03)",
  },
  logout: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.15)",
  },
  linkText: {
    fontSize: 13,
    fontWeight: "750",
    letterSpacing: -0.2,
    transition: "color 0.2s ease",
  } as any,
});
