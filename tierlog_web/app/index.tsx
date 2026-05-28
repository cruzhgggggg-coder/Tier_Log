import { Redirect, router } from "expo-router";
import React from "react";
import { Text, View, StyleSheet } from "react-native";

import { Button, Card, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { AIGatewayIcon } from "@/src/components/icons";

export default function WelcomeScreen() {
  const { user } = useAuth();

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <Page>
      <View style={styles.layout}>
        {/* Left Side: Elegant Asymmetric Branding Column */}
        <View style={styles.brandingColumn}>
          <View style={styles.protocolBadge}>
            <AIGatewayIcon color="#6366f1" size={18} />
            <Text style={styles.protocolText}>SMART ACADEMIC PORTAL</Text>
          </View>
          <Text style={styles.mainTitle}>
            Smart Guidance for {"\n"}
            <Text style={styles.accentGo}>Academic Success</Text> & {"\n"}
            <Text style={styles.accentWeb}>Thesis Excellence</Text>
          </Text>
          <Text style={styles.description}>
            Welcome to the integrated academic advisory portal. TierLog bridges the gap between students 
            and supervisors with real-time feedback, interactive AI-powered insights, and streamlined 
            revision tracking to make your thesis journey smooth and successful.
          </Text>
          
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>UPDATES</Text>
              <Text style={styles.featureValue}>Instant Sync</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>AI PARTNER</Text>
              <Text style={styles.featureValue}>Guarded Advice</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>SUPERVISION</Text>
              <Text style={styles.featureValue}>Real-Time</Text>
            </View>
          </View>
        </View>

        {/* Right Side: The Premium Glass Entrance Console */}
        <View style={styles.consoleColumn}>
          <Card style={styles.gateCard}>
            <Text style={styles.consoleTitle}>Academic advisory Workspace</Text>
            <Text style={styles.consoleSubtitle}>
              Log in to your workspace to consult with your advisor, collaborate with your smart assistant, 
              track your revision progress, and bring your research to the next level.
            </Text>
            
            <View style={styles.btnGroup}>
              <Button 
                title="Sign In" 
                onPress={() => router.push("/login")} 
              />
              <Button 
                title="Create Account" 
                onPress={() => router.push("/register")} 
                tone="secondary" 
              />
            </View>

            <View style={styles.securityMeta}>
              <Text style={styles.securityText}>SECURE ACADEMIC WORKSPACE</Text>
            </View>
          </Card>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  layout: {
    flexDirection: "row",
    gap: 48,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 40,
    paddingVertical: 12,
  },
  brandingColumn: {
    flex: 1.3,
    minWidth: 320,
    gap: 20,
  },
  protocolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  protocolText: {
    color: "#6366f1",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  mainTitle: {
    color: "#ffffff",
    fontSize: 48,
    fontWeight: "900",
    lineHeight: 56,
    letterSpacing: -1,
  },
  accentGo: {
    color: "#06b6d4",
  },
  accentWeb: {
    color: "#8b5cf6",
  },
  description: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 24,
    fontWeight: "500",
  },
  featuresRow: {
    flexDirection: "row",
    gap: 24,
    marginTop: 12,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingTop: 20,
  },
  featureItem: {
    gap: 4,
  },
  featureLabel: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  featureValue: {
    color: "#cbd5e1",
    fontSize: 14,
    fontWeight: "700",
  },
  consoleColumn: {
    flex: 1,
    minWidth: 320,
  },
  gateCard: {
    padding: 32,
  },
  consoleTitle: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  consoleSubtitle: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 28,
  },
  btnGroup: {
    gap: 12,
  },
  securityMeta: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingTop: 16,
    alignItems: "center",
  },
  securityText: {
    color: "#475569",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
  },
});
