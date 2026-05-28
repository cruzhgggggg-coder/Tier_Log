import { Redirect, router } from "expo-router";
import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Button, Card, Field, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { ProfileIcon, SecurityIcon, AIGatewayIcon } from "@/src/components/icons";

export default function RegisterScreen() {
  const { register, user } = useAuth();
  const [role, setRole] = useState<"student" | "lecturer">("student");
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    nim: "",
    lecturer_id: "1",
    prodi: "",
    thesis_title: "",
    nip: "",
    faculty: "",
    keahlian: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    return <Redirect href="/dashboard" />;
  }

  const patch = (key: keyof typeof form, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleRegister = async () => {
    if (!form.name || !form.email || !form.password) {
      setError("Name, Email, and Password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await register({
        name: form.name,
        email: form.email,
        password: form.password,
        role,
        nim: form.nim,
        lecturer_id: Number(form.lecturer_id),
        prodi: form.prodi,
        thesis_title: form.thesis_title,
        nip: form.nip,
        faculty: form.faculty,
        keahlian: form.keahlian,
      });
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please check your inputs.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Page>
      {/* Back button to entrance landing */}
      <Pressable onPress={() => router.push("/")} style={styles.backBtn}>
        <Text style={styles.backText}>&larr; Back to Gate</Text>
      </Pressable>

      <View style={styles.layout}>
        {/* Left Side: Branding and Guide */}
        <View style={styles.brandingColumn}>
          <View style={styles.badgeRow}>
            <ProfileIcon color="#8b5cf6" size={16} />
            <Text style={styles.badgeText}>ACADEMIC ONBOARDING</Text>
          </View>
          <Text style={styles.registerTitle}>
            Account {"\n"}
            <Text style={styles.violetGlow}>Registration</Text>
          </Text>
          <Text style={styles.registerSubtitle}>
            Create your account as a student or academic advisor. Start managing your thesis, revisions, and consultations seamlessly.
          </Text>

          <View style={styles.infoCard}>
            <SecurityIcon color="#06b6d4" size={18} />
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>PERSONALIZED ADVISORY WORKSPACE</Text>
              <Text style={styles.infoDesc}>
                The portal keeps student research drafts and advisor notes secure and beautifully segregated, offering absolute privacy.
              </Text>
            </View>
          </View>
        </View>

        {/* Right Side: Step Registration Console Card */}
        <View style={styles.formColumn}>
          <Card style={styles.card}>
            <Text style={styles.cardHeader}>Registration Workspace</Text>
            <Text style={styles.cardSub}>Select your academic role and provide the required information.</Text>

            {/* Custom Tab Role Switcher */}
            <View style={styles.roleTabWrapper}>
              <Pressable
                onPress={() => setRole("student")}
                style={[styles.roleTab, role === "student" && styles.roleTabActive]}
              >
                <Text style={[styles.roleTabText, role === "student" && styles.roleTabTextActive]}>
                  Student
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRole("lecturer")}
                style={[styles.roleTab, role === "lecturer" && styles.roleTabActive]}
              >
                <Text style={[styles.roleTabText, role === "lecturer" && styles.roleTabTextActive]}>
                  Academic Advisor
                </Text>
              </Pressable>
            </View>

            {/* Registration Fields */}
            <View style={styles.formFields}>
              <Field
                label="Full Name"
                placeholder="e.g., Jonathan Doe"
                value={form.name}
                onChangeText={(v) => patch("name", v)}
              />
              <Field
                label="Academic Email Address"
                placeholder="email@university.edu"
                autoCapitalize="none"
                keyboardType="email-address"
                value={form.email}
                onChangeText={(v) => patch("email", v)}
              />
              <Field
                label="Secure Password"
                placeholder="Minimum 6 characters"
                secureTextEntry
                value={form.password}
                onChangeText={(v) => patch("password", v)}
              />

              {role === "student" ? (
                <View style={styles.dynamicGroup}>
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Student ID (NIM)"
                        placeholder="e.g., 240601..."
                        value={form.nim}
                        onChangeText={(v) => patch("nim", v)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Advisor ID"
                        placeholder="e.g., 1"
                        value={form.lecturer_id}
                        onChangeText={(v) => patch("lecturer_id", v)}
                      />
                    </View>
                  </View>
                  <Field
                    label="Program of Study"
                    placeholder="e.g., Computer Science"
                    value={form.prodi}
                    onChangeText={(v) => patch("prodi", v)}
                  />
                  <Field
                    label="Thesis / Manuscript Title"
                    placeholder="e.g., Secure Distributed Architecture in Go"
                    value={form.thesis_title}
                    onChangeText={(v) => patch("thesis_title", v)}
                  />
                </View>
              ) : (
                <View style={styles.dynamicGroup}>
                  <View style={styles.rowFields}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Advisor ID Number (NIP)"
                        placeholder="e.g., 1984..."
                        value={form.nip}
                        onChangeText={(v) => patch("nip", v)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Field
                        label="Faculty / Department"
                        placeholder="e.g., Science and Technology"
                        value={form.faculty}
                        onChangeText={(v) => patch("faculty", v)}
                      />
                    </View>
                  </View>
                  <Field
                    label="Primary Research Domain"
                    placeholder="e.g., Distributed Systems & Web Security"
                    value={form.keahlian}
                    onChangeText={(v) => patch("keahlian", v)}
                  />
                </View>
              )}

              {error ? (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}

              <Button
                title={loading ? "Registering Account..." : "Register Account"}
                onPress={() => void handleRegister()}
                disabled={loading}
              />
            </View>

            <View style={styles.footerLink}>
              <Text style={styles.footerText}>Already have an account?</Text>
              <Pressable onPress={() => router.push("/login")} style={styles.linkBtn}>
                <Text style={styles.linkAction}>Sign In &rarr;</Text>
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
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginTop: 10,
  },
  brandingColumn: {
    flex: 1.2,
    minWidth: 320,
    gap: 16,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(139, 92, 246, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(139, 92, 246, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  badgeText: {
    color: "#8b5cf6",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  registerTitle: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "900",
    lineHeight: 48,
    letterSpacing: -1,
  },
  violetGlow: {
    color: "#8b5cf6",
  },
  registerSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  infoCard: {
    flexDirection: "row",
    gap: 14,
    backgroundColor: "rgba(6, 182, 212, 0.04)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.1)",
    borderRadius: 16,
    padding: 16,
    marginTop: 12,
  },
  infoTitle: {
    color: "#06b6d4",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
    marginBottom: 4,
  },
  infoDesc: {
    color: "#64748b",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  formColumn: {
    flex: 1.3,
    minWidth: 350,
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
  roleTabWrapper: {
    flexDirection: "row",
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    padding: 4,
    marginBottom: 24,
    gap: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.2s ease",
  },
  roleTabActive: {
    backgroundColor: "#6366f1",
  },
  roleTabText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  roleTabTextActive: {
    color: "#ffffff",
  },
  formFields: {
    gap: 6,
  },
  dynamicGroup: {
    gap: 6,
  },
  rowFields: {
    flexDirection: "row",
    gap: 12,
  },
  errorBox: {
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
  footerText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "500",
  },
  linkBtn: {
    padding: 4,
  },
  linkAction: {
    color: "#6366f1",
    fontSize: 12,
    fontWeight: "800",
  },
} as any);
