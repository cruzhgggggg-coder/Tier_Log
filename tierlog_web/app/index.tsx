import { Redirect, router } from "expo-router";
import React, { useState, useEffect, useMemo } from "react";
import { Text, View, StyleSheet, Platform } from "react-native";

import { Button, Card, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { AIGatewayIcon } from "@/src/components/icons";
import KnowledgeConstellation from "@/src/components/KnowledgeConstellation";
import SpaceBackground from "@/src/components/SpaceBackground";

export default function WelcomeScreen() {
  const { user } = useAuth();
  const [stage, setStage] = useState(0);
  const [activeLog, setActiveLog] = useState("SECURE_WEBSOCKET::SYNC_OK");

  // Telemetry Operations Feed Messages
  const logs = useMemo(() => [
    "SECURE_WEBSOCKET::SYNC_OK",
    "NVIDIA_NIM::COG_INIT_SUCCESS",
    "TRANSCRIPT_ENGINE::STT_ONLINE",
    "CONSULTATION_STREAM::ACTIVE_ROOM_204",
    "DRAFT_VALIDATOR::INTEGRITY_VERIFIED",
    "DB_POOL::ACQUIRE_CONNECTION_SUCCESS",
    "TELEMETRY_CORE::NODES_ONLINE_6_6",
    "REVISION_QUEUE::MONITORING_ACTIVE",
    "CROSS_ORIGIN_COMM::VERIFIED",
  ], []);

  // Staggered animated entrance sequence orchestration & Log Ticker cycling
  useEffect(() => {
    if (user) return;

    const timer1 = setTimeout(() => setStage(1), 100);  // Backdrop grid loads
    const timer2 = setTimeout(() => setStage(2), 400);  // 3D Constellation mesh fades
    const timer3 = setTimeout(() => setStage(3), 850);  // Console entrance cards slide

    // Live terminal-style ticking log interval (3.2 seconds cycle)
    const logInterval = setInterval(() => {
      setActiveLog((prev) => {
        const currentIndex = logs.indexOf(prev);
        const nextIndex = (currentIndex + 1) % logs.length;
        return logs[nextIndex];
      });
    }, 3200);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearInterval(logInterval);
    };
  }, [user, logs]);

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  return (
    <View style={styles.fullscreenContainer}>
      <SpaceBackground />
      <Page style={styles.transparentPage}>
        <View style={styles.layout}>
        {/* Left Column: Asymmetric Brand Messaging */}
        <View 
          style={[
            styles.brandingColumn,
            {
              opacity: stage >= 3 ? 1 : 0,
              transform: [{ translateY: stage >= 3 ? 0 : 20 }],
            } as any,
          ]}
        >
          <View style={styles.protocolBadge}>
            <AIGatewayIcon color="#6366F1" size={16} />
            <Text style={styles.protocolText}>ACADEMIC WORKSPACE CONSOLE</Text>
          </View>
          <Text style={styles.mainTitle}>
            Academic advising &{"\n"}
            <Text style={styles.accentGo}>thesis revision workflow</Text>{"\n"}
            <Text style={styles.accentWeb}>engineered for excellence</Text>
          </Text>
          <Text style={styles.description}>
            An integrated academic advising portal connecting students and research advisors. Track draft progression, collaborate on structured annotations, and verify consultation milestones in real-time.
          </Text>

          {/* Live Operations Ticker (High visual density - Dark mode adapted) */}
          <View style={styles.tickerCard}>
            <View style={styles.tickerLed} />
            <Text style={styles.tickerText}>
              SYSTEM_FEED:: <Text style={styles.tickerVal}>{activeLog}</Text>
            </Text>
          </View>
          
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>ACTIVE DRAFT SYNC</Text>
              <Text style={styles.featureValue}>Real-time progress tracking</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>QUALITY CONTROLS</Text>
              <Text style={styles.featureValue}>Structured feedback loop</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureLabel}>FORMAL APPROVAL</Text>
              <Text style={styles.featureValue}>Advisor-verified milestones</Text>
            </View>
          </View>
        </View>

        {/* Center Column: Dynamic 3D Telemetry Graph */}
        <View 
          style={[
            styles.visualColumn,
            {
              opacity: stage >= 2 ? 1 : 0,
              transition: "opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1)",
            } as any,
          ]}
        >
          <KnowledgeConstellation />
        </View>

        {/* Right Column: Premium Glass Entrance Console (Smoky Obsidian Edition) */}
        <View 
          style={[
            styles.consoleColumn,
            {
              opacity: stage >= 3 ? 1 : 0,
              transform: [{ translateY: stage >= 3 ? 0 : 20 }],
            } as any,
          ]}
        >
          <Card style={[styles.gateCard, styles.darkGlassOverride]}>
            <Text style={styles.consoleTitle}>Academic Advising Console</Text>
            <Text style={styles.consoleSubtitle}>
              Sign in to consult with your research advisor, review feedback annotations, track revision approvals, and monitor defense eligibility.
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
              <Text style={styles.securityText}>ENCRYPTED & SECURED</Text>
            </View>
          </Card>
        </View>
      </View>
    </Page>
  </View>
);
}

const styles = StyleSheet.create({
  layout: {
    flexDirection: "row",
    gap: 32,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 24,
    paddingVertical: 12,
    paddingHorizontal: 48,
  },
  brandingColumn: {
    flex: 1.2,
    minWidth: 320,
    gap: 20,
    ...Platform.select({
      web: {
        transition: "opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1), transform 0.9s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    }),
  } as any,
  visualColumn: {
    flex: 1.4,
    minWidth: 360,
    height: 560,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    padding: 16,
  },
  consoleColumn: {
    flex: 1,
    minWidth: 320,
    ...Platform.select({
      web: {
        transition: "opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s, transform 0.9s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
      },
    }),
  } as any,
  protocolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(99, 102, 241, 0.08)", // indigo tint
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.16)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  protocolText: {
    color: "#6366F1", // neon indigo
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  mainTitle: {
    color: "#F8FAFC", // Titanium White
    fontSize: 40,
    fontWeight: "900",
    lineHeight: 48,
    letterSpacing: -1.2,
    ...Platform.select({
      web: {
        textShadow: "0 0 35px rgba(99, 102, 241, 0.15)",
      },
    }),
  } as any,
  accentGo: {
    color: "#14B8A6", // Cyber Teal
  },
  accentWeb: {
    color: "#6366F1", // Neon Indigo
  },
  description: {
    color: "#94A3B8", // Soothing slate steel
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  tickerCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "flex-start",
    backgroundColor: "rgba(10, 15, 30, 0.45)", // Smoky dark gray container
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 2,
    backdropFilter: "blur(8px)",
    WebkitBackdropFilter: "blur(8px)",
  } as any,
  tickerLed: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#14B8A6", // Cyber Teal indicator blinking
    boxShadow: "0 0 8px #14B8A6",
  } as any,
  tickerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#94A3B8",
    fontFamily: "monospace",
    letterSpacing: 0.8,
  },
  tickerVal: {
    color: "#6366F1", // Indigo cycling value
    fontWeight: "900",
  },
  featuresRow: {
    flexDirection: "row",
    gap: 16,
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 20,
  },
  featureItem: {
    flex: 1,
    gap: 4,
  },
  featureLabel: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
    fontFamily: "monospace",
  },
  featureValue: {
    color: "#F1F5F9", // Muted White
    fontSize: 12,
    fontWeight: "700",
  },
  gateCard: {
    padding: 32,
  },
  darkGlassOverride: {
    backgroundColor: "rgba(10, 15, 30, 0.72)", // smoky obsidian frosted glass
    borderColor: "rgba(255, 255, 255, 0.08)", // subtle white micro-edge
    ...Platform.select({
      web: {
        backdropFilter: "blur(32px)",
        WebkitBackdropFilter: "blur(32px)",
        // Microscopic physical noise grain overlay (opacity 0.025)
        backgroundImage: `linear-gradient(rgba(255, 255, 255, 0.01), rgba(255, 255, 255, 0.01)), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.80' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.02'/%3E%3C/svg%3E")`,
        boxShadow: "inset 0 1px 1px 0 rgba(255, 255, 255, 0.12), 0 20px 25px -5px rgba(0, 0, 0, 0.35)",
        transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
      },
    }),
  } as any,
  consoleTitle: {
    color: "#F8FAFC", // Titanium White
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 8,
  },
  consoleSubtitle: {
    color: "#94A3B8", // slate grey
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
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingTop: 16,
    alignItems: "center",
  },
  securityText: {
    color: "#64748B",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    fontFamily: "monospace",
  },
  fullscreenContainer: {
    flex: 1,
    backgroundColor: "#020617",
    position: "relative",
  },
  transparentPage: {
    backgroundColor: "transparent",
  },
});
