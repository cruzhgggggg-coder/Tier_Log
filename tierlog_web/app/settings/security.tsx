import React, { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Button, Card, Field, Heading, Page } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { SecurityIcon, CheckCircleIcon, AlertIcon } from "@/src/components/icons";

export default function SecurityScreen() {
  const { api } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(true);

  const save = async () => {
    if (!currentPassword || !password) {
      setMessage("All password fields are required.");
      setIsSuccess(false);
      return;
    }
    try {
      const response = await api<{ message: string }>("/settings/password", {
        method: "PUT",
        body: JSON.stringify({ current_password: currentPassword, password }),
      });
      setMessage(response.message);
      setIsSuccess(true);
      setCurrentPassword("");
      setPassword("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update password");
      setIsSuccess(false);
    }
  };

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        <Heading 
          title="Security Center" 
          subtitle="Manage your account password and security settings." 
        />

        <View style={styles.layout}>
          {/* Left Column: Security Guide */}
          <View style={styles.infoColumn}>
            <View style={styles.shieldBadge}>
              <SecurityIcon color="#059669" size={16} />
              <Text style={styles.shieldText}>ENCRYPTION ACTIVE</Text>
            </View>
            <Text style={styles.infoTitle}>Password Security</Text>
            <Text style={styles.infoDesc}>
              All passwords are securely hashed before storage. Your credentials are never stored in plain text.
            </Text>
            <View style={styles.securityPoint}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>Minimum requirement: 6 characters.</Text>
            </View>
            <View style={styles.securityPoint}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>All requests are authenticated via secure tokens over HTTPS.</Text>
            </View>
          </View>

          {/* Right Column: Change Password Card */}
          <View style={styles.formColumn}>
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <SecurityIcon color="#4F46E5" size={20} />
                <Text style={styles.cardTitle}>Update Credentials</Text>
              </View>

              <View style={styles.form}>
                <Field
                  label="Current Password"
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChangeText={setCurrentPassword}
                  secureTextEntry
                />
                <Field
                  label="New Password"
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />

                {message ? (
                  <View style={[
                    styles.alertBox,
                    isSuccess ? styles.alertSuccess : styles.alertError
                  ]}>
                    {isSuccess ? (
                      <CheckCircleIcon color="#059669" size={18} />
                    ) : (
                      <AlertIcon color="#DC2626" size={18} />
                    )}
                    <Text style={[
                      styles.alertText,
                      isSuccess ? { color: "#059669" } : { color: "#DC2626" }
                    ]}>
                      {message}
                    </Text>
                  </View>
                ) : null}

                <Button title="Update Password" onPress={() => void save()} />
              </View>
            </Card>
          </View>
        </View>
      </Page>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  layout: {
    flexDirection: "row",
    gap: 32,
    flexWrap: "wrap",
    alignItems: "flex-start",
    marginTop: 12,
  },
  infoColumn: {
    flex: 1,
    minWidth: 300,
    gap: 16,
  },
  shieldBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  shieldText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  infoTitle: {
    color: "#F8FAFC", // Titanium White
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  infoDesc: {
    color: "#94A3B8", // Soothing Slate Silver
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  securityPoint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "#6366F1", // Neon Indigo accent
  },
  bulletText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  formColumn: {
    flex: 1.2,
    minWidth: 320,
  },
  card: {
    padding: 32,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingBottom: 16,
    marginBottom: 24,
  },
  cardTitle: {
    color: "#F8FAFC", // Titanium White
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  form: {
    gap: 8,
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
    backgroundColor: "rgba(5, 150, 105, 0.06)",
    borderColor: "rgba(5, 150, 105, 0.2)",
  },
  alertError: {
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
  alertText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
});
