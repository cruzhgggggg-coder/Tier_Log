import React, { useState } from "react";
import { StyleSheet, Text, View, TextInput, Platform } from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Button, Card, Field, Heading, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import type { User } from "@/src/types";
import { ProfileIcon, CheckCircleIcon, AlertIcon } from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";

export default function ProfileScreen() {
  const { api, user, setUser } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [nim, setNim] = useState(user?.student?.nim ?? "");
  const [prodi, setProdi] = useState(user?.student?.prodi ?? "");
  const [thesisTitle, setThesisTitle] = useState(user?.student?.thesis_title ?? "");
  const [lecturerId, setLecturerId] = useState(String(user?.student?.lecturer_id ?? ""));
  const [nip, setNip] = useState(user?.lecturer?.nip ?? "");
  const [faculty, setFaculty] = useState(user?.lecturer?.faculty ?? "");
  const [keahlian, setKeahlian] = useState(user?.lecturer?.keahlian ?? "");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(true);

  const save = async () => {
    try {
      const response = await api<{ user: User; message: string }>("/settings/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          email,
          nim,
          prodi,
          thesis_title: thesisTitle,
          lecturer_id: lecturerId ? Number(lecturerId) : 0,
          nip,
          faculty,
          keahlian,
        }),
      });
      setUser(response.user);
      setMessage(response.message);
      setIsSuccess(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to save profile");
      setIsSuccess(false);
    }
  };

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        <Heading 
          title="Profile Settings" 
          subtitle="Manage your digital identity, institutional credentials, and academic affiliation metadata." 
        />

        <View style={styles.layout}>
          {/* Main Account Form Card */}
          <Card style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <ProfileIcon color="#6366f1" size={20} />
              <Text style={styles.sectionTitle}>Primary Credentials & Identity</Text>
            </View>

            <View style={styles.fieldsGroup}>
              <View style={styles.rowFields}>
                <View style={{ flex: 1 }}>
                  <Field label="Full Name" value={name} onChangeText={setName} />
                </View>
                <View style={{ flex: 1 }}>
                  <Field label="Email Address" value={email} onChangeText={setEmail} autoCapitalize="none" />
                </View>
              </View>

              {/* Dynamic Academic Affiliation Panel based on User Role */}
              {user?.role === "student" ? (
                <View style={styles.academicWrapper}>
                  <Text style={styles.academicHeader}>ACADEMIC AFFILIATION ({user?.role?.toUpperCase()})</Text>
                  <View style={styles.fieldsGroup}>
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        <Field label="Student ID (NIM)" value={nim} onChangeText={setNim} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Program of Study" value={prodi} onChangeText={setProdi} />
                      </View>
                    </View>
                    
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1.5 }}>
                        <Field label="Thesis / Dissertation Title" value={thesisTitle} onChangeText={setThesisTitle} />
                      </View>
                      <View style={{ flex: 0.5 }}>
                        <Field label="Academic Advisor ID" value={lecturerId} onChangeText={setLecturerId} />
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.academicWrapper}>
                  <Text style={styles.academicHeader}>ACADEMIC AFFILIATION (LECTURER)</Text>
                  <View style={styles.fieldsGroup}>
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        <Field label="Advisor ID Number (NIP)" value={nip} onChangeText={setNip} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Field label="Faculty / Department" value={faculty} onChangeText={setFaculty} />
                      </View>
                    </View>
                    
                    <View style={styles.rowFields}>
                      <View style={{ flex: 1 }}>
                        <Field label="Primary Research Domain (Expertise)" value={keahlian} onChangeText={setKeahlian} />
                      </View>
                    </View>
                  </View>
                </View>
              )}


              {/* Glowing feedback alert banner */}
              {message ? (
                <View style={[
                  styles.alertBox,
                  isSuccess ? styles.alertSuccess : styles.alertError
                ]}>
                  {isSuccess ? (
                    <CheckCircleIcon color="#10b981" size={18} />
                  ) : (
                    <AlertIcon color="#ef4444" size={18} />
                  )}
                  <Text style={[
                    styles.alertText,
                    isSuccess ? { color: "#a7f3d0" } : { color: "#fca5a5" }
                  ]}>
                    {message}
                  </Text>
                </View>
              ) : null}

              <Button title="Save Profile Modifications" onPress={() => void save()} />
            </View>
          </Card>
        </View>
      </Page>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  layout: {
    marginTop: 12,
    width: "100%",
  },
  formCard: {
    padding: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingBottom: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  fieldsGroup: {
    gap: 8,
  },
  rowFields: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },
  academicWrapper: {
    backgroundColor: "rgba(2, 6, 23, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 18,
    padding: 20,
    marginVertical: 12,
    gap: 14,
  },
  academicHeader: {
    color: "#6366f1",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
  },
  alertSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  alertError: {
    backgroundColor: "rgba(239, 68, 68, 0.06)",
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  alertText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },

  /* ==================== DEVELOPER CONFIG TERMINAL STYLES ==================== */
  terminalWrapper: {
    backgroundColor: "#020617",
    borderColor: "rgba(6, 182, 212, 0.15)",
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 16,
    padding: 0,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 30px 0 rgba(0,0,0,0.6)",
      }
    })
  } as any,
  terminalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#0f172a",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
  },
  windowControls: {
    flexDirection: "row",
    gap: 6,
  },
  controlDot: {
    width: 10,
    height: 10,
    borderRadius: 99,
  },
  terminalTitle: {
    color: "#4f5b70",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 11,
    fontWeight: "800",
  },
  terminalBody: {
    padding: 18,
    gap: 8,
  },
  codeLine: {
    flexDirection: "row",
    alignItems: "center",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  lineNumber: {
    color: "#334155",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 12,
    marginRight: 10,
  },
  syntaxBrace: {
    color: "#cbd5e1",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 13,
    fontWeight: "700",
  },
  syntaxKey: {
    color: "#06b6d4",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 13,
    fontWeight: "700",
  },
  syntaxColon: {
    color: "#94a3b8",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 13,
  },
  syntaxComma: {
    color: "#94a3b8",
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 13,
  },
  terminalInput: {
    backgroundColor: "rgba(6, 182, 212, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.15)",
    borderRadius: 6,
    color: "#10b981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontFamily: Platform.OS === "web" ? "Courier New, monospace" : "monospace",
    fontSize: 13,
    fontWeight: "700",
    marginLeft: 6,
    minWidth: 160,
    outlineStyle: "none",
  } as any,
});
