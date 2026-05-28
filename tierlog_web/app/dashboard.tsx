import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";
import { router } from "expo-router";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Card, Heading, Page, StatCard, Badge } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import { API_URL } from "@/src/lib/config";
import type { DashboardStats, StudentProfile, ConsultationLog } from "@/src/types";
import { 
  AIGatewayIcon, 
  CheckCircleIcon, 
  ClockIcon, 
  AlertIcon, 
  ProfileIcon, 
  ArchiveIcon 
} from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";

export default function DashboardScreen() {
  const { api, accessToken, user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  
  // Redirect lecturers to the dedicated portal
  useEffect(() => {
    if (user?.role === "lecturer") {
      router.replace("/lecturer-dashboard");
    }
  }, [user?.role]);

  // Lecturer specific states (kept for graceful fallback)
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [consultations, setConsultations] = useState<ConsultationLog[]>([]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    api<DashboardStats>("/dashboard/stats")
      .then(setStats)
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats"));

    if (user?.role === "lecturer") {
      api<{ data: StudentProfile[] }>("/lecturer/students")
        .then((res) => setStudents(res.data))
        .catch(console.error);

      api<{ data: ConsultationLog[] }>("/lecturer/consultations")
        .then((res) => setConsultations(res.data))
        .catch(console.error);
    }
  }, [api, user?.role]);

  // Real-time sync via WebSocket for Lecturer Dashboard (laravel Reverb/Echo style)
  useEffect(() => {
    if (!accessToken || consultations.length === 0 || user?.role !== "lecturer") {
      return;
    }

    const socket = new WebSocket(`${API_URL.replace("http", "ws")}/ws?token=${accessToken}`);
    
    socket.onopen = () => {
      // Subscribe to all supervised student consultation rooms
      consultations.forEach((log) => {
        socket.send(JSON.stringify({ action: "subscribe", room: `consultation.${log.id}` }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { event: string; data: any };
        if (payload.event === "feedback.status-updated") {
          // 1. Update active student consultation status in real-time
          setConsultations((current) =>
            current.map((log) =>
              log.id !== payload.data.log_id
                ? log
                : {
                    ...log,
                    feedback_items: log.feedback_items.map((item) =>
                      item.id === payload.data.feedback_id
                        ? { ...item, status: payload.data.status }
                        : item
                    ),
                  }
            )
          );

          // 2. Refetch statistics automatically to sync counters instantly
          api<DashboardStats>("/dashboard/stats")
            .then(setStats)
            .catch(console.error);
        }
      } catch (err) {
        console.error("Failed to parse websocket message:", err);
      }
    };

    return () => {
      socket.close();
    };
  }, [accessToken, consultations.length, user?.role, api]);

  // Helper to determine student's pending items
  const getStudentStatus = (studentId: number) => {
    const studentLogs = consultations.filter(c => c.student_id === studentId);
    if (!studentLogs.length) return "NO SUBMISSIONS";
    
    // Check if there are any pending feedback items across all logs of this student
    let hasPending = false;
    studentLogs.forEach(log => {
      if (log.feedback_items?.some(item => item.status === "Pending" || item.status === "Fixed")) {
        hasPending = true;
      }
    });
    return hasPending ? "NEW DRAFTS" : "ALL CLEAR";
  };

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        {/* Dynamic header customized per role */}
        <Heading
          title={user?.role === "lecturer" ? "Lecturer Portal" : "Student Dashboard"}
          subtitle={
            user?.role === "lecturer" 
              ? "Centralized management of active student guidance, feedback validation, and thesis progress tracking."
              : "Synchronize guidance metrics, verify draft statuses, and consult with the AI academic assistant."
          }
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#ef4444" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* 4-Column Grid Metric stats (customized per role) */}
        <View style={styles.statsGrid}>
          {user?.role === "student" ? (
            <>
              <StatCard 
                label="Approved Sessions" 
                value={stats ? Math.max(0, stats.total_consultations - (stats.pending_feedback > 0 ? 1 : 0)) : "0"} 
                glowColor="#10b981"
              />
              <StatCard 
                label="Pending Revisions" 
                value={stats?.pending_feedback ?? "0"} 
                glowColor="#ef4444"
              />
              <StatCard 
                label="Completion Rate" 
                value={stats ? `${stats.completion_rate}%` : "0%"} 
                glowColor="#f59e0b"
              />
              <StatCard 
                label="Total Drafts" 
                value={stats?.draft_count ?? "0"} 
                glowColor="#6366f1"
              />
            </>
          ) : (
            <>
              <StatCard 
                label="Total Sessions" 
                value={stats?.total_consultations ?? "0"} 
                glowColor="#6366f1"
              />
              <StatCard 
                label="Validation Queue" 
                value={stats?.pending_feedback ?? "0"} 
                glowColor="#f59e0b"
              />
              <StatCard 
                label="Average Completion" 
                value={stats ? `${stats.completion_rate}%` : "0%"} 
                glowColor="#10b981"
              />
              <StatCard 
                label="Active Students" 
                value={stats?.student_count ?? "0"} 
                glowColor="#06b6d4"
              />
            </>
          )}
        </View>

        {user?.role === "student" ? (
          /* Student View: Core Quest Log Card */
          <Card style={styles.questCard}>
            <View style={styles.questHeader}>
              <AIGatewayIcon color="#6366f1" size={20} />
              <Text style={styles.questTitle}>Active Logbook & Revision Tasks</Text>
            </View>
            
            <View style={styles.questList}>
              {stats?.upcoming_quests?.length ? (
                stats.upcoming_quests.map((item) => {
                  const isCompleted = item.status.toLowerCase().includes("fixed") || item.status.toLowerCase().includes("validated");
                  const isPending = item.status.toLowerCase().includes("pending");

                  return (
                    <View key={item.id} style={styles.questItem}>
                      <View style={styles.questMeta}>
                        <Badge text={`${item.category} • ${item.status}`} />
                        <View style={styles.iconIndicator}>
                          {isCompleted ? (
                            <CheckCircleIcon color="#10b981" size={16} />
                          ) : isPending ? (
                            <ClockIcon color="#f59e0b" size={16} />
                          ) : (
                            <AlertIcon color="#6366f1" size={16} />
                          )}
                          <Text style={[
                            styles.indicatorText,
                            isCompleted ? { color: "#10b981" } : isPending ? { color: "#f59e0b" } : { color: "#6366f1" }
                          ]}>
                            {item.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.questContent}>{item.content}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <CheckCircleIcon color="#10b981" size={24} />
                  <Text style={styles.emptyText}>All tasks completed. No pending revisions at this time.</Text>
                </View>
              )}
            </View>
          </Card>
        ) : (
          /* Lecturer View: Supervised Students modular grid */
          <Card style={styles.questCard}>
            <View style={styles.questHeader}>
              <ProfileIcon color="#06b6d4" size={20} />
              <Text style={styles.questTitle}>Active Advised Students</Text>
            </View>
 
            <View style={styles.studentGrid}>
              {students.map((student) => {
                const status = getStudentStatus(student.id);
                const isHovered = hoveredCard === student.id;
                const statusColor = status === "NEW DRAFTS" ? "#06b6d4" : status === "ALL CLEAR" ? "#10b981" : "#64748b";

                return (
                  <Pressable
                    key={student.id}
                    onHoverIn={Platform.OS === "web" ? () => setHoveredCard(student.id) : undefined}
                    onHoverOut={Platform.OS === "web" ? () => setHoveredCard(null) : undefined}
                    style={({ pressed }) => [
                      getGlassStyle(isHovered ? 0.35 : 0.2, 16) as any,
                      styles.studentCard,
                      isHovered && (getGlowStyle(statusColor, 0.15) as any),
                      {
                        transform: [{ scale: pressed ? 0.98 : isHovered ? 1.01 : 1 }],
                      }
                    ]}
                  >
                    <View style={styles.studentHeader}>
                      <View style={styles.avatarWrap}>
                        <ProfileIcon color="#94a3b8" size={24} />
                      </View>
                      <Badge text={status} color={statusColor} />
                    </View>

                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentNim}>NIM. {student.nim} • {student.prodi}</Text>
                    
                    <View style={styles.thesisContainer}>
                      <ArchiveIcon color="#475569" size={14} style={{ marginTop: 2 }} />
                      <Text style={styles.studentThesis} numberOfLines={2}>
                        {student.thesis_title || "No thesis title uploaded yet."}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {!students.length && (
                <View style={styles.emptyContainer}>
                  <ProfileIcon color="#475569" size={32} />
                  <Text style={styles.emptyText}>No active students found under your supervision.</Text>
                </View>
              )}
            </View>
          </Card>
        )}
      </Page>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderColor: "rgba(239, 68, 68, 0.2)",
    padding: 16,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
    width: "100%",
  },
  questCard: {
    padding: 28,
  },
  questHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingBottom: 16,
    marginBottom: 24,
  },
  questTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  questList: {
    gap: 14,
  },
  questItem: {
    backgroundColor: "rgba(2, 6, 23, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    transition: "all 0.2s ease-in-out",
  } as any,
  questMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  iconIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  indicatorText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1,
  },
  questContent: {
    color: "#cbd5e1",
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
  },
  emptyContainer: {
    paddingVertical: 50,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  emptyText: {
    color: "#64748b",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  studentGrid: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
    width: "100%",
  },
  studentCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: "48%",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    gap: 14,
    padding: 22,
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  } as any,
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarWrap: {
    width: 42,
    height: 42,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
  },
  studentName: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  studentNim: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: -8,
  },
  thesisContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  studentThesis: {
    color: "#cbd5e1",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
});
