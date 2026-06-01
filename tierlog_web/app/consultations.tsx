import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { WebFileInput } from "@/src/components/WebFileInput";
import { MultiImageInput } from "@/src/components/MultiImageInput";
import { Badge, Button, Card, Heading, Page } from "@/src/components/ui";
import { API_URL } from "@/src/lib/config";
import { useAuth } from "@/src/providers/AuthProvider";
import type { ConsultationLog, FeedbackItem, RevisionAnnotation } from "@/src/types";
import {
  CloudUploadIcon,
  ArchiveIcon,
  AIGatewayIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertIcon,
  ChevronRightIcon,
} from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";

type ChatMessage = {
  role: string;
  content: string;
};

type TypingIndicatorProps = {
  label?: string;
  color?: string;
};

// --- Beautiful Pulsating typing animation component for AI Oracle & Advisor chat ---
const TypingIndicator = ({ label = "AI THINKING", color = "#7C3AED" }: TypingIndicatorProps) => {
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
      styles.chatBubble, 
      styles.chatBubbleAI, 
      getGlowStyle(color, 0.05) as any, 
      { flexDirection: "row", alignItems: "center", gap: 5, paddingVertical: 12, paddingHorizontal: 14 }
    ]}>
      <Text style={[styles.chatRole, { color: color, marginRight: 4, letterSpacing: 0.8 }]}>{label}</Text>
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot1)]} />
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot2)]} />
      <Animated.View style={[{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: color }, getInterpolatedStyle(dot3)]} />
    </View>
  );
};

export default function ConsultationsScreen() {
  const { api, accessToken, user, booting } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ConsultationLog | null>(null);
  
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
  
  // File upload states for Student
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [annotationFiles, setAnnotationFiles] = useState<File[]>([]);
  const [studentTab, setStudentTab] = useState<"feedback" | "transcript" | "annotations" | "drafts">("feedback");
  const [showArchiveDropdown, setShowArchiveDropdown] = useState(false);
  
  // Chat States for Student
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<"oracle" | "advisor">("oracle");
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  
  // Loading & error alerts
  const [loading, setLoading] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const [error, setError] = useState("");
  const socketRef = useRef<WebSocket | null>(null);
  const chatScrollRef = useRef<ScrollView | null>(null);

  // Lecturer Custom Workspace States
  const [selectedFeedbackItem, setSelectedFeedbackItem] = useState<FeedbackItem | null>(null);
  const [feedbackInputText, setFeedbackInputText] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<"Major" | "Minor">("Major");
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0.24); // Simulated progress bar starting point
  const [audioTime, setAudioTime] = useState("02:14");

  // Helper to get chronological bimbingan session number for a student
  const getMeetingNumber = (logId: number, studentId: number) => {
    const studentLogs = logs
      .filter((l) => l.student_id === studentId)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const index = studentLogs.findIndex((l) => l.id === logId);
    return index !== -1 ? index + 1 : 1;
  };

  // Helper to format session dates nicely
  const formatSessionDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const appendChat = (message: ChatMessage) => {
    setChatHistory((current) => {
      const last = current[current.length - 1];
      if (last && last.role === message.role && last.content === message.content) {
        return current;
      }
      return [...current, message];
    });
  };

  const loadLogs = async () => {
    const response = await api<{ data: ConsultationLog[] }>("/consultations");
    setLogs(response.data);
    if (!selectedLog && response.data.length > 0) {
      setSelectedLog(response.data[0]);
    }
  };

  useEffect(() => {
    if (booting || !accessToken) return;

    void loadLogs().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load consultations")
    );
  }, [api, booting, accessToken]);

  const loadDirectMessages = async (logId: number) => {
    try {
      const res = await api<{ data: any[] }>(`/consultations/${logId}/direct-messages`);
      setDirectMessages(res.data);
    } catch (err) {
      console.error("Failed to load direct messages:", err);
    }
  };

  const loadAIChats = async (logId: number) => {
    try {
      const res = await api<{ data: any[] }>(`/consultations/${logId}/ai-chats`);
      const mapped = res.data.map((m: any) => ({
        role: m.role,
        content: m.content
      }));
      setChatHistory(mapped);
    } catch (err) {
      console.error("Failed to load AI chats:", err);
    }
  };

  useEffect(() => {
    if (!accessToken || !selectedLog) {
      return;
    }

    void loadDirectMessages(selectedLog.id);
    void loadAIChats(selectedLog.id);
  }, [selectedLog?.id]);

  // ── Persistent WebSocket: subscribe to ALL consultation rooms so
  //    events (new feedback, status changes, chat) land regardless of
  //    which log is currently selected by the student.
  useEffect(() => {
    if (!accessToken || logs.length === 0) return;

    // Close any stale connection before opening a fresh one
    socketRef.current?.close();

    const socket = new WebSocket(`${API_URL.replace("http", "ws")}/ws?token=${accessToken}`);
    socketRef.current = socket;

    socket.onopen = () => {
      // Subscribe to every consultation room the student has
      logs.forEach((log) => {
        socket.send(JSON.stringify({ action: "subscribe", room: `consultation.${log.id}` }));
      });
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { event: string; data: any };

        // ── New feedback item dispatched by lecturer ──────────────────
        if (payload.event === "feedback.new") {
          const newItem = payload.data;
          setLogs((current) =>
            current.map((log) =>
              log.id !== newItem.log_id
                ? log
                : {
                    ...log,
                    feedback_items: [
                      ...(log.feedback_items ?? []),
                      {
                        id: newItem.id ?? newItem.feedback_id,
                        consultation_log_id: newItem.log_id,
                        content: newItem.content,
                        category: newItem.category,
                        status: newItem.status,
                        created_at: newItem.created_at ?? new Date().toISOString(),
                        updated_at: newItem.created_at ?? new Date().toISOString(),
                      } as any,
                    ],
                  }
            )
          );
          showToast(
            "New Revision Dispatched 📋",
            `Your advisor added a new revision item: "${newItem.content}".`,
            "revision"
          );
        }

        // ── Existing feedback item status / category mutated ──────────
        if (payload.event === "feedback.status-updated") {
          setLogs((current) =>
            current.map((log) =>
              log.id !== payload.data.log_id
                ? log
                : {
                    ...log,
                    feedback_items: (log.feedback_items ?? []).map((item) =>
                      item.id === payload.data.feedback_id
                        ? { ...item, status: payload.data.status, category: payload.data.category ?? item.category }
                        : item
                    ),
                  }
            )
          );
          const status = payload.data.status;
          const msgTitle = status === "Validated" ? "Revision Approved! 🎉" : "Revision Status Updated";
          const msgText =
            status === "Validated"
              ? "A revision feedback has been successfully validated and approved by your advisor."
              : `A revision feedback status was changed to "${status}".`;
          showToast(msgTitle, msgText, "revision");
        }

        // ── AI Oracle chat ────────────────────────────────────────────
        if (payload.event === "chat.message") {
          appendChat({ role: payload.data.role, content: payload.data.content });
        }

        // ── Advisor direct chat ───────────────────────────────────────
        if (payload.event === "chat.direct-message") {
          setDirectMessages((current) => {
            if (current.some((m) => m.id === payload.data.id)) return current;
            return [...current, payload.data];
          });
          if (payload.data.sender_role === "lecturer") {
            showToast("New Message from Advisor", payload.data.content, "chat");
          }
        }
      } catch (e) {
        console.error("[WS] parse error:", e);
      }
    };

    socket.onerror = (e) => console.error("[WS] error:", e);

    return () => {
      socket.close();
    };
  }, [accessToken, logs.length]);

  useEffect(() => {
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [chatHistory, directMessages, chatMode]);

  const selected = useMemo(
    () => logs.find((log) => log.id === selectedLog?.id) ?? selectedLog,
    [logs, selectedLog]
  );

  // When selected log changes, auto-select first feedback item for Lecturer
  useEffect(() => {
    if (selected && selected.feedback_items && selected.feedback_items.length > 0) {
      setSelectedFeedbackItem(selected.feedback_items[0]);
      setFeedbackInputText(selected.feedback_items[0].content);
      setFeedbackCategory(selected.feedback_items[0].category);
    } else {
      setSelectedFeedbackItem(null);
      setFeedbackInputText("");
    }
  }, [selected?.id]);

  const uploadConsultation = async () => {
    if (!paperFile || !audioFile) {
      setError("Please select the manuscript (.docx) and the audio recording (.mp3/.wav) before proceeding.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("paper", paperFile);
      body.append("audio", audioFile);
      annotationFiles.forEach((f) => body.append("annotations", f));
      await api("/consultations", { method: "POST", body, headers: {} });
      setPaperFile(null);
      setAudioFile(null);
      setAnnotationFiles([]);
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const sendChat = async () => {
    if (!selected || !chatQuery.trim() || chatLoading) {
      return;
    }

    const draft = chatQuery;
    setChatQuery("");
    setChatLoading(true);
    setError("");

    if (chatMode === "oracle") {
      appendChat({ role: "user", content: draft });
      try {
        const response = await api<{ ai_response: string }>("/consultations/chat", {
          method: "POST",
          body: JSON.stringify({ log_id: selected.id, query: draft }),
        });
        appendChat({ role: "ai", content: response.ai_response });
        showToast("AI Oracle Response Ready", "The AI has compiled a response for your revision guidelines.", "system");
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : "AI Oracle failed to respond";
        setError(`AI Oracle Error: ${errMsg}. Please verify that your API Key is configured in your profile.`);
        appendChat({ role: "ai", content: `AI Oracle connection failed: ${errMsg}. Please verify your API Key in your profile settings.` });
      } finally {
        setChatLoading(false);
      }
    } else {
      try {
        const response = await api<{ data: any }>(`/consultations/${selected.id}/direct-messages`, {
          method: "POST",
          body: JSON.stringify({ content: draft }),
        });
        setDirectMessages((current) => {
          if (current.some((m) => m.id === response.data.id)) return current;
          return [...current, response.data];
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message to advisor");
      } finally {
        setChatLoading(false);
      }
    }
  };

  const handleQuickRevisi = async (content: string) => {
    if (!selected || chatLoading) return;
    const prompt = `Provide concrete solutions and textual revision improvements for the following feedback item:\n"${content}"`;
    
    appendChat({ role: "user", content: prompt });
    setChatLoading(true);
    setError("");
    try {
      const response = await api<{ ai_response: string }>("/consultations/chat", {
        method: "POST",
        body: JSON.stringify({ log_id: selected.id, query: prompt }),
      });
      appendChat({ role: "ai", content: response.ai_response });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Quick AI Revision failed";
      setError(`Quick AI Revision Error: ${errMsg}. Please verify that your API Key is configured in your profile.`);
      appendChat({ role: "ai", content: `AI Quick Revision processing failed: ${errMsg}. Please check your API Key in your profile settings.` });
    } finally {
      setChatLoading(false);
    }
  };

  const classifyFeedback = async () => {
    if (!selected) return;
    setClassifying(true);
    setError("");
    try {
      await api(`/consultations/${selected.id}/classify-feedback`, {
        method: "POST",
      });
      await loadLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI Classification failed");
    } finally {
      setClassifying(false);
    }
  };

  const updateStatus = async (item: FeedbackItem, status: FeedbackItem["status"]) => {
    try {
      await api(`/consultations/feedback/${item.id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status, log_id: selected?.id }),
      });
      await loadLogs();
      if (selectedFeedbackItem && selectedFeedbackItem.id === item.id) {
        setSelectedFeedbackItem(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  };

  const triggerTranscription = () => {
    setIsTranscribing(true);
    setTimeout(() => {
      setIsTranscribing(false);
      alert("AI transcript has been successfully reprocessed and synchronized.");
    }, 2000);
  };

  const triggerAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      alert("Feedback metrics and version consistency analysis have been updated.");
    }, 2000);
  };

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
    if (!isPlaying) {
      const interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 1) {
            setIsPlaying(false);
            clearInterval(interval);
            return 1;
          }
          return prev + 0.01;
        });
      }, 500);
    }
  };

  return (
    <RequireAuth>
      <View style={{ flex: 1 }}>
        <Page>
          <NavBar />
        
        <Heading
          title="Consultation Workspace"
          subtitle={
            user?.role === "lecturer"
              ? "Supervisor Workspace - Auditing draft thesis, evaluating audio transcripts, and verifying revision status."
              : "Student Workspace - Upload manuscripts, evaluate advisor feedback, and consult the AI Oracle for revision guidelines."
          }
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#DC2626" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* Dynamic Dual-Layout by User Role */}
        {user?.role === "student" ? (
          /* ==================== STUDENT WORKSPACE (CLARITY STREAM 3 PANEL) ==================== */
          <View style={styles.workspace}>
            
            {/* Left Panel: File Sync & Archive List (30% width) */}
            <View style={[styles.leftPanel, { flex: 1.1, gap: 20, height: 680 }]}>
              {/* UPLOAD DRAFT CARD */}
              <Card style={{ padding: 20, width: "100%" }}>
                <View style={styles.panelHeader}>
                  <CloudUploadIcon color="#4F46E5" size={18} />
                  <Text style={[styles.panelTitle, { fontSize: 15 }]}>Upload Draft</Text>
                </View>
                
                <View style={styles.panelForm}>
                  <WebFileInput label="Select Manuscript (.docx)" accept=".docx" onFileSelect={setPaperFile} />
                  <WebFileInput label="Select Recording (.mp3/.wav)" accept="audio/*" onFileSelect={setAudioFile} />
                  
                  <MultiImageInput
                    label="Lecturer Revisions & Annotations (Optional)"
                    files={annotationFiles}
                    onFilesChange={setAnnotationFiles}
                  />

                  <View style={{ marginTop: 8 }}>
                    <Button
                      title={loading ? "Processing..." : "Analyze Revision Session"}
                      onPress={() => void uploadConsultation()}
                      disabled={loading}
                    />
                  </View>
                </View>
              </Card>

              {/* COMPACT FLOATING ARCHIVE DROPDOWN */}
              <View style={{ position: "relative", zIndex: 99, width: "100%" }}>
                <Pressable
                  onPress={() => setShowArchiveDropdown(!showArchiveDropdown)}
                  style={({ pressed }) => [
                    getGlassStyle(0.12, 12) as any,
                    {
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      paddingHorizontal: 16,
                      paddingVertical: 14,
                      borderWidth: 1,
                      borderColor: "rgba(255, 255, 255, 0.06)",
                      backgroundColor: "rgba(30, 41, 59, 0.5)",
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    }
                  ]}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <ArchiveIcon color="#0891B2" size={16} />
                    <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "800" }} numberOfLines={1}>
                      {selected 
                        ? `Session: ${new Date(selected.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}`
                        : "Select Consultation Session"}
                    </Text>
                  </View>
                  <Text style={{ color: "#0891B2", fontSize: 11, fontWeight: "900" }}>
                    {showArchiveDropdown ? "▲" : "▼"}
                  </Text>
                </Pressable>

                {showArchiveDropdown && (
                  <Card
                    style={[
                      getGlassStyle(0.2, 14) as any,
                      {
                        position: "absolute",
                        bottom: 56, // Opens upwards
                        left: 0,
                        right: 0,
                        maxHeight: 220,
                        padding: 10,
                        borderWidth: 1,
                        borderColor: "rgba(255, 255, 255, 0.06)",
                        backgroundColor: "rgba(15, 23, 42, 0.95)",
                        zIndex: 99999,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 10 },
                        shadowOpacity: 0.1,
                        shadowRadius: 15,
                      }
                    ]}
                  >
                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      {...({ className: "ultra-thin-scroll" } as any)}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {logs.map((log) => {
                        const isSelected = selected?.id === log.id;
                        const dateStr = new Date(log.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
                        return (
                          <Pressable
                            key={log.id}
                            onPress={() => {
                              setSelectedLog(log);
                              setShowArchiveDropdown(false);
                            }}
                            style={({ pressed }) => [
                              {
                                flexDirection: "row",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: 10,
                                borderRadius: 8,
                                backgroundColor: isSelected ? "rgba(8, 145, 178, 0.08)" : "transparent",
                                borderWidth: 1,
                                borderColor: isSelected ? "rgba(8, 145, 178, 0.15)" : "transparent",
                                transform: [{ scale: pressed ? 0.98 : 1 }]
                              }
                            ]}
                          >
                            <View style={{ flex: 1, gap: 2 }}>
                              <Text style={{ color: isSelected ? "#ffffff" : "#CBD5E1", fontSize: 12, fontWeight: "800" }} numberOfLines={1}>
                                {log.paper_filename}
                              </Text>
                              <Text style={{ color: "#94A3B8", fontSize: 10, fontWeight: "600" }}>
                                {dateStr}
                              </Text>
                            </View>
                            {isSelected && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#0891B2" }} />}
                          </Pressable>
                        );
                      })}
                      {!logs.length && (
                        <Text style={{ color: "#94A3B8", fontSize: 12, textAlign: "center", paddingVertical: 12 }}>
                          No drafts uploaded yet.
                        </Text>
                      )}
                    </ScrollView>
                  </Card>
                )}
              </View>
            </View>

            {/* Center Panel: Feedback Stream & Transcript Tabs (35% width) */}
            <Card style={[styles.centerPanel, { flex: 1.4, height: 680 }]}>
              <View style={{ flex: 1, gap: 16 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "rgba(255, 255, 255, 0.08)", paddingBottom: 14, flexWrap: "wrap", gap: 12 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.panelTitle, { color: "#F8FAFC" }]}>Advisory Workspace</Text>
                    {selected && (
                      <Pressable 
                        onPress={() => Platform.OS === "web" && window.open(`${API_URL}/storage/paper/${selected.paper_filename}`)}
                        style={({ pressed }) => [
                          { flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1 }
                        ]}
                      >
                        <Text style={{ color: "#14B8A6", fontSize: 11, fontWeight: "700", textDecorationLine: "underline" }} numberOfLines={1}>
                          Download Manuscript: {selected.paper_filename}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  
                  {/* Tabs switch */}
                  <View style={{ flexDirection: "row", gap: 4, backgroundColor: "rgba(255, 255, 255, 0.02)", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255, 255, 255, 0.06)", flexWrap: "nowrap" }}>
                    <Pressable
                      onPress={() => setStudentTab("feedback")}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "feedback" ? "rgba(99, 102, 241, 0.08)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "feedback" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "feedback" ? "#6366F1" : "#94A3B8", fontSize: 9.8, fontWeight: "800" }}>FEEDBACK</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("transcript")}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "transcript" ? "rgba(99, 102, 241, 0.08)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "transcript" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "transcript" ? "#6366F1" : "#94A3B8", fontSize: 9.8, fontWeight: "800" }}>TRANSCRIPT</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("annotations")}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "annotations" ? "rgba(124, 58, 237, 0.08)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "annotations" ? "rgba(124, 58, 237, 0.15)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "annotations" ? "#7C3AED" : "#94A3B8", fontSize: 9.8, fontWeight: "800" }}>
                        ANNOTATIONS ({selected?.revision_annotations?.length ?? 0})
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("drafts")}
                      style={{
                        paddingHorizontal: 8,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "drafts" ? "rgba(8, 145, 178, 0.08)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "drafts" ? "rgba(8, 145, 178, 0.15)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "drafts" ? "#14B8A6" : "#94A3B8", fontSize: 9.8, fontWeight: "800" }}>
                        DRAFTS ({logs.length})
                      </Text>
                    </Pressable>
                  </View>
                </View>

                {selected ? (
                  studentTab === "feedback" ? (
                    /* FEEDBACK LIST VIEW */
                    <ScrollView 
                      showsVerticalScrollIndicator={true}
                      style={{ flex: 1 }}
                      {...({ className: "ultra-thin-scroll" } as any)}
                      contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
                    >
                      {/* Premium AI Organizing Banner */}
                      {selected.feedback_items && selected.feedback_items.length > 0 && (
                        <Pressable
                          onPress={() => void classifyFeedback()}
                          disabled={classifying}
                          style={({ pressed }) => [
                            getGlassStyle(0.12, 14) as any,
                            getGlowStyle(classifying ? "#7C3AED" : "#0891B2", 0.08) as any,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: "rgba(8, 145, 178, 0.2)",
                              marginBottom: 6,
                              transform: [{ scale: pressed ? 0.985 : 1 }],
                            }
                          ]}
                        >
                          <AIGatewayIcon color={classifying ? "#7C3AED" : "#0891B2"} size={16} />
                          <Text style={{ color: "#F8FAFC", fontSize: 13, fontWeight: "900", letterSpacing: 0.2 }}>
                            {classifying 
                              ? "AI Oracle is organizing and sorting your notes..." 
                              : "Sort & Analyze Revisions with AI Oracle"}
                          </Text>
                        </Pressable>
                      )}

                      {selected.feedback_items?.map((item) => {
                        const isFixed = item.status === "Fixed";
                        const isValidated = item.status === "Validated";
                        
                        return (
                          <View
                            key={item.id}
                            style={[
                              styles.feedbackItem,
                              isFixed
                                ? styles.feedbackItemFixed
                                : isValidated
                                ? styles.feedbackItemValidated
                                : styles.feedbackItemPending,
                            ]}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Badge text={item.category.toUpperCase()} color={item.category === "Major" ? "#DC2626" : "#4F46E5"} />
                              
                              {/* Toggle Checkbox-style Badge */}
                              <Pressable
                                onPress={() => void updateStatus(item, isFixed ? "Pending" : "Fixed")}
                                disabled={isValidated}
                                style={({ pressed }) => [
                                  {
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    backgroundColor: isFixed ? "rgba(5, 150, 105, 0.06)" : isValidated ? "rgba(79, 70, 229, 0.06)" : "rgba(217, 119, 6, 0.06)",
                                    borderWidth: 1,
                                    borderColor: isFixed ? "rgba(5, 150, 105, 0.15)" : isValidated ? "rgba(79, 70, 229, 0.15)" : "rgba(217, 119, 6, 0.15)",
                                    transform: [{ scale: pressed && !isValidated ? 0.96 : 1 }],
                                    opacity: isValidated ? 0.8 : 1,
                                  }
                                ]}
                              >
                                <View style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1, borderColor: isFixed ? "#059669" : isValidated ? "#4F46E5" : "#D97706", backgroundColor: isFixed ? "#059669" : "transparent", justifyContent: "center", alignItems: "center" }}>
                                  {isFixed && <Text style={{ color: "#ffffff", fontSize: 6, fontWeight: "900" }}>✓</Text>}
                                </View>
                                <Text style={{ color: isFixed ? "#059669" : isValidated ? "#4F46E5" : "#D97706", fontSize: 9, fontWeight: "900" }}>
                                  {item.status.toUpperCase()}
                                </Text>
                              </Pressable>
                            </View>

                            <Text style={styles.feedbackBody}>{item.content}</Text>
                            
                            <View style={[styles.actionRow, { justifyContent: "flex-end", marginTop: 4 }]}>
                              <Pressable
                                onPress={() => void handleQuickRevisi(item.content)}
                                style={({ pressed }) => [
                                  getGlassStyle(0.15, 8) as any,
                                  {
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                    borderWidth: 1,
                                    borderColor: "rgba(124, 58, 237, 0.2)",
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                  }
                                ]}
                              >
                                <AIGatewayIcon color="#7C3AED" size={12} />
                                <Text style={{ color: "#7C3AED", fontSize: 11, fontWeight: "800" }}>Quick AI Revision</Text>
                              </Pressable>
                            </View>
                          </View>
                        );
                      })}
                      {!selected.feedback_items?.length && (
                        <Text style={styles.emptyFeedbackText}>No feedback items available for this session.</Text>
                      )}
                    </ScrollView>
                  ) : studentTab === "transcript" ? (
                    /* TRANSCRIPT VIEW */
                    <View style={{ flex: 1 }}>
                      <ScrollView 
                        showsVerticalScrollIndicator={true}
                        style={{ flex: 1, backgroundColor: "rgba(15, 23, 42, 0.4)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.04)", padding: 14 }}
                        {...({ className: "ultra-thin-scroll" } as any)}
                      >
                        <Text style={{ color: "#CBD5E1", fontSize: 13, lineHeight: 22, fontWeight: "500" }}>
                          {selected.transcript_text ? selected.transcript_text : "No audio transcript is available for this guidance session."}
                        </Text>
                      </ScrollView>
                    </View>
                  ) : studentTab === "annotations" ? (
                    /* ANNOTATIONS VIEW */
                    <View style={{ flex: 1 }}>
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        style={{ flex: 1 }}
                        {...({ className: "ultra-thin-scroll" } as any)}
                        contentContainerStyle={{ gap: 12 }}
                      >
                        {(selected.revision_annotations ?? []).map((ann, idx) => (
                          <View key={ann.id} style={[getGlassStyle(0.1, 12) as any, styles.annotationCard]}>
                            <View style={styles.annotationHeader}>
                              <Text style={styles.annotationIcon}>
                                {ann.file_type === "image" ? "📸" : "📄"}
                              </Text>
                              <View style={{ flex: 1 }}>
                                <Text style={styles.annotationFilename} numberOfLines={1}>
                                  {ann.filename}
                                </Text>
                                <Text style={styles.annotationTypeLabel}>
                                  {ann.file_type === "image" ? "Annotated Page Photo" : "DOCX Track Changes"}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => Platform.OS === "web" && window.open(`${API_URL}/storage/annotations/${ann.filename}`)}
                                style={({ pressed }) => [
                                  styles.annotationBadge,
                                  { opacity: pressed ? 0.7 : 1 }
                                ]}
                              >
                                <Text style={styles.annotationBadgeText}>Download</Text>
                              </Pressable>
                            </View>
                            {ann.file_type === "image" && Platform.OS === "web" && (
                              <img
                                src={`${API_URL}/storage/annotations/${ann.filename}`}
                                alt={ann.filename}
                                style={{
                                  width: "100%",
                                  maxHeight: 180,
                                  objectFit: "cover",
                                  borderRadius: 8,
                                  marginBottom: 8,
                                  opacity: 0.92,
                                } as any}
                                onError={(e: any) => { e.target.style.display = "none"; }}
                              />
                            )}
                            <View style={styles.ocrTextBox}>
                              <Text style={styles.ocrLabel}>AI EXTRACTED CONTENT</Text>
                              <ScrollView
                                showsVerticalScrollIndicator
                                style={{ maxHeight: 120 }}
                                {...({ className: "ultra-thin-scroll" } as any)}
                              >
                                <Text style={styles.ocrText}>
                                  {ann.extracted_text || "(No text extracted yet)"}
                                </Text>
                              </ScrollView>
                            </View>
                          </View>
                        ))}
                        {!(selected.revision_annotations ?? []).length && (
                          <View style={{ paddingVertical: 40, alignItems: "center" }}>
                            <Text style={{ color: "#64748B", fontSize: 13 }}>No advisor annotations available for this session.</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  ) : (
                    /* DRAFTS HISTORY VIEW */
                    <View style={{ flex: 1 }}>
                      <ScrollView
                        showsVerticalScrollIndicator={true}
                        style={{ flex: 1 }}
                        {...({ className: "ultra-thin-scroll" } as any)}
                        contentContainerStyle={{ gap: 12 }}
                      >
                        {logs.map((log) => {
                          const isSelected = selected?.id === log.id;
                          const dateStr = new Date(log.created_at).toLocaleString("en-US", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          });
                          const feedbackCount = log.feedback_items?.length ?? 0;
                          const annotationCount = log.revision_annotations?.length ?? 0;

                          return (
                            <View 
                              key={log.id} 
                              style={[
                                getGlassStyle(0.1, 14) as any, 
                                styles.draftCard,
                                isSelected && { borderColor: "rgba(8, 145, 178, 0.3)", backgroundColor: "rgba(8, 145, 178, 0.04)" }
                              ]}
                            >
                              <View style={styles.draftHeader}>
                                <Text style={styles.draftIcon}>📄</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={styles.draftFilename} numberOfLines={1}>
                                    {log.paper_filename}
                                  </Text>
                                  <Text style={styles.draftDateLabel}>{dateStr}</Text>
                                </View>
                                <View style={{ flexDirection: "row", gap: 8 }}>
                                  <Pressable
                                    onPress={() => Platform.OS === "web" && window.open(`${API_URL}/storage/paper/${log.paper_filename}`)}
                                    style={({ pressed }) => [
                                      styles.draftBadge,
                                      { backgroundColor: "rgba(8, 145, 178, 0.08)", borderColor: "rgba(8, 145, 178, 0.15)", opacity: pressed ? 0.7 : 1 }
                                    ]}
                                  >
                                    <Text style={[styles.draftBadgeText, { color: "#0891B2" }]}>Download</Text>
                                  </Pressable>
                                  {!isSelected && (
                                    <Pressable
                                      onPress={() => setSelectedLog(log)}
                                      style={({ pressed }) => [
                                        styles.draftBadge,
                                        { backgroundColor: "rgba(79, 70, 229, 0.08)", borderColor: "rgba(79, 70, 229, 0.15)", opacity: pressed ? 0.7 : 1 }
                                      ]}
                                    >
                                      <Text style={[styles.draftBadgeText, { color: "#4F46E5" }]}>Load Session</Text>
                                    </Pressable>
                                  )}
                                </View>
                              </View>

                              {/* Version Metadata Summary */}
                              <View style={styles.draftMetaGrid}>
                                <View style={styles.draftMetaItem}>
                                  <Text style={styles.draftMetaLabel}>FEEDBACK ITEMS</Text>
                                  <Text style={styles.draftMetaValue}>{feedbackCount} points</Text>
                                </View>
                                <View style={styles.draftMetaItem}>
                                  <Text style={styles.draftMetaLabel}>ANNOTATIONS</Text>
                                  <Text style={styles.draftMetaValue}>{annotationCount} files</Text>
                                </View>
                                <View style={styles.draftMetaItem}>
                                  <Text style={styles.draftMetaLabel}>STATUS</Text>
                                  <Text style={[
                                    styles.draftMetaValue, 
                                    { color: log.feedback_items?.every(f => f.status === "Validated") ? "#059669" : "#D97706" }
                                  ]}>
                                    {log.feedback_items?.every(f => f.status === "Validated") ? "Approved" : "Revision Needed"}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                        {!logs.length && (
                          <View style={{ paddingVertical: 40, alignItems: "center" }}>
                            <Text style={{ color: "#64748B", fontSize: 13 }}>No drafts uploaded yet.</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )
                ) : (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#64748B", fontSize: 13, textAlign: "center" }}>Select a session from the history archive to view details.</Text>
                  </View>
                )}
              </View>
            </Card>

            {/* Right Panel: AI Academic Assistant Chat (35% width) */}
            <Card style={[styles.rightPanel, { flex: 1.4, height: 680 }]}>
              {selected ? (
                <View style={styles.detailWorkspace}>
                  {/* Active Session Info with Chat Type Switcher */}
                  <View style={styles.activeSessionHeader}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <Text style={styles.activeLabel}>
                        {chatMode === "oracle" ? "AI ACADEMIC ORACLE" : "ADVISOR CONSULTATION"}
                      </Text>
                      <Badge 
                        text={chatMode === "oracle" ? "ONLINE" : "DIRECT"} 
                        color={chatMode === "oracle" ? "#059669" : "#0891B2"} 
                      />
                    </View>
                    
                    {/* Chat Mode Switcher Tab */}
                    <View style={styles.chatHeaderTabs}>
                      <Pressable
                        onPress={() => setChatMode("oracle")}
                        style={[
                          styles.chatHeaderTab,
                          chatMode === "oracle" ? styles.chatHeaderTabActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatHeaderTabText,
                            chatMode === "oracle" ? styles.chatHeaderTabTextActive : null,
                          ]}
                        >
                          AI Oracle Assistant
                        </Text>
                      </Pressable>
                      <Pressable
                        onPress={() => setChatMode("advisor")}
                        style={[
                          styles.chatHeaderTab,
                          chatMode === "advisor" ? styles.chatHeaderTabActive : null,
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatHeaderTabText,
                            chatMode === "advisor" ? styles.chatHeaderTabTextActive : null,
                          ]}
                        >
                          Advisor Discussion
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  <View style={styles.chatSection}>
                    <ScrollView
                      ref={chatScrollRef}
                      showsVerticalScrollIndicator={true}
                      style={[styles.chatHistoryScroll, { height: 420 }]}
                      {...({ className: "ultra-thin-scroll" } as any)}
                      contentContainerStyle={styles.chatHistoryContent}
                    >
                      {chatMode === "oracle" ? (
                        <>
                          {chatHistory.map((message, index) => {
                            const isUser = message.role === "user";
                            const isError = !isUser && message.content.startsWith("⚠️");
                            return (
                              <View
                                key={`oracle-${index}`}
                                style={[
                                  styles.chatBubble,
                                  isUser ? styles.chatBubbleUser : styles.chatBubbleAI,
                                  isError && {
                                    backgroundColor: "rgba(220, 38, 38, 0.06)",
                                    borderColor: "rgba(220, 38, 38, 0.2)",
                                    borderWidth: 1,
                                  }
                                ]}
                              >
                                <Text style={[styles.chatRole, isError && { color: "#DC2626" }]}>
                                  {isUser ? "STUDENT" : isError ? "WARNING ALERT" : "AI ORACLE"}
                                </Text>
                                <Text style={[styles.chatText, isError && { color: "#DC2626" }]}>{message.content}</Text>
                              </View>
                            );
                          })}
                          {chatLoading && <TypingIndicator />}
                        </>
                      ) : (
                        <>
                          {directMessages.map((message, index) => {
                            const isUser = message.sender_role === "student";
                            return (
                              <View
                                key={`advisor-${message.id || index}`}
                                style={[
                                  styles.chatBubble,
                                  isUser ? styles.chatBubbleUser : styles.chatBubbleAI,
                                ]}
                              >
                                <Text style={styles.chatRole}>
                                  {isUser ? "STUDENT" : "ADVISOR"}
                                </Text>
                                <Text style={styles.chatText}>{message.content}</Text>
                              </View>
                            );
                          })}
                          {chatLoading && <TypingIndicator label="SENDING MESSAGE" color="#0891B2" />}
                        </>
                      )}

                      {chatMode === "oracle" && !chatHistory.length && (
                        <View style={styles.emptyChatWrap}>
                          <Text style={styles.emptyChatText}>
                            Ask questions about draft revisions, academic writing style, or research methodologies.
                          </Text>
                        </View>
                      )}

                      {chatMode === "advisor" && !directMessages.length && (
                        <View style={styles.emptyChatWrap}>
                          <Text style={styles.emptyChatText}>
                            No messages with your advisor yet. Send a message to start direct consultation.
                          </Text>
                        </View>
                      )}
                    </ScrollView>

                    {/* Dynamic Glowing Chat Box Input */}
                    <View style={styles.chatInputWrapper}>
                      <TextInput
                        value={chatQuery}
                        onChangeText={setChatQuery}
                        editable={!chatLoading}
                        placeholder={
                          chatLoading
                            ? "AI Oracle is processing response..."
                            : chatMode === "oracle"
                            ? "Ask about draft thesis revisions..."
                            : "Send a direct message to your advisor..."
                        }
                        placeholderTextColor="#94A3B8"
                        onSubmitEditing={() => void sendChat()}
                        style={[styles.chatInput, chatLoading && { opacity: 0.6, backgroundColor: "rgba(15, 23, 42, 0.6)" }]}
                      />
                      <Pressable 
                        onPress={() => void sendChat()} 
                        disabled={chatLoading || !chatQuery.trim()}
                        style={[styles.sendButton, (chatLoading || !chatQuery.trim()) && { opacity: 0.5 }]}
                      >
                        <Text style={styles.sendButtonText}>Send</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyRightPanel}>
                  <ArchiveIcon color="#6366F1" size={48} />
                  <Text style={styles.emptyRightText}>
                    Please select a guidance session from the timeline to review feedback and consult the AI assistant.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        ) : (
          /* ==================== LECTURER WORKSPACE (3-PANEL ASYMMETRIC) ==================== */
          <View style={styles.workspace}>
            
            {/* Panel Kiri: Student Document Queue (25% width) */}
            <Card style={[styles.leftPanel, { flex: 1 }]}>
              <View style={styles.panelHeader}>
                <ArchiveIcon color="#4F46E5" size={20} />
                <Text style={styles.panelTitle}>Documents Queue</Text>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={true}
                style={styles.sessionScroll}
                {...({ className: "ultra-thin-scroll" } as any)}
                contentContainerStyle={{ gap: 10 }}
              >
                {logs.map((log) => {
                  const isSelected = selected?.id === log.id;
                  const studentName = log.student?.name ?? "Student";
                  const pendingCount = log.feedback_items?.filter(f => f.status === "Pending" || f.status === "Fixed").length ?? 0;
                  const meetNum = getMeetingNumber(log.id, log.student_id);
                  const sessionDateStr = formatSessionDate(log.created_at as any);

                  return (
                    <Pressable
                      key={log.id}
                      onPress={() => setSelectedLog(log)}
                      style={({ pressed }) => [
                        styles.sessionItem,
                        isSelected ? styles.sessionItemActive : styles.sessionItemInactive,
                        {
                          transform: [{ scale: pressed ? 0.98 : 1 }],
                        },
                      ]}
                    >
                      <View style={styles.sessionStatusRow}>
                        <Badge text={log.student?.nim ?? "STUDENT"} />
                        {pendingCount > 0 ? (
                          <Badge text={`${pendingCount} REVISIONS`} color="#D97706" />
                        ) : (
                          <Badge text="VALIDATED" color="#059669" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.sessionFile,
                          isSelected ? { color: "#0F172A" } : { color: "#334155" },
                        ]}
                        numberOfLines={1}
                      >
                        {studentName} (Session #{meetNum})
                      </Text>
                      <Text style={[styles.sessionDate, { color: "#0891B2", fontWeight: "700", marginTop: 2 }]} numberOfLines={1}>
                        Date: {sessionDateStr}
                      </Text>
                      <Text style={styles.sessionDate} numberOfLines={1}>
                        File: {log.paper_filename}
                      </Text>
                    </Pressable>
                  );
                })}

                {!logs.length && (
                  <View style={styles.emptySessions}>
                    <Text style={styles.emptySessionText}>No student submissions received yet.</Text>
                  </View>
                )}
              </ScrollView>
            </Card>

            {/* Panel Tengah: Audio Session & AI Transcript Generator (45% width) */}
            <Card style={[styles.centerPanel, { flex: 1.8 }]}>
              {selected ? (
                <View style={styles.detailWorkspace}>
                  {/* Selected Document Info */}
                  <View style={styles.activeSessionHeader}>
                    <Text style={styles.activeLabel}>SELECTED STUDENT SUBMISSION</Text>
                    <Text style={styles.activeTitle} numberOfLines={1}>
                      {selected.student?.name ?? "Guidance"} - {selected.paper_filename}
                    </Text>
                  </View>

                  {/* High-Fidelity Audio Player */}
                  <View style={styles.audioPlayerContainer}>
                    <Text style={styles.audioLabel}>GUIDANCE SESSION RECORDING</Text>
                    <View style={styles.audioPlayerWrap}>
                      <Pressable 
                        onPress={togglePlayback} 
                        style={({ pressed }) => [
                          styles.playPauseBtn,
                          { transform: [{ scale: pressed ? 0.94 : 1 }] },
                          getGlowStyle(isPlaying ? "#059669" : "#4F46E5", 0.08) as any
                        ]}
                      >
                        <Text style={{ color: "#ffffff", fontWeight: "900", fontSize: 13 }}>
                          {isPlaying ? "PAUSE" : "PLAY"}
                        </Text>
                      </Pressable>
                      <View style={styles.trackSliderWrap}>
                        <View style={styles.trackSliderLineEmpty}>
                          <View style={[styles.trackSliderLineFill, { width: `${audioProgress * 100}%` }]} />
                        </View>
                        <View style={styles.trackTimeWrap}>
                          <Text style={styles.timeElapsed}>{(audioProgress * 4.5).toFixed(2).replace(".", ":")}</Text>
                          <Text style={styles.timeTotal}>{audioTime}</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* AI Transcription Hub */}
                  <View style={[styles.feedbackSection, { height: 260 }]}>
                    <View style={styles.transcriptionHeader}>
                      <Text style={styles.sectionHeaderTitle}>Guidance Dialog Transcript (AI Generated)</Text>
                      <Badge text="STT ENGINE ACTIVE" color="#0891B2" />
                    </View>

                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      style={styles.transcriptScrollLecturer}
                      {...({ className: "ultra-thin-scroll" } as any)}
                    >
                      <Text style={styles.transcriptTextLarge}>
                        {selected.transcript_text ? selected.transcript_text : "Transcript empty."}
                      </Text>
                    </ScrollView>

                    {/* Glowing Custom Action Buttons */}
                    <View style={styles.lecturerActionRow}>
                      <View style={{ flex: 1 }}>
                        <Button
                          title={isTranscribing ? "Generating Transcript..." : "Generate Transcript"}
                          onPress={triggerTranscription}
                          tone="success"
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Button
                          title={isAnalyzing ? "Analyzing Feedback..." : "Analyze Feedback"}
                          onPress={triggerAnalysis}
                          tone="primary"
                        />
                      </View>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyRightPanel}>
                  <ArchiveIcon color="#64748B" size={48} />
                  <Text style={styles.emptyRightText}>
                    Please select a student from the left queue to review the audio recording and transcript.
                  </Text>
                </View>
              )}
            </Card>

            {/* Panel Kanan: Validation & Custom Feedback Form (30% width) */}
            <Card style={[styles.rightPanel, { flex: 1.4 }]}>
              {selected ? (
                <View style={styles.detailWorkspace}>
                  <View style={styles.activeSessionHeader}>
                    <Text style={styles.activeLabel}>ADVISOR CONTROL PANEL</Text>
                    <Text style={styles.activeTitle}>Feedback Evaluation</Text>
                  </View>

                  {/* Scrollable list of feedback items */}
                  <View style={{ height: 180, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.06)", paddingBottom: 14 }}>
                    <Text style={styles.sectionHeaderTitle}>Select Revision Item</Text>
                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      {...({ className: "ultra-thin-scroll" } as any)}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {selected.feedback_items?.map((item) => {
                        const isSelected = selectedFeedbackItem?.id === item.id;
                        const statusColor = item.status === "Validated" ? "#059669" : item.status === "Fixed" ? "#4F46E5" : "#D97706";
                        
                        return (
                          <Pressable
                            key={item.id}
                            onPress={() => {
                              setSelectedFeedbackItem(item);
                              setFeedbackInputText(item.content);
                              setFeedbackCategory(item.category);
                            }}
                            style={[
                              styles.miniFeedbackItem,
                              isSelected ? { borderColor: statusColor, backgroundColor: `${statusColor}08` } : { borderColor: "rgba(0,0,0,0.04)" }
                            ]}
                          >
                            <Badge text={`${item.category} • ${item.status}`} color={statusColor} />
                            <Text style={styles.miniFeedbackText} numberOfLines={1}>{item.content}</Text>
                          </Pressable>
                        );
                      })}
                    </ScrollView>
                  </View>

                  {/* Review / Custom Feedback Input Form */}
                  {selectedFeedbackItem ? (
                    <View style={styles.feedbackFormContainer}>
                      <Text style={styles.sectionHeaderTitle}>Audit Selected Item</Text>
                      
                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>FEEDBACK / REVISION CONTENT</Text>
                        <TextInput
                          multiline
                          numberOfLines={3}
                          value={feedbackInputText}
                          onChangeText={setFeedbackInputText}
                          style={styles.formTextArea}
                          placeholder="Audit selected feedback item..."
                          placeholderTextColor="#475569"
                        />
                      </View>

                      <View style={styles.formGroup}>
                        <Text style={styles.formLabel}>CATEGORY CLASSIFICATION</Text>
                        <View style={styles.categoryPills}>
                          <Pressable 
                            onPress={() => setFeedbackCategory("Major")}
                            style={[styles.pillBtn, feedbackCategory === "Major" ? styles.pillBtnActiveMajor : styles.pillBtnInactive]}
                          >
                            <Text style={[styles.pillText, feedbackCategory === "Major" ? { color: "#DC2626" } : { color: "#475569" }]}>MAJOR</Text>
                          </Pressable>
                          <Pressable 
                            onPress={() => setFeedbackCategory("Minor")}
                            style={[styles.pillBtn, feedbackCategory === "Minor" ? styles.pillBtnActiveMinor : styles.pillBtnInactive]}
                          >
                            <Text style={[styles.pillText, feedbackCategory === "Minor" ? { color: "#4F46E5" } : { color: "#475569" }]}>MINOR</Text>
                          </Pressable>
                        </View>
                      </View>

                      <View style={styles.validationGrid}>
                        {selectedFeedbackItem.status === "Validated" ? (
                          <View style={{ width: "100%", gap: 8 }}>
                            <View style={{ backgroundColor: "rgba(5, 150, 105, 0.06)", borderColor: "rgba(5, 150, 105, 0.15)", borderWidth: 1, borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
                              <CheckCircleIcon color="#059669" size={14} />
                              <Text style={{ color: "#059669", fontSize: 12, fontWeight: "800" }}>ITEM ALREADY VALIDATED</Text>
                            </View>
                            <Button
                              title="Undo Validation (Reset to Pending)"
                              onPress={() => void updateStatus(selectedFeedbackItem, "Pending")}
                              tone="warning"
                            />
                          </View>
                        ) : selectedFeedbackItem.status === "Fixed" ? (
                          <View style={{ width: "100%", gap: 10 }}>
                            <View style={{ backgroundColor: "rgba(79, 70, 229, 0.06)", borderColor: "rgba(79, 70, 229, 0.15)", borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" }}>
                              <Text style={{ color: "#4F46E5", fontSize: 12, fontWeight: "800" }}>STUDENT SUBMITTED RESOLUTION</Text>
                            </View>
                            <View style={{ width: "100%" }}>
                              <Button
                                  title="Validate & Approve (Accept Revision)"
                                onPress={() => void updateStatus(selectedFeedbackItem, "Validated")}
                                tone="success"
                              />
                            </View>
                            <View style={{ width: "100%" }}>
                              <Button
                                  title="Reject Fix (Return to Pending)"
                                onPress={() => void updateStatus(selectedFeedbackItem, "Pending")}
                                tone="danger"
                              />
                            </View>
                          </View>
                        ) : (
                          <View style={{ width: "100%", gap: 10 }}>
                            <View style={{ backgroundColor: "rgba(217, 119, 6, 0.06)", borderColor: "rgba(217, 119, 6, 0.15)", borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" }}>
                              <Text style={{ color: "#D97706", fontSize: 12, fontWeight: "800" }}>⚠️ STATUS: PENDING WORK</Text>
                            </View>
                            <View style={{ width: "100%" }}>
                              <Button
                                title="Validate Immediately"
                                onPress={() => void updateStatus(selectedFeedbackItem, "Validated")}
                                tone="success"
                              />
                            </View>
                          </View>
                        )}
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.emptyFeedbackText}>No feedback items available for audit.</Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyRightPanel}>
                  <ArchiveIcon color="#64748B" size={48} />
                  <Text style={styles.emptyRightText}>
                    Feedback audits, validation actions, and category control options will be displayed here once a session is selected.
                  </Text>
                </View>
              )}
            </Card>
          </View>
        )}
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
  workspace: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
    alignItems: "flex-start",
    width: "100%",
  },
  leftPanel: {
    flex: 1.1,
    minWidth: 280,
    padding: 24,
    height: 660,
  },
  centerPanel: {
    flex: 1.2,
    minWidth: 320,
    padding: 24,
    height: 660,
  },
  rightPanel: {
    flex: 2,
    minWidth: 380,
    padding: 24,
    height: 660,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 14,
    marginBottom: 20,
  },
  panelTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  panelForm: {
    gap: 4,
  },
  sessionScroll: {
    flex: 1,
  },
  sessionItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    transition: "all 0.2s ease-in-out",
  } as any,
  sessionItemInactive: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  sessionItemActive: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderColor: "#6366F1",
    boxShadow: "0 0 15px rgba(99, 102, 241, 0.15)",
  } as any,
  sessionStatusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  activeIndicator: {
    width: 6,
    height: 6,
    borderRadius: 99,
    backgroundColor: "transparent",
  },
  activeIndicatorGlow: {
    backgroundColor: "#6366F1",
    boxShadow: "0 0 8px #6366F1",
  } as any,
  sessionFile: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  sessionDate: {
    color: "#94A3B8",
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "500",
  },
  emptySessions: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptySessionText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "600",
  },
  detailWorkspace: {
    flex: 1,
    gap: 16,
  },
  activeSessionHeader: {
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 12,
  },
  chatHeaderTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
    gap: 4,
  },
  chatHeaderTab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  chatHeaderTabActive: {
    backgroundColor: "#6366F1",
  },
  chatHeaderTabText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "700",
  },
  chatHeaderTabTextActive: {
    color: "#ffffff",
  },
  activeLabel: {
    color: "#6366F1",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  activeTitle: {
    color: "#F8FAFC",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  sectionHeaderTitle: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  feedbackSection: {
    height: 200,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingBottom: 14,
  },
  feedbackScroll: {
    flex: 1,
  },
  feedbackItem: {
    borderRadius: 16,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 16,
    gap: 10,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
  },
  feedbackItemPending: {
    borderColor: "rgba(217, 119, 6, 0.3)",
    borderLeftColor: "#D97706",
  },
  feedbackItemFixed: {
    borderColor: "rgba(5, 150, 105, 0.3)",
    borderLeftColor: "#059669",
  },
  feedbackItemValidated: {
    borderColor: "rgba(99, 102, 241, 0.3)",
    borderLeftColor: "#6366F1",
  },
  feedbackMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackBody: {
    color: "#E2E8F0",
    fontSize: 13.5,
    lineHeight: 20,
    fontWeight: "500",
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 2,
  },
  emptyFeedbackText: {
    color: "#94A3B8",
    fontSize: 13,
    fontWeight: "500",
    paddingVertical: 12,
  },
  chatSection: {
    flex: 1,
    gap: 10,
  },
  chatHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chatHeaderTitle: {
    color: "#F8FAFC",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  chatHistoryScroll: {
    height: 160,
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 14,
    padding: 12,
  },
  chatHistoryContent: {
    gap: 10,
    paddingBottom: 8,
  },
  chatBubble: {
    padding: 12,
    borderRadius: 14,
    maxWidth: "85%",
    gap: 4,
  },
  chatBubbleUser: {
    backgroundColor: "rgba(99, 102, 241, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    alignSelf: "flex-end",
  },
  chatBubbleAI: {
    backgroundColor: "rgba(30, 41, 59, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    alignSelf: "flex-start",
  },
  chatRole: {
    color: "#94A3B8",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  chatText: {
    color: "#E2E8F0",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  emptyChatWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyChatText: {
    color: "#94A3B8",
    fontSize: 12.5,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 18,
  },
  chatInputWrapper: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    color: "#F8FAFC",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: "500",
    outlineStyle: "none",
  } as any,
  sendButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  emptyRightPanel: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 100,
    gap: 16,
  },
  emptyRightText: {
    color: "#94A3B8",
    fontSize: 14,
    textAlign: "center",
    maxWidth: 360,
    lineHeight: 22,
    fontWeight: "500",
  },
  /* ==================== LECTURER SPECIFIC UI STYLES ==================== */
  miniFeedbackItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderColor: "rgba(255, 255, 255, 0.04)",
    transition: "all 0.2s ease",
  } as any,
  miniFeedbackText: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "500",
  },
  feedbackFormContainer: {
    gap: 12,
  },
  formGroup: {
    gap: 6,
  },
  formLabel: {
    color: "#CBD5E1",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  formTextArea: {
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 12,
    color: "#F8FAFC",
    padding: 12,
    fontSize: 13,
    fontWeight: "500",
    textAlignVertical: "top",
    outlineStyle: "none",
  } as any,
  categoryPills: {
    flexDirection: "row",
    gap: 10,
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
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  pillBtnActiveMajor: {
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderColor: "#DC2626",
    boxShadow: "0 0 10px rgba(220, 38, 38, 0.1)"
  } as any,
  pillBtnActiveMinor: {
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderColor: "#6366F1",
    boxShadow: "0 0 10px rgba(99, 102, 241, 0.1)"
  } as any,
  pillText: {
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  validationGrid: {
    gap: 10,
    marginTop: 8,
  },
  dualButtons: {
    flexDirection: "row",
    gap: 10,
  },
  audioPlayerContainer: {
    backgroundColor: "rgba(15, 23, 42, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  audioLabel: {
    color: "#6366F1",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  audioPlayerWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  playPauseBtn: {
    backgroundColor: "#6366F1",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  trackSliderWrap: {
    flex: 1,
    gap: 6,
  },
  trackSliderLineEmpty: {
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 99,
    width: "100%",
    position: "relative",
  },
  trackSliderLineFill: {
    height: "100%",
    backgroundColor: "#059669",
    borderRadius: 99,
    position: "absolute",
    left: 0,
    top: 0,
  },
  trackTimeWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  timeElapsed: {
    color: "#E2E8F0",
    fontSize: 11,
    fontWeight: "600",
  },
  timeTotal: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  transcriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  transcriptScrollLecturer: {
    height: 120,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    borderRadius: 12,
    padding: 12,
    outlineStyle: "none",
  } as any,
  transcriptTextLarge: {
    color: "#CBD5E1",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  lecturerActionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  annotationCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 8,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  annotationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  annotationIcon: {
    fontSize: 22,
  },
  annotationFilename: {
    color: "#F8FAFC",
    fontSize: 12,
    fontWeight: "700",
  },
  annotationTypeLabel: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },
  annotationBadge: {
    backgroundColor: "rgba(124, 58, 237, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.15)",
  },
  annotationBadgeText: {
    color: "#7C3AED",
    fontSize: 10,
    fontWeight: "700",
  },
  ocrTextBox: {
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  ocrLabel: {
    color: "#7C3AED",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  ocrText: {
    color: "#CBD5E1",
    fontSize: 12.5,
    lineHeight: 20,
    fontWeight: "400",
  },
  // ── Drafts Styles ───────────────────────────────────────────────────────────
  draftCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 12,
    marginBottom: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  draftIcon: {
    fontSize: 22,
  },
  draftFilename: {
    color: "#F8FAFC",
    fontSize: 13,
    fontWeight: "700",
  },
  draftDateLabel: {
    color: "#94A3B8",
    fontSize: 10,
    marginTop: 2,
  },
  draftBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  draftBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  draftMetaGrid: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 10,
    padding: 10,
  },
  draftMetaItem: {
    flex: 1,
    gap: 4,
  },
  draftMetaLabel: {
    color: "#94A3B8",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  draftMetaValue: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
}) as any;
