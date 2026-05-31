import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, Pressable, Platform } from "react-native";
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
  const { api, accessToken, user, booting } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [error, setError] = useState("");
  
  // Redirect lecturers to the dedicated portal
  useEffect(() => {
    if (user?.role === "lecturer") {
      router.replace("/lecturer-dashboard");
    }
  }, [user?.role]);

  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [consultations, setConsultations] = useState<ConsultationLog[]>([]);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  useEffect(() => {
    if (booting || !accessToken) return;

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
    } else if (user?.role === "student") {
      api<{ data: ConsultationLog[] }>("/consultations")
        .then((res) => setConsultations(res.data))
        .catch(console.error);
    }
  }, [api, booting, accessToken, user?.role]);

  // Real-time sync via WebSocket for both Student and Lecturer Dashboard (laravel Reverb/Echo style)
  useEffect(() => {
    if (!accessToken || consultations.length === 0) {
      return;
    }

    const socket = new WebSocket(`${API_URL.replace("http", "ws")}/ws?token=${accessToken}`);
    
    socket.onopen = () => {
      // Subscribe to all consultation rooms
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
                        ? { ...item, status: payload.data.status, category: payload.data.category ?? item.category }
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
  }, [accessToken, consultations.length, api]);

  // Helper to determine student's pending items
  const getStudentStatus = (studentId: number) => {
    const studentLogs = consultations.filter(c => c.student_id === studentId);
    if (!studentLogs.length) return "NO SUBMISSIONS";
    
    let hasPending = false;
    studentLogs.forEach(log => {
      if (log.feedback_items?.some(item => item.status === "Pending" || item.status === "Fixed")) {
        hasPending = true;
      }
    });
    return hasPending ? "NEW SUBMISSIONS" : "ALL CLEAR";
  };

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        <Heading
          title={user?.role === "lecturer" ? "Academic Evaluation Portal" : "Academic Progress Dashboard"}
          subtitle={
            user?.role === "lecturer" 
              ? "Centralized oversight of student bimbingan logs, revision draft validations, and thesis milestones tracking."
              : "Monitor thesis draft consultations progress, manage assigned revision tasks, and review formal advisings."
          }
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#DC2626" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* 4-Column Grid Metric stats */}
        <View style={styles.statsGrid}>
          {user?.role === "student" ? (
            <>
              <StatCard 
                label="Approved Sessions" 
                value={stats ? Math.max(0, stats.total_consultations - (stats.pending_feedback > 0 ? 1 : 0)) : "0"} 
                glowColor="#059669"
              />
              <StatCard 
                label="Pending Revisions" 
                value={stats?.pending_feedback ?? "0"} 
                glowColor="#DC2626"
              />
              <StatCard 
                label="Completion Rate" 
                value={stats ? `${stats.completion_rate}%` : "0%"} 
                glowColor="#6366F1"
              />
              <StatCard 
                label="Total Document Drafts" 
                value={stats?.draft_count ?? "0"} 
                glowColor="#4F46E5"
              />
            </>
          ) : (
            <>
              <StatCard 
                label="Total Consultations" 
                value={stats?.total_consultations ?? "0"} 
                glowColor="#4F46E5"
              />
              <StatCard 
                label="Validation Queue" 
                value={stats?.pending_feedback ?? "0"} 
                glowColor="#D97706"
              />
              <StatCard 
                label="Average Completion" 
                value={stats ? `${stats.completion_rate}%` : "0%"} 
                glowColor="#6366F1"
              />
              <StatCard 
                label="Active Students" 
                value={stats?.student_count ?? "0"} 
                glowColor="#3B82F6"
              />
            </>
          )}
        </View>

        {user?.role === "student" ? (
          /* Student View: Core Task Log Card */
          <Card style={styles.questCard}>
            <View style={styles.questHeader}>
              <AIGatewayIcon color="#4F46E5" size={20} />
              <Text style={styles.questTitle}>Active Revision Tasks</Text>
            </View>
            
            <View style={styles.questList}>
              {stats?.upcoming_quests?.length ? (
                stats.upcoming_quests.map((item) => {
                  const isValidated = item.status.toLowerCase().includes("validated");
                  const isFixed = item.status.toLowerCase().includes("fixed");

                  return (
                    <View key={item.id} style={styles.questItem}>
                      <View style={styles.questMeta}>
                          <Badge 
                          text={`${item.category} • ${isFixed ? "SUBMITTED FOR REVIEW" : isValidated ? "APPROVED & VALIDATED" : "PENDING REVISION"}`} 
                          color={isValidated ? "#059669" : isFixed ? "#0891B2" : "#D97706"} 
                        />
                        <View style={styles.iconIndicator}>
                          {isValidated ? (
                            <CheckCircleIcon color="#059669" size={16} />
                          ) : isFixed ? (
                            <ClockIcon color="#0891B2" size={16} />
                          ) : (
                            <ClockIcon color="#D97706" size={16} />
                          )}
                          <Text style={[
                            styles.indicatorText,
                            isValidated ? { color: "#059669" } : isFixed ? { color: "#0891B2" } : { color: "#D97706" }
                          ]}>
                            {isValidated ? "APPROVED & VALIDATED" : isFixed ? "Awaiting Validation" : "Pending Execution"}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.questContent}>{item.content}</Text>
                    </View>
                  );
                })
              ) : (
                <View style={styles.emptyContainer}>
                  <CheckCircleIcon color="#0F766E" size={24} />
                  <Text style={styles.emptyText}>No active revision tasks at this time.</Text>
                </View>
              )}
            </View>
          </Card>
        ) : (
          /* Lecturer View: Supervised Students modular grid */
          <Card style={styles.questCard}>
            <View style={styles.questHeader}>
              <ProfileIcon color="#3B82F6" size={20} />
              <Text style={styles.questTitle}>Active Supervised Students</Text>
            </View>
 
            <View style={styles.studentGrid}>
              {students.map((student) => {
                const status = getStudentStatus(student.id);
                const isHovered = hoveredCard === student.id;
                const statusColor = status === "NEW SUBMISSIONS" ? "#0891B2" : status === "ALL CLEAR" ? "#059669" : "#6366F1";

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
                        <ProfileIcon color="#6366F1" size={20} />
                      </View>
                      <Badge text={status} color={statusColor} />
                    </View>

                    <Text style={styles.studentName}>{student.name}</Text>
                    <Text style={styles.studentNim}>ID. {student.nim} • {student.prodi}</Text>
                    
                    <View style={styles.thesisContainer}>
                      <ArchiveIcon color="#94A3B8" size={14} style={{ marginTop: 2 }} />
                      <Text style={styles.studentThesis} numberOfLines={2}>
                        {student.thesis_title || "Research title not registered yet."}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}

              {!students.length && (
                <View style={styles.emptyContainer}>
                  <ProfileIcon color="#6366F1" size={32} />
                  <Text style={styles.emptyText}>No supervised students currently assigned.</Text>
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
    backgroundColor: "rgba(239, 68, 68, 0.05)",
    borderColor: "rgba(239, 68, 68, 0.15)",
    padding: 16,
  },
  errorText: {
    color: "#DC2626",
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
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 16,
    marginBottom: 24,
  },
  questTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  questList: {
    gap: 14,
  },
  questItem: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
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
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1,
  },
  questContent: {
    color: "#CBD5E1",
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
    color: "#94A3B8",
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
    borderColor: "rgba(255, 255, 255, 0.06)",
    gap: 14,
    padding: 22,
  } as any,
  studentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  avatarWrap: {
    width: 40,
    height: 40,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.10)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  studentName: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  studentNim: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: -8,
  },
  thesisContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  studentThesis: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    flex: 1,
    fontWeight: "500",
  },
});
