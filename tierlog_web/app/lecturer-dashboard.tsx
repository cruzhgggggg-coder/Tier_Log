import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Badge, Button, Card, Heading, Page, StatCard } from "@/src/components/ui";
import { API_URL } from "@/src/lib/config";
import { useAuth } from "@/src/providers/AuthProvider";
import type { ConsultationLog, DashboardStats, FeedbackItem, StudentProfile } from "@/src/types";
import {
  AlertIcon,
  ArchiveIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  ClockIcon,
  ProfileIcon,
} from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";

// ─── types ──────────────────────────────────────────────────────────────────

type PanelView = "overview" | "revisions" | "sessions" | "chat";

interface StudentPanelState {
  studentId: number;
  view: PanelView;
}

// ─── helpers ────────────────────────────────────────────────────────────────

function getStudentStats(studentId: number, logs: ConsultationLog[]) {
  const studentLogs = logs.filter((l) => l.student_id === studentId);
  let pending = 0;
  let fixed = 0;
  let validated = 0;

  studentLogs.forEach((log) => {
    (log.feedback_items ?? []).forEach((f) => {
      if (f.status === "Pending") pending++;
      else if (f.status === "Fixed") fixed++;
      else if (f.status === "Validated") validated++;
    });
  });

  return { sessions: studentLogs.length, pending, fixed, validated };
}

function statusColor(pending: number, sessions: number) {
  if (sessions === 0) return "#475569";
  if (pending > 0) return "#D97706";
  return "#059669";
}

function statusLabel(pending: number, sessions: number) {
  if (sessions === 0) return "NO SESSIONS";
  if (pending > 0) return `${pending} PENDING`;
  return "ALL CLEAR";
}

// ─── sub-components ─────────────────────────────────────────────────────────

function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={sectionHeaderStyles.wrap}>
      {icon}
      <Text style={sectionHeaderStyles.title}>{title}</Text>
    </View>
  );
}

const sectionHeaderStyles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingBottom: 16,
    marginBottom: 20,
  },
  title: {
    color: "#F8FAFC", // Titanium White
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
});

type TypingIndicatorProps = {
  label?: string;
  color?: string;
};

// --- Beautiful Pulsating typing animation component for Direct Chat ---
const TypingIndicator = ({ label = "SENDING MESSAGE", color = "#0891B2" }: TypingIndicatorProps) => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (dot: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 350,
            useNativeDriver: Platform.OS !== "web",
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 350,
            useNativeDriver: Platform.OS !== "web",
          }),
        ])
      );
    };

    const anim1 = createAnimation(dot1, 0);
    const anim2 = createAnimation(dot2, 100);
    const anim3 = createAnimation(dot3, 200);

    anim1.start();
    anim2.start();
    anim3.start();

    return () => {
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, [dot1, dot2, dot3]);

  const getInterpolatedStyle = (dot: Animated.Value) => {
    return {
      opacity: dot.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 1],
      }),
      transform: [
        {
          translateY: dot.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -3],
          }),
        },
      ],
    };
  };

  return (
    <View style={[
      {
        padding: 12,
        borderRadius: 14,
        maxWidth: "85%",
        gap: 5,
        backgroundColor: "rgba(255, 255, 255, 0.04)",
        borderWidth: 1,
        borderColor: "rgba(255, 255, 255, 0.08)",
        alignSelf: "flex-start",
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        paddingHorizontal: 14
      },
      getGlowStyle(color, 0.05) as any
    ]}>
      <Text style={{ color: color, marginRight: 4, letterSpacing: 0.8, fontSize: 9, fontWeight: "900" }}>{label}</Text>
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot1)]} />
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot2)]} />
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot3)]} />
    </View>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

export default function LecturerDashboardScreen() {
  const { api, accessToken, user, booting } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [error, setError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [panelView, setPanelView] = useState<PanelView>("overview");
  const [hoveredStudentId, setHoveredStudentId] = useState<number | null>(null);

  // Floating Toast Notifications State
  const [toasts, setToasts] = useState<Array<{ id: string; title: string; message: string; type: "chat" | "revision" | "system"; animatedValue: Animated.Value }>>([]);

  const showToast = (title: string, message: string, type: "chat" | "revision" | "system") => {
    const id = Math.random().toString(36).substring(7);
    const anim = new Animated.Value(0);
    
    setToasts(prev => [...prev, { id, title, message, type, animatedValue: anim }]);
    
    Animated.timing(anim, {
      toValue: 1,
      duration: 350,
      useNativeDriver: Platform.OS !== "web",
    }).start();
    
    setTimeout(() => {
      Animated.timing(anim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: Platform.OS !== "web",
      }).start(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      });
    }, 4500);
  };

  // Realtime Peer Direct Chat states
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [chatQuery, setChatQuery] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);

  // Feedback quick-add state
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSuccess, setFeedbackSuccess] = useState("");
  const [feedbackError, setFeedbackError] = useState("");
  const [composerCategory, setComposerCategory] = useState<"Auto" | "Major" | "Minor">("Auto");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Validation action state
  const [validatingId, setValidatingId] = useState<number | null>(null);

  // ── data fetch ──────────────────────────────────────────────────────────
  const loadAll = async () => {
    const [s, st, lg] = await Promise.all([
      api<DashboardStats>("/dashboard/stats"),
      api<{ data: StudentProfile[] }>("/lecturer/students"),
      api<{ data: ConsultationLog[] }>("/lecturer/consultations"),
    ]);
    setStats(s);
    setStudents(st.data);
    setLogs(lg.data);
    if (!selectedStudentId && st.data.length > 0) {
      setSelectedStudentId(st.data[0].id);
    }
  };

  useEffect(() => {
    if (booting || !accessToken) return;

    loadAll().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load dashboard data")
    );
  }, [api, booting, accessToken]);

  // ── realtime WebSocket ────────────────────
  useEffect(() => {
    if (!accessToken || logs.length === 0) return;

    const socket = new WebSocket(`${API_URL.replace("http", "ws")}/ws?token=${accessToken}`);

    socket.onopen = () => {
      logs.forEach((log) => {
        socket.send(JSON.stringify({ action: "subscribe", room: `consultation.${log.id}` }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { event: string; data: any };
        if (payload.event === "feedback.status-updated") {
          setLogs((current) =>
            current.map((log) =>
              log.id !== payload.data.log_id
                ? log
                : {
                    ...log,
                    feedback_items: (log.feedback_items ?? []).map((item) =>
                      item.id === payload.data.feedback_id
                        ? { ...item, status: payload.data.status }
                        : item
                    ),
                  }
            )
          );
          // Refresh counters
          api<DashboardStats>("/dashboard/stats").then(setStats).catch(console.error);
          
          if (payload.data.status === "Fixed") {
            const parentLog = logs.find(l => l.id === payload.data.log_id);
            const studentName = parentLog?.student?.name ?? "A student";
            showToast(
              "Revision Fixed by Student 🛠️",
              `${studentName} has marked a revision item as Fixed and submitted it for validation.`,
              "revision"
            );
          }
        }
        if (payload.event === "chat.direct-message") {
          setDirectMessages((current) => {
            if (current.some((m) => m.id === payload.data.id)) return current;
            return [...current, payload.data];
          });
          if (payload.data.sender_role === "student") {
            const studentName = payload.data.sender?.name ?? "Student";
            showToast(`New Message from ${studentName}`, payload.data.content, "chat");
          }
        }
      } catch (e) {
        console.error("WS parse error:", e);
      }
    };

    return () => socket.close();
  }, [accessToken, logs.length, api]);

  // ── derived data ────────────────────────────────────────────────────────
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const selectedStudentLogs = useMemo(
    () => logs.filter((l) => l.student_id === selectedStudentId),
    [logs, selectedStudentId]
  );

  const latestLog = selectedStudentLogs[0] ?? null;

  const pendingAcrossAll = useMemo(
    () => logs.flatMap((l) => (l.feedback_items ?? []).filter((f) => f.status === "Pending")),
    [logs]
  );

  const fixedAwaitingValidation = useMemo(
    () => logs.flatMap((l) => (l.feedback_items ?? []).filter((f) => f.status === "Fixed")),
    [logs]
  );

  // ── actions ─────────────────────────────────────────────────────────────
  const handleValidate = async (feedbackId: number) => {
    setValidatingId(feedbackId);
    setError("");
    const parentLog = logs.find((l) =>
      (l.feedback_items ?? []).some((f) => f.id === feedbackId)
    );
    try {
      await api(`/consultations/feedback/${feedbackId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Validated", log_id: parentLog?.id ?? 0 }),
      });
      setLogs((current) =>
        current.map((log) => ({
          ...log,
          feedback_items: (log.feedback_items ?? []).map((f) =>
            f.id === feedbackId ? { ...f, status: "Validated" } : f
          ),
        }))
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to validate revision item.");
    } finally {
      setValidatingId(null);
    }
  };

  const handleRejectFix = async (feedbackId: number) => {
    setValidatingId(feedbackId);
    setError("");
    const parentLog = logs.find((l) =>
      (l.feedback_items ?? []).some((f) => f.id === feedbackId)
    );
    try {
      await api(`/consultations/feedback/${feedbackId}/status`, {
        method: "PUT",
        body: JSON.stringify({ status: "Pending", log_id: parentLog?.id ?? 0 }),
      });
      setLogs((current) =>
        current.map((log) => ({
          ...log,
          feedback_items: (log.feedback_items ?? []).map((f) =>
            f.id === feedbackId ? { ...f, status: "Pending" } : f
          ),
        }))
      );
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to reject revision fix.");
    } finally {
      setValidatingId(null);
    }
  };

  const handleAddFeedback = async () => {
    if (!latestLog || !feedbackText.trim()) return;
    setSubmittingFeedback(true);
    setFeedbackError("");
    setFeedbackSuccess("");
    try {
      const categoryParam = composerCategory === "Auto" ? "" : composerCategory;
      const res = await api<{ data: FeedbackItem }>(`/consultations/${latestLog.id}/add-feedback`, {
        method: "POST",
        body: JSON.stringify({ 
          content: feedbackText.trim(),
          category: categoryParam
        }),
      });
      setLogs((current) =>
        current.map((log) =>
          log.id !== latestLog.id
            ? log
            : { ...log, feedback_items: [...(log.feedback_items ?? []), res.data] }
        )
      );
      setFeedbackText("");
      setComposerCategory("Auto");
      setFeedbackSuccess("Feedback dispatched successfully.");
      setTimeout(() => setFeedbackSuccess(""), 3000);
    } catch (e) {
      setFeedbackError(e instanceof Error ? e.message : "Failed to add feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const loadDirectMessages = async (logId: number) => {
    try {
      const res = await api<{ data: any[] }>(`/consultations/${logId}/direct-messages`);
      setDirectMessages(res.data);
    } catch (err) {
      console.error("Failed to load direct messages:", err);
    }
  };

  const sendDirectMessage = async () => {
    if (!latestLog || !chatQuery.trim() || chatLoading) return;
    const draft = chatQuery;
    setChatQuery("");
    setChatLoading(true);
    try {
      const response = await api<{ data: any }>(`/consultations/${latestLog.id}/direct-messages`, {
        method: "POST",
        body: JSON.stringify({ content: draft }),
      });
      setDirectMessages((current) => {
        if (current.some((m) => m.id === response.data.id)) return current;
        return [...current, response.data];
      });
    } catch (err) {
      console.error("Failed to send direct message:", err);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (latestLog?.id) {
      void loadDirectMessages(latestLog.id);
    } else {
      setDirectMessages([]);
    }
  }, [latestLog?.id]);

  useEffect(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [directMessages, panelView]);

  return (
    <RequireAuth>
      <View style={{ flex: 1 }}>
        <Page>
          <NavBar />

        <Heading
          title="Supervisor Portal"
          subtitle="Monitor student guidance progress, validate revisions, and dispatch structured feedback in one centralized workspace."
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#DC2626" size={18} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* ── top stats ── */}
        <View style={styles.statsRow}>
          <StatCard
            label="Active Students"
            value={stats?.student_count ?? students.length}
            glowColor="#4F46E5"
          />
          <StatCard
            label="Pending Revisions"
            value={pendingAcrossAll.length}
            glowColor="#D97706"
          />
          <StatCard
            label="Awaiting Validation"
            value={fixedAwaitingValidation.length}
            glowColor="#0891B2"
          />
          <StatCard
            label="Avg. Completion"
            value={stats ? `${stats.completion_rate}%` : "0%"}
            glowColor="#059669"
          />
        </View>

        {/* ── two-column workspace ── */}
        <View style={styles.workspace}>
          {/* ── LEFT: Student Roster ── */}
          <Card style={styles.rosterCard}>
            <SectionHeader
              icon={<ProfileIcon color="#4F46E5" size={18} />}
              title="Student Roster"
            />

            <View style={styles.rosterList}>
              {students.length === 0 && (
                <View style={styles.empty}>
                  <ProfileIcon color="#64748B" size={28} />
                  <Text style={styles.emptyText}>No supervised students found.</Text>
                </View>
              )}

              {students.map((student) => {
                const { sessions, pending, fixed, validated } = getStudentStats(
                  student.id,
                  logs
                );
                const sc = statusColor(pending, sessions);
                const sl = statusLabel(pending, sessions);
                const isSelected = selectedStudentId === student.id;
                const isHovered = hoveredStudentId === student.id;

                return (
                  <Pressable
                    key={student.id}
                    onPress={() => {
                      setSelectedStudentId(student.id);
                      setPanelView("overview");
                    }}
                    onHoverIn={Platform.OS === "web" ? () => setHoveredStudentId(student.id) : undefined}
                    onHoverOut={Platform.OS === "web" ? () => setHoveredStudentId(null) : undefined}
                    style={({ pressed }) => [
                      styles.rosterItem,
                      isSelected && styles.rosterItemSelected,
                      isSelected && (getGlowStyle("#4F46E5", 0.08) as any),
                      !isSelected && isHovered && styles.rosterItemHovered,
                      { transform: [{ scale: pressed ? 0.985 : 1 }] },
                    ]}
                  >
                    <View style={styles.rosterItemRow}>
                      <View style={[styles.avatarCircle, isSelected && styles.avatarCircleActive]}>
                        <ProfileIcon
                          color={isSelected ? "#ffffff" : "#94A3B8"}
                          size={16}
                        />
                      </View>
                      <View style={styles.rosterItemInfo}>
                        <Text style={[styles.rosterName, isSelected && { color: "#ffffff" }]} numberOfLines={1}>
                          {student.name}
                        </Text>
                        <Text style={styles.rosterNim}>Student ID: {student.nim}</Text>
                      </View>
                      <Badge text={sl} color={sc} />
                    </View>

                    <View style={styles.rosterStats}>
                      <View style={styles.rosterStat}>
                        <Text style={styles.rosterStatVal}>{sessions}</Text>
                        <Text style={styles.rosterStatLabel}>Sessions</Text>
                      </View>
                      <View style={styles.rosterStat}>
                        <Text style={[styles.rosterStatVal, pending > 0 && { color: "#D97706" }]}>
                          {pending}
                        </Text>
                        <Text style={styles.rosterStatLabel}>Pending</Text>
                      </View>
                      <View style={styles.rosterStat}>
                        <Text style={[styles.rosterStatVal, fixed > 0 && { color: "#0891B2" }]}>
                          {fixed}
                        </Text>
                        <Text style={styles.rosterStatLabel}>To Validate</Text>
                      </View>
                      <View style={styles.rosterStat}>
                        <Text style={[styles.rosterStatVal, validated > 0 && { color: "#059669" }]}>
                          {validated}
                        </Text>
                        <Text style={styles.rosterStatLabel}>Validated</Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </Card>

          {/* ── RIGHT: Student Detail Panel ── */}
          <View style={styles.detailCol}>
            {selectedStudent ? (
              <>
                <Card style={styles.studentHeaderCard}>
                  <View style={styles.studentHeaderRow}>
                    <View style={styles.avatarLarge}>
                      <ProfileIcon color="#6366F1" size={28} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.studentName}>{selectedStudent.name}</Text>
                      <Text style={styles.studentMeta}>
                        Student ID: {selectedStudent.nim} · Department: {selectedStudent.prodi}
                      </Text>
                    </View>
                    {(() => {
                      const { sessions, pending } = getStudentStats(selectedStudent.id, logs);
                      const sc = statusColor(pending, sessions);
                      const sl = statusLabel(pending, sessions);
                      return <Badge text={sl} color={sc} />;
                    })()}
                  </View>

                  {/* Thesis title */}
                  <View style={styles.thesisBox}>
                    <ArchiveIcon color="#94A3B8" size={13} />
                    <Text style={styles.thesisText} numberOfLines={3}>
                      {selectedStudent.thesis_title || "No thesis title recorded yet."}
                    </Text>
                  </View>

                  {/* Panel tabs */}
                  <View style={styles.tabRow}>
                    {(["overview", "revisions", "sessions", "chat"] as PanelView[]).map((tab) => (
                      <Pressable
                        key={tab}
                        onPress={() => setPanelView(tab)}
                        style={[styles.tab, panelView === tab && styles.tabActive]}
                      >
                        <Text
                          style={[
                            styles.tabText,
                            panelView === tab && styles.tabTextActive,
                          ]}
                        >
                          {tab === "overview"
                            ? "Overview"
                            : tab === "revisions"
                            ? "Revisions"
                            : tab === "sessions"
                            ? "Sessions"
                            : "Advisor Chat"}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </Card>

                {/* ── TAB: OVERVIEW ── */}
                {panelView === "overview" && (
                  <Card style={styles.panelCard}>
                    <SectionHeader
                      icon={<CheckCircleIcon color="#059669" size={16} />}
                      title="Guidance Progress"
                    />
                    {(() => {
                      const { sessions, pending, fixed, validated } = getStudentStats(
                        selectedStudent.id,
                        logs
                      );
                      const total = pending + fixed + validated;
                      const completionPct = total > 0 ? Math.round((validated / total) * 100) : 0;

                      return (
                        <>
                          <View style={styles.progressRow}>
                            {[
                              { label: "Total Sessions", val: sessions, color: "#4F46E5" },
                              { label: "Pending", val: pending, color: "#D97706" },
                              { label: "Awaiting Validation", val: fixed, color: "#0891B2" },
                              { label: "Validated", val: validated, color: "#059669" },
                            ].map((item) => (
                              <View key={item.label} style={styles.progressItem}>
                                <Text
                                  style={[styles.progressVal, { color: item.color }]}
                                >
                                  {item.val}
                                </Text>
                                <Text style={styles.progressLabel}>{item.label}</Text>
                              </View>
                            ))}
                          </View>

                          {/* Completion bar */}
                          <View style={styles.barWrap}>
                            <View style={styles.barTrack}>
                              <View
                                style={[
                                  styles.barFill,
                                  { width: `${completionPct}%` as any },
                                ]}
                              />
                            </View>
                            <Text style={styles.barLabel}>{completionPct}% revisions validated</Text>
                          </View>

                          {/* Latest session snapshot */}
                          {latestLog && (
                            <View style={styles.snapshotBox}>
                              <Text style={styles.snapshotLabel}>LATEST SESSION</Text>
                              <Text style={styles.snapshotDate}>
                                {new Date(latestLog.created_at).toLocaleDateString("en-US", {
                                  weekday: "short",
                                  year: "numeric",
                                  month: "short",
                                  day: "numeric",
                                })}
                              </Text>
                              {latestLog.transcript_text ? (
                                <Text style={styles.snapshotText} numberOfLines={4}>
                                  {latestLog.transcript_text}
                                </Text>
                              ) : (
                                <Text style={styles.snapshotEmpty}>
                                  No transcript available for this session.
                                </Text>
                              )}
                            </View>
                          )}
                        </>
                      );
                    })()}
                  </Card>
                )}

                {/* ── TAB: REVISIONS ── */}
                {panelView === "revisions" && (
                  <Card style={styles.panelCard}>
                    <SectionHeader
                      icon={<ClockIcon color="#D97706" size={16} />}
                      title="Revision Items"
                    />

                    {/* Quick-add feedback */}
                    <View style={styles.feedbackComposer}>
                      <Text style={styles.composerLabel}>DISPATCH FEEDBACK</Text>
                      <Text style={styles.composerSubLabel}>
                        Type your feedback below. The student will organize and classify this using their AI Oracle.
                      </Text>

                      <TextInput
                        value={feedbackText}
                        onChangeText={setFeedbackText}
                        placeholder="Describe the revision requirement in detail (e.g., 'Expand literature review background' or 'Correct citation formatting guidelines')."
                        placeholderTextColor="#475569"
                        multiline
                        numberOfLines={3}
                        style={styles.feedbackInput}
                      />

                      {feedbackSuccess ? (
                        <Text style={styles.feedbackSuccessText}>{feedbackSuccess}</Text>
                      ) : null}
                      {feedbackError ? (
                        <Text style={styles.feedbackErrorText}>{feedbackError}</Text>
                      ) : null}

                      <Button
                        title={submittingFeedback ? "Dispatching…" : "Dispatch Feedback"}
                        disabled={submittingFeedback || !feedbackText.trim() || !latestLog}
                        onPress={handleAddFeedback}
                        tone="primary"
                      />
                    </View>

                    {/* All feedback items for selected student */}
                    <View style={styles.feedbackList}>
                      {selectedStudentLogs.flatMap((log) =>
                        (log.feedback_items ?? []).map((item) => {
                          const isPending = item.status === "Pending";
                          const isFixed = item.status === "Fixed";
                          const isValidated = item.status === "Validated";
                          const iColor = isPending
                            ? "#D97706"
                            : isFixed
                            ? "#0891B2"
                            : "#059669";

                          return (
                            <View key={item.id} style={styles.feedbackItem}>
                              <View style={styles.feedbackItemHeader}>
                                <Badge
                                  text={`${item.category} · ${item.status}`}
                                  color={iColor}
                                />
                                {isFixed && (
                                  <View style={{ flexDirection: "row", gap: 8 }}>
                                    <Pressable
                                      onPress={() => handleValidate(item.id)}
                                      disabled={validatingId === item.id}
                                      style={({ pressed }) => [
                                        styles.validateBtn,
                                        { opacity: validatingId === item.id ? 0.5 : pressed ? 0.8 : 1 },
                                      ]}
                                    >
                                      <CheckCircleIcon color="#059669" size={14} />
                                      <Text style={styles.validateBtnText}>
                                        {validatingId === item.id ? "Validating…" : "Approve"}
                                      </Text>
                                    </Pressable>
                                    <Pressable
                                      onPress={() => handleRejectFix(item.id)}
                                      disabled={validatingId === item.id}
                                      style={({ pressed }) => [
                                        styles.rejectBtn,
                                        { opacity: validatingId === item.id ? 0.5 : pressed ? 0.8 : 1 },
                                      ]}
                                    >
                                      <AlertIcon color="#DC2626" size={14} />
                                      <Text style={styles.rejectBtnText}>
                                        {validatingId === item.id ? "Rejecting…" : "Reject"}
                                      </Text>
                                    </Pressable>
                                  </View>
                                )}
                                {isValidated && (
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                                    <View style={styles.validatedTag}>
                                      <CheckCircleIcon color="#059669" size={13} />
                                      <Text style={styles.validatedTagText}>Validated</Text>
                                    </View>
                                    <Pressable
                                      onPress={() => handleRejectFix(item.id)}
                                      disabled={validatingId === item.id}
                                      style={({ pressed }) => [
                                        styles.undoBtn,
                                        { opacity: validatingId === item.id ? 0.5 : pressed ? 0.8 : 1 },
                                      ]}
                                    >
                                      <Text style={styles.undoBtnText}>Undo</Text>
                                    </Pressable>
                                  </View>
                                )}
                              </View>
                              <Text style={styles.feedbackItemContent}>{item.content}</Text>
                            </View>
                          );
                        })
                      )}

                      {selectedStudentLogs.every(
                        (l) => (l.feedback_items ?? []).length === 0
                      ) && (
                        <View style={styles.empty}>
                          <CheckCircleIcon color="#059669" size={24} />
                          <Text style={styles.emptyText}>
                            No revision items recorded for this student yet.
                          </Text>
                        </View>
                      )}
                    </View>
                  </Card>
                )}

                {/* ── TAB: SESSIONS ── */}
                {panelView === "sessions" && (
                  <Card style={styles.panelCard}>
                    <SectionHeader
                      icon={<ArchiveIcon color="#0891B2" size={16} />}
                      title="Session History"
                    />

                    {selectedStudentLogs.length === 0 ? (
                      <View style={styles.empty}>
                        <ArchiveIcon color="#64748B" size={28} />
                        <Text style={styles.emptyText}>
                          No consultation sessions recorded yet.
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.sessionList}>
                        {selectedStudentLogs.map((log, idx) => {
                          const totalItems = (log.feedback_items ?? []).length;
                          const pendingItems = (log.feedback_items ?? []).filter(
                            (f) => f.status === "Pending"
                          ).length;
                          const validatedItems = (log.feedback_items ?? []).filter(
                            (f) => f.status === "Validated"
                          ).length;

                          return (
                            <View key={log.id} style={styles.sessionItem}>
                              <View style={styles.sessionItemLeft}>
                                <View style={styles.sessionIndex}>
                                  <Text style={styles.sessionIndexText}>
                                    #{selectedStudentLogs.length - idx}
                                  </Text>
                                </View>
                                {idx < selectedStudentLogs.length - 1 && (
                                  <View style={styles.sessionConnector} />
                                )}
                              </View>

                              <View style={styles.sessionItemContent}>
                                <View style={styles.sessionItemHeader}>
                                  <Text style={styles.sessionDate}>
                                    {new Date(log.created_at).toLocaleDateString("en-US", {
                                      weekday: "short",
                                      month: "short",
                                      day: "numeric",
                                      year: "numeric",
                                    })}
                                  </Text>
                                  <Badge
                                    text={
                                      pendingItems > 0
                                        ? `${pendingItems} Pending`
                                        : validatedItems === totalItems && totalItems > 0
                                        ? "All Validated"
                                        : `${totalItems} Items`
                                    }
                                    color={
                                      pendingItems > 0
                                        ? "#D97706"
                                        : validatedItems === totalItems && totalItems > 0
                                        ? "#059669"
                                        : "#4F46E5"
                                    }
                                  />
                                </View>

                                {log.transcript_text ? (
                                  <Text style={styles.sessionSnippet} numberOfLines={2}>
                                    {log.transcript_text}
                                  </Text>
                                ) : null}

                                <View style={styles.sessionFileMeta}>
                                  {log.audio_filename && (
                                    <View style={styles.sessionFileTag}>
                                      <Text style={styles.sessionFileTagText}>
                                        Audio
                                      </Text>
                                    </View>
                                  )}
                                  {log.paper_filename && (
                                    <View style={styles.sessionFileTag}>
                                      <Text style={styles.sessionFileTagText}>
                                        Paper
                                      </Text>
                                    </View>
                                  )}
                                  <Text style={styles.sessionFeedbackCount}>
                                    {totalItems} feedback item{totalItems !== 1 ? "s" : ""}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </Card>
                )}

                {/* ── TAB: DIRECT CHAT ── */}
                {panelView === "chat" && (
                  <Card style={[styles.panelCard, { height: 500 }]}>
                    <SectionHeader
                      icon={<ClockIcon color="#0891B2" size={16} />}
                      title="Direct Chat Consultation"
                    />
                    {latestLog ? (
                      <View style={{ flex: 1, gap: 10 }}>
                        <ScrollView
                          ref={chatScrollRef}
                          showsVerticalScrollIndicator={true}
                          style={{
                            flex: 1,
                            backgroundColor: "rgba(15, 23, 42, 0.6)",
                            borderWidth: 1,
                            borderColor: "rgba(255, 255, 255, 0.06)",
                            borderRadius: 14,
                            padding: 12,
                          }}
                          {...({ className: "ultra-thin-scroll" } as any)}
                          contentContainerStyle={{ gap: 10, paddingBottom: 8 }}
                        >
                          {directMessages.map((message, index) => {
                            const isUser = message.sender_role === "lecturer";
                            return (
                              <View
                                key={`direct-msg-${message.id || index}`}
                                style={[
                                  {
                                    padding: 12,
                                    borderRadius: 14,
                                    maxWidth: "85%",
                                    gap: 4,
                                  },
                                  isUser
                                    ? {
                                        backgroundColor: "rgba(99, 102, 241, 0.12)",
                                        borderWidth: 1,
                                        borderColor: "rgba(99, 102, 241, 0.22)",
                                        alignSelf: "flex-end",
                                      }
                                    : {
                                        backgroundColor: "rgba(255, 255, 255, 0.04)",
                                        borderWidth: 1,
                                        borderColor: "rgba(255, 255, 255, 0.08)",
                                        alignSelf: "flex-start",
                                      },
                                ]}
                              >
                                <Text
                                  style={{
                                    color: "#94A3B8",
                                    fontSize: 9,
                                    fontWeight: "900",
                                    letterSpacing: 1.5,
                                  }}
                                >
                                  {isUser ? "ADVISOR" : "STUDENT"}
                                </Text>
                                <Text
                                  style={{
                                    color: "#F8FAFC",
                                    fontSize: 13,
                                    lineHeight: 18,
                                    fontWeight: "500",
                                  }}
                                >
                                  {message.content}
                                </Text>
                              </View>
                            );
                          })}
                          {chatLoading && <TypingIndicator label="SENDING MESSAGE" color="#0891B2" />}
                          {!directMessages.length && !chatLoading && (
                            <View style={{ paddingVertical: 60, alignItems: "center" }}>
                              <Text
                                style={{
                                  color: "#94A3B8",
                                  fontSize: 12.5,
                                  fontWeight: "600",
                                  textAlign: "center",
                                  lineHeight: 18,
                                }}
                              >
                                No messages with this student yet. Send a message to start direct consultation.
                              </Text>
                            </View>
                          )}
                        </ScrollView>

                        {/* Input Box */}
                        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
                          <TextInput
                            value={chatQuery}
                            onChangeText={setChatQuery}
                            editable={!chatLoading}
                            placeholder={chatLoading ? "Sending message..." : "Type a message to the student..."}
                            placeholderTextColor="#475569"
                            onSubmitEditing={() => void sendDirectMessage()}
                            style={{
                              flex: 1,
                              backgroundColor: "rgba(255, 255, 255, 0.03)",
                              borderWidth: 1,
                              borderColor: "rgba(255, 255, 255, 0.08)",
                              borderRadius: 12,
                              color: "#F8FAFC",
                              paddingHorizontal: 14,
                              paddingVertical: 12,
                              fontSize: 13,
                              fontWeight: "500",
                              outlineStyle: "none",
                              opacity: chatLoading ? 0.6 : 1,
                            } as any}
                          />
                          <Pressable
                            onPress={() => void sendDirectMessage()}
                            disabled={chatLoading || !chatQuery.trim()}
                            style={{
                              backgroundColor: "#4F46E5",
                              paddingHorizontal: 16,
                              paddingVertical: 12,
                              borderRadius: 12,
                              alignSelf: "stretch",
                              alignItems: "center",
                              justifyContent: "center",
                              opacity: chatLoading || !chatQuery.trim() ? 0.5 : 1,
                            }}
                          >
                            <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>
                              Send
                            </Text>
                          </Pressable>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.empty}>
                        <ArchiveIcon color="#64748B" size={28} />
                        <Text style={styles.emptyText}>
                          No logs found for this student. Messages cannot be sent without an active log.
                        </Text>
                      </View>
                    )}
                  </Card>
                )}
              </>
            ) : (
              <Card style={styles.noSelectionCard}>
                <ProfileIcon color="#64748B" size={40} />
                <Text style={styles.noSelectionText}>
                  Select a student from the roster to view detailed guidance information.
                </Text>
              </Card>
            )}
          </View>
        </View>

        {/* ── bottom: Validation Queue ── */}
        <Card style={styles.validationQueueCard}>
          <SectionHeader
            icon={<AlertIcon color="#0891B2" size={18} />}
            title="Validation Queue — Student Revisions Awaiting Review"
          />

          {fixedAwaitingValidation.length === 0 ? (
            <View style={styles.empty}>
              <CheckCircleIcon color="#059669" size={28} />
              <Text style={styles.emptyText}>
                No revisions awaiting validation. All submissions are up to date.
              </Text>
            </View>
          ) : (
            <View style={styles.queueGrid}>
              {fixedAwaitingValidation.map((item) => {
                const parentLog = logs.find((l) =>
                  (l.feedback_items ?? []).some((f) => f.id === item.id)
                );
                const parentStudent = students.find(
                  (s) => s.id === parentLog?.student_id
                );

                return (
                  <View key={item.id} style={styles.queueItem}>
                    <View style={styles.queueItemHeader}>
                      <View style={styles.queueStudentInfo}>
                        <View style={styles.queueAvatarSmall}>
                          <ProfileIcon color="#64748B" size={12} />
                        </View>
                        <Text style={styles.queueStudentName}>
                          {parentStudent?.name ?? "Unknown Student"}
                        </Text>
                      </View>
                      <Badge text={item.category} color={item.category === "Major" ? "#DC2626" : "#4F46E5"} />
                    </View>
                    <Text style={styles.queueItemContent} numberOfLines={2}>
                      {item.content}
                    </Text>
                    <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                      <Pressable
                        onPress={() => handleValidate(item.id)}
                        disabled={validatingId === item.id}
                        style={({ pressed }) => [
                          styles.validateQueueBtn,
                          { flex: 1, opacity: validatingId === item.id ? 0.5 : pressed ? 0.85 : 1 },
                        ]}
                      >
                        <CheckCircleIcon color="#059669" size={14} />
                        <Text style={styles.validateQueueBtnText}>
                          {validatingId === item.id ? "Validating…" : "Approve Fix"}
                        </Text>
                      </Pressable>

                      <Pressable
                        onPress={() => handleRejectFix(item.id)}
                        disabled={validatingId === item.id}
                        style={({ pressed }) => [
                          styles.rejectQueueBtn,
                          { flex: 1, opacity: validatingId === item.id ? 0.5 : pressed ? 0.85 : 1 },
                        ]}
                      >
                        <AlertIcon color="#DC2626" size={14} />
                        <Text style={styles.rejectQueueBtnText}>
                          {validatingId === item.id ? "Rejecting…" : "Reject Fix"}
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      </Page>
      
      {/* Floating Toast Notification Container (floating over layout) */}
      <View style={{ position: Platform.OS === "web" ? "fixed" : "absolute", top: 80, right: 20, zIndex: 99999, gap: 10, width: 320 }}>
        {toasts.map(toast => {
          const translateAnim = toast.animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [340, 0], // slide from right
          });
          const opacityAnim = toast.animatedValue;
          
          let icon = "🔔";
          let color = "#6366F1";
          if (toast.type === "chat") {
            icon = "💬";
            color = "#0891B2";
          } else if (toast.type === "revision") {
            icon = "✅";
            color = "#059669";
          }
          
          return (
            <Animated.View
              key={toast.id}
              style={[
                {
                  opacity: opacityAnim,
                  transform: [{ translateX: translateAnim }],
                  padding: 16,
                  borderRadius: 14,
                  borderWidth: 1,
                  borderColor: "rgba(255, 255, 255, 0.08)",
                  backgroundColor: "rgba(15, 23, 42, 0.95)",
                  flexDirection: "row",
                  gap: 12,
                  alignItems: "center",
                },
                getGlassStyle(0.2, 14) as any,
                getGlowStyle(color, 0.1) as any,
              ]}
            >
              <Text style={{ fontSize: 20 }}>{icon}</Text>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "800" }}>{toast.title}</Text>
                <Text style={{ color: "#CBD5E1", fontSize: 11, fontWeight: "500" }} numberOfLines={2}>{toast.message}</Text>
              </View>
            </Animated.View>
          );
        })}
      </View>
    </View>
  </RequireAuth>
);
}

// ─── styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  errorCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "rgba(220, 38, 38, 0.15)",
    padding: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
  },

  // Stats row
  statsRow: {
    flexDirection: "row",
    gap: 16,
    flexWrap: "wrap",
  },

  // Main workspace two columns
  workspace: {
    flexDirection: "row",
    gap: 20,
    alignItems: "flex-start",
  },

  // LEFT: roster
  rosterCard: {
    width: 340,
    minWidth: 300,
    padding: 24,
    flexShrink: 0,
  },
  rosterList: {
    gap: 10,
  },
  rosterItem: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 16,
    gap: 12,
    transition: "all 0.25s ease-in-out",
    cursor: "pointer",
  } as any,
  rosterItemSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.25)",
  },
  rosterItemHovered: {
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  rosterItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  avatarCircleActive: {
    backgroundColor: "#6366F1",
    borderColor: "#6366F1",
  },
  rosterItemInfo: {
    flex: 1,
  },
  rosterName: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  rosterNim: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  rosterStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    padding: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  rosterStat: {
    alignItems: "center",
    gap: 2,
  },
  rosterStatVal: {
    color: "#F8FAFC",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  rosterStatLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // RIGHT: detail column
  detailCol: {
    flex: 1,
    gap: 16,
    minWidth: 0,
  },

  studentHeaderCard: {
    padding: 22,
    gap: 16,
  },
  studentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  avatarLarge: {
    width: 52,
    height: 52,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  studentName: {
    color: "#F8FAFC",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  studentMeta: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  thesisBox: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  thesisText: {
    flex: 1,
    color: "#CBD5E1",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    transition: "all 0.2s ease-in-out",
  } as any,
  tabActive: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "rgba(99, 102, 241, 0.15)",
  },
  tabText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  tabTextActive: {
    color: "#6366F1",
  },

  panelCard: {
    padding: 24,
  },

  // Progress overview
  progressRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  progressItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
    minWidth: 70,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  progressVal: {
    color: "#6366F1",
    fontSize: 28,
    fontWeight: "900",
    letterSpacing: -1,
  },
  progressLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    textAlign: "center",
  },
  barWrap: {
    gap: 8,
    marginBottom: 20,
  },
  barTrack: {
    height: 6,
    borderRadius: 99,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 99,
    backgroundColor: "#6366F1",
    transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
  } as any,
  barLabel: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  snapshotBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  snapshotLabel: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  snapshotDate: {
    color: "#6366F1",
    fontSize: 12,
    fontWeight: "700",
  },
  snapshotText: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  snapshotEmpty: {
    color: "#64748B",
    fontSize: 12,
    fontStyle: "italic",
  },

  // Revisions tab — feedback composer
  feedbackComposer: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  composerLabel: {
    color: "#6366F1",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  composerSubLabel: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
    marginBottom: 4,
  },

  categoryRow: {
    flexDirection: "row",
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    transition: "all 0.2s ease",
  } as any,
  categoryBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
  },
  categoryBtnText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  categoryBtnTextActive: {
    fontWeight: "900",
  },
  feedbackInput: {
    color: "#F8FAFC",
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 22,
    minHeight: 80,
    outlineStyle: "none",
    transition: "border-color 0.2s ease",
  } as any,
  feedbackSuccessText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  feedbackErrorText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "700",
  },

  // Feedback item list
  feedbackList: {
    gap: 12,
  },
  feedbackItem: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  feedbackItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  feedbackItemContent: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  validateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(5, 150, 105, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.15)",
    transition: "all 0.2s ease",
  } as any,
  validateBtnText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  validatedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  validatedTagText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },

  // Sessions tab
  sessionList: {
    gap: 0,
  },
  sessionItem: {
    flexDirection: "row",
    gap: 16,
    minHeight: 90,
  },
  sessionItemLeft: {
    alignItems: "center",
    width: 32,
    gap: 0,
  },
  sessionIndex: {
    width: 32,
    height: 32,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  sessionIndexText: {
    color: "#6366F1",
    fontSize: 11,
    fontWeight: "900",
  },
  sessionConnector: {
    width: 1,
    flex: 1,
    marginTop: 6,
    marginBottom: 6,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  sessionItemContent: {
    flex: 1,
    paddingBottom: 20,
    gap: 8,
  },
  sessionItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  sessionDate: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sessionSnippet: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  sessionFileMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  sessionFileTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.12)",
  },
  sessionFileTagText: {
    color: "#6366F1",
    fontSize: 10,
    fontWeight: "700",
  },
  sessionFeedbackCount: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },

  // No selection placeholder
  noSelectionCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 60,
    gap: 16,
    flex: 1,
    minHeight: 240,
  },
  noSelectionText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "600",
    maxWidth: 280,
    lineHeight: 22,
  },

  // Bottom: Validation queue
  validationQueueCard: {
    padding: 28,
  },
  queueGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  queueItem: {
    flex: 1,
    minWidth: 280,
    maxWidth: "48%" as any,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 16,
    padding: 18,
    gap: 10,
    transition: "all 0.2s ease",
  } as any,
  queueItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  queueStudentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queueAvatarSmall: {
    width: 22,
    height: 22,
    borderRadius: 99,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  queueStudentName: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "700",
  },
  queueItemContent: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  validateQueueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(5, 150, 105, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.15)",
    transition: "all 0.2s ease",
  } as any,
  validateQueueBtnText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  rejectQueueBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.15)",
  } as any,
  rejectQueueBtnText: {
    color: "#DC2626",
    fontSize: 12,
    fontWeight: "800",
  },
  rejectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.15)",
  } as any,
  rejectBtnText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  undoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(217, 119, 6, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.15)",
  } as any,
  undoBtnText: {
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.3,
  },

  // Shared
  empty: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%",
  },
  emptyText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  pillBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    transition: "all 0.25s ease",
  } as any,
  pillBtnInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.06)",
  },
  pillBtnActiveMajor: {
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "#DC2626",
    boxShadow: "0 0 10px rgba(220, 38, 38, 0.1)",
  } as any,
  pillBtnActiveMinor: {
    backgroundColor: "rgba(79, 70, 229, 0.06)",
    borderColor: "#4F46E5",
    boxShadow: "0 0 10px rgba(79, 70, 229, 0.1)",
  } as any,
  pillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
});
