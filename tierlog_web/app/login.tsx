import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Field, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { SecurityIcon, AIGatewayIcon, ChevronRightIcon } from "@/src/components/icons";

export default function LoginScreen() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await login({ email, password });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      {/* Sleek back navigation indicator */}
      <Pressable onPress={() => router.push("/")} style={styles.backBtn}>
        <Text style={styles.backText}>&larr; Back to Gate</Text>
      </Pressable>

      <View style={styles.layout}>
        {/* Left Side: Cyber Security Visual Guide */}
        <View style={styles.securityColumn}>
          <View style={styles.portalBadge}>
            <SecurityIcon color="#06b6d4" size={16} />
            <Text style={styles.portalText}>SECURE MEMBER PORTAL</Text>
          </View>
          <Text style={styles.gateTitle}>
            Workspace {"\n"}
            <Text style={styles.cyanGlow}>Sign In</Text>
          </Text>
          <Text style={styles.gateSubtitle}>
            Welcome back! Sign in to access your consultations, review advisor revisions, and collaborate with your AI Oracle partner.
          </Text>
          
          <View style={styles.noticeBox}>
            <AIGatewayIcon color="#a855f7" size={18} style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.noticeTitle}>SEAMLESS SECURE SYNC</Text>
              <Text style={styles.noticeBody}>
                Your credentials and academic progress are synced securely, ensuring strict data privacy and absolute confidentiality.
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side: The Form Card */}
        <View style={styles.formColumn}>
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>User Authentication</Text>
            <Text style={styles.cardSub}>Provide your academic email and account password.</Text>

            <View style={styles.form}>
              <Field
                label="Email Address"
                placeholder="email@university.edu"
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
              <Field
                label="Account Password"
                placeholder="••••••••••••"
                secureTextEntry
                value={password}
                onChangeText={setPassword}
              />

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title={loading ? "Authenticating..." : "Sign In"}
                onPress={() => void handleLogin()}
                disabled={loading}
              />
            </View>

            <View style={styles.footerLink}>
              <Text style={styles.footerLabel}>No account registered?</Text>
              <Pressable onPress={() => router.push("/register")} style={styles.linkBtn}>
                <Text style={styles.linkText}>Create Account &rarr;</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </View>
    </Page>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    alignSelf: "flex-start",
    marginBottom: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.02)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
  },
  backText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "700",
  },
  layout: {
    flexDirection: "row",
    gap: 40,
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 20,
  },
  securityColumn: {
    flex: 1.2,
    minWidth: 320,
    gap: 16,
  },
  portalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(6, 182, 212, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  portalText: {
    color: "#06b6d4",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  gateTitle: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 48,
    letterSpacing: -1,
  },
  cyanGlow: {
    color: "#6366f1",
  },
  gateSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  noticeBox: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(168, 85, 247, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(168, 85, 247, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  noticeTitle: {
    color: "#a855f7",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  noticeBody: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  formColumn: {
    flex: 1,
    minWidth: 320,
  },
  card: {
    padding: 32,
  },
  cardHeader: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  cardSub: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "500",
    marginBottom: 24,
  },
  form: {
    gap: 6,
  },
  errorContainer: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  footerLink: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingTop: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  linkBtn: {
    padding: 4,
  },
  linkText: {
    color: "#6366f1",
    fontSize: 12,
    fontWeight: "800",
  },
});
