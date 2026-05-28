import React, { useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

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

export default function ConsultationsScreen() {
  const { api, accessToken, user } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<ConsultationLog | null>(null);
  
  // File upload states for Student
  const [paperFile, setPaperFile] = useState<File | null>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [annotationFiles, setAnnotationFiles] = useState<File[]>([]);
  const [studentTab, setStudentTab] = useState<"feedback" | "transcript" | "annotations" | "drafts">("feedback");
  
  // Chat States for Student
  const [chatQuery, setChatQuery] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [chatMode, setChatMode] = useState<"oracle" | "advisor">("oracle");
  const [directMessages, setDirectMessages] = useState<any[]>([]);
  
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
    // If lecturer, we fetch the same list but styled from supervised students
    const response = await api<{ data: ConsultationLog[] }>("/consultations");
    setLogs(response.data);
    if (!selectedLog && response.data.length > 0) {
      setSelectedLog(response.data[0]);
    }
  };

  useEffect(() => {
    void loadLogs().catch((err) =>
      setError(err instanceof Error ? err.message : "Failed to load consultations")
    );
  }, []);

  const loadDirectMessages = async (logId: number) => {
    try {
      const res = await api<{ data: any[] }>(`/consultations/${logId}/direct-messages`);
      setDirectMessages(res.data);
    } catch (err) {
      console.error("Failed to load direct messages:", err);
    }
  };

  useEffect(() => {
    if (!accessToken || !selectedLog) {
      return;
    }

    void loadDirectMessages(selectedLog.id);

    const socket = new WebSocket(`${API_URL.replace("http", "ws")}/ws?token=${accessToken}`);
    socketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ action: "subscribe", room: `consultation.${selectedLog.id}` }));
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data) as { event: string; data: any };
      if (payload.event === "feedback.status-updated") {
        setLogs((current) =>
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
      }
      if (payload.event === "chat.message") {
        appendChat({ role: payload.data.role, content: payload.data.content });
      }
      if (payload.event === "chat.direct-message") {
        setDirectMessages((current) => {
          if (current.some((m) => m.id === payload.data.id)) return current;
          return [...current, payload.data];
        });
      }
    };

    return () => {
      socket.close();
    };
  }, [accessToken, selectedLog?.id]);

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
      // Append each annotation file under the key "annotations"
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
    if (!selected || !chatQuery.trim()) {
      return;
    }

    const draft = chatQuery;
    setChatQuery("");

    if (chatMode === "oracle") {
      appendChat({ role: "user", content: draft });
      try {
        const response = await api<{ ai_response: string }>("/consultations/chat", {
          method: "POST",
          body: JSON.stringify({ log_id: selected.id, query: draft }),
        });
        appendChat({ role: "ai", content: response.ai_response });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Chat failed");
      }
    } else {
      // Direct message to Lecturer
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
      }
    }
  };

  const handleQuickRevisi = async (content: string) => {
    if (!selected) return;
    const prompt = `Provide concrete solutions and textual revision improvements for the following feedback item:\n"${content}"`;
    
    appendChat({ role: "user", content: prompt });
    try {
      const response = await api<{ ai_response: string }>("/consultations/chat", {
        method: "POST",
        body: JSON.stringify({ log_id: selected.id, query: prompt }),
      });
      appendChat({ role: "ai", content: response.ai_response });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quick AI Revision failed");
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
      // Keep the current selection in right panel in sync
      if (selectedFeedbackItem && selectedFeedbackItem.id === item.id) {
        setSelectedFeedbackItem(prev => prev ? { ...prev, status } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Status update failed");
    }
  };

  // Simulated handlers for Lecturer Center actions
  const triggerTranscription = () => {
    setIsTranscribing(true);
    setTimeout(() => {
      setIsTranscribing(false);
      alert("Transkrip AI berhasil diproses ulang dan disinkronkan.");
    }, 2000);
  };

  const triggerAnalysis = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      alert("Metrik Butir Feedback & Analisis Konsistensi Versi diperbarui.");
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
      <Page>
        <NavBar />
        
        <Heading
          title="Consultation Workspace"
          subtitle={
            user?.role === "lecturer"
              ? "Lecturer Workspace - Asymmetric three-panel terminal for draft auditing, transcript evaluation, and revision verification."
              : "Student Workspace - Upload revision documents, review advisor feedback, and consult the AI academic assistant."
          }
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#ef4444" size={20} />
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
                  <CloudUploadIcon color="#6366f1" size={18} />
                  <Text style={[styles.panelTitle, { fontSize: 15 }]}>Upload Draft</Text>
                </View>
                
                <View style={styles.panelForm}>
                  <WebFileInput label="Select Manuscript (.docx)" accept=".docx" onFileSelect={setPaperFile} />
                  <WebFileInput label="Select Recording (.mp3/.wav)" accept="audio/*" onFileSelect={setAudioFile} />
                  
                  {/* Annotation files — optional */}
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

              {/* ARCHIVE CARD */}
              <Card style={{ flex: 1, padding: 20, width: "100%" }}>
                <View style={styles.panelHeader}>
                  <ArchiveIcon color="#06b6d4" size={18} />
                  <Text style={[styles.panelTitle, { fontSize: 15 }]}>Archive</Text>
                </View>

                <ScrollView 
                  showsVerticalScrollIndicator={true}
                  style={styles.sessionScroll}
                  {...({ className: "ultra-thin-scroll" } as any)}
                  contentContainerStyle={{ gap: 10 }}
                >
                  {logs.map((log) => {
                    const isSelected = selected?.id === log.id;
                    const dateStr = new Date(log.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
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
                          <Badge text={dateStr} />
                          <View style={[styles.activeIndicator, isSelected && styles.activeIndicatorGlow]} />
                        </View>
                        <Text
                          style={[
                            styles.sessionFile,
                            isSelected ? { color: "#ffffff" } : { color: "#cbd5e1" },
                          ]}
                          numberOfLines={1}
                        >
                          {log.paper_filename}
                        </Text>
                      </Pressable>
                    );
                  })}
                  {!logs.length && (
                    <View style={styles.emptySessions}>
                      <Text style={styles.emptySessionText}>No draft manuscripts uploaded yet.</Text>
                    </View>
                  )}
                </ScrollView>
              </Card>
            </View>

            {/* Center Panel: Feedback Stream & Transcript Tabs (35% width) */}
            <Card style={[styles.centerPanel, { flex: 1.4, height: 680 }]}>
              <View style={{ flex: 1, gap: 16 }}>
                {/* Header with Title and Tabs switches */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.04)", paddingBottom: 14, flexWrap: "wrap", gap: 12 }}>
                  <View style={{ gap: 4 }}>
                    <Text style={[styles.panelTitle, { color: "#ffffff" }]}>Advisory Workspace</Text>
                    {selected && (
                      <Pressable 
                        onPress={() => Platform.OS === "web" && window.open(`${API_URL}/storage/paper/${selected.paper_filename}`)}
                        style={({ pressed }) => [
                          { flexDirection: "row", alignItems: "center", gap: 4, opacity: pressed ? 0.7 : 1 }
                        ]}
                      >
                        <Text style={{ color: "#06b6d4", fontSize: 11, fontWeight: "700", textDecorationLine: "underline" }} numberOfLines={1}>
                          📥 {selected.paper_filename}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                  
                  {/* Tabs switch */}
                  <View style={{ flexDirection: "row", gap: 6, backgroundColor: "rgba(2, 6, 23, 0.4)", borderRadius: 10, padding: 3, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)" }}>
                    <Pressable
                      onPress={() => setStudentTab("feedback")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "feedback" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "feedback" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "feedback" ? "#ffffff" : "#64748b", fontSize: 11, fontWeight: "800" }}>FEEDBACK</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("transcript")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "transcript" ? "rgba(99, 102, 241, 0.15)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "transcript" ? "rgba(99, 102, 241, 0.3)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "transcript" ? "#ffffff" : "#64748b", fontSize: 11, fontWeight: "800" }}>TRANSCRIPT</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("annotations")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "annotations" ? "rgba(167, 139, 250, 0.15)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "annotations" ? "rgba(167, 139, 250, 0.3)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "annotations" ? "#c4b5fd" : "#64748b", fontSize: 11, fontWeight: "800" }}>
                        ANNOTATIONS ({selected?.revision_annotations?.length ?? 0})
                      </Text>
                    </Pressable>
                    <Pressable
                      onPress={() => setStudentTab("drafts")}
                      style={{
                        paddingHorizontal: 12,
                        paddingVertical: 6,
                        borderRadius: 8,
                        backgroundColor: studentTab === "drafts" ? "rgba(6, 182, 212, 0.15)" : "transparent",
                        borderWidth: 1,
                        borderColor: studentTab === "drafts" ? "rgba(6, 182, 212, 0.3)" : "transparent",
                      }}
                    >
                      <Text style={{ color: studentTab === "drafts" ? "#06b6d4" : "#64748b", fontSize: 11, fontWeight: "800" }}>
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
                            getGlowStyle(classifying ? "#a78bfa" : "#06b6d4", 0.1) as any,
                            {
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 10,
                              padding: 14,
                              borderWidth: 1,
                              borderColor: "rgba(6, 182, 212, 0.25)",
                              marginBottom: 6,
                              transform: [{ scale: pressed ? 0.985 : 1 }],
                            }
                          ]}
                        >
                          <AIGatewayIcon color={classifying ? "#a78bfa" : "#06b6d4"} size={16} />
                          <Text style={{ color: "#ffffff", fontSize: 13, fontWeight: "900", letterSpacing: 0.2 }}>
                            {classifying 
                              ? "🔮 AI Oracle is organizing and sorting your notes..." 
                              : "🔮 Sort & Analyze Revisions with AI Oracle"}
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
                              <Badge text={item.category.toUpperCase()} color={item.category === "Major" ? "#ef4444" : "#6366f1"} />
                              
                              {/* Toggle Checkbox-style Badge */}
                              <Pressable
                                onPress={() => void updateStatus(item, isFixed ? "Pending" : "Fixed")}
                                style={({ pressed }) => [
                                  {
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    paddingHorizontal: 10,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    backgroundColor: isFixed ? "rgba(16, 185, 129, 0.15)" : isValidated ? "rgba(99, 102, 241, 0.15)" : "rgba(245, 158, 11, 0.15)",
                                    borderWidth: 1,
                                    borderColor: isFixed ? "rgba(16, 185, 129, 0.3)" : isValidated ? "rgba(99, 102, 241, 0.3)" : "rgba(245, 158, 11, 0.3)",
                                    transform: [{ scale: pressed ? 0.96 : 1 }],
                                  }
                                ]}
                              >
                                <View style={{ width: 10, height: 10, borderRadius: 3, borderWidth: 1, borderColor: isFixed ? "#10b981" : isValidated ? "#6366f1" : "#f59e0b", backgroundColor: isFixed ? "#10b981" : "transparent", justifyContent: "center", alignItems: "center" }}>
                                  {isFixed && <Text style={{ color: "#ffffff", fontSize: 6, fontWeight: "900" }}>✓</Text>}
                                </View>
                                <Text style={{ color: isFixed ? "#10b981" : isValidated ? "#818cf8" : "#f59e0b", fontSize: 9, fontWeight: "900" }}>
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
                                    borderColor: "rgba(139, 92, 246, 0.3)",
                                    transform: [{ scale: pressed ? 0.97 : 1 }],
                                  }
                                ]}
                              >
                                <AIGatewayIcon color="#a78bfa" size={12} />
                                <Text style={{ color: "#a78bfa", fontSize: 11, fontWeight: "800" }}>Quick AI Revision</Text>
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
                        style={{ flex: 1, backgroundColor: "rgba(2, 6, 23, 0.2)", borderRadius: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.03)", padding: 14 }}
                        {...({ className: "ultra-thin-scroll" } as any)}
                      >
                        <Text style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 22, fontWeight: "500" }}>
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
                            {/* File header */}
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
                            {/* Image preview if available */}
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
                            {/* Extracted text / OCR result */}
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
                            <Text style={{ color: "#64748b", fontSize: 13 }}>No advisor annotations available for this session.</Text>
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
                                isSelected && { borderColor: "rgba(6, 182, 212, 0.3)", backgroundColor: "rgba(6, 182, 212, 0.05)" }
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
                                      { backgroundColor: "rgba(6, 182, 212, 0.15)", borderColor: "rgba(6, 182, 212, 0.25)", opacity: pressed ? 0.7 : 1 }
                                    ]}
                                  >
                                    <Text style={[styles.draftBadgeText, { color: "#06b6d4" }]}>Download</Text>
                                  </Pressable>
                                  {!isSelected && (
                                    <Pressable
                                      onPress={() => setSelectedLog(log)}
                                      style={({ pressed }) => [
                                        styles.draftBadge,
                                        { backgroundColor: "rgba(99, 102, 241, 0.15)", borderColor: "rgba(99, 102, 241, 0.25)", opacity: pressed ? 0.7 : 1 }
                                      ]}
                                    >
                                      <Text style={[styles.draftBadgeText, { color: "#818cf8" }]}>Load Session</Text>
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
                                    { color: log.feedback_items?.every(f => f.status === "Validated") ? "#10b981" : "#f59e0b" }
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
                            <Text style={{ color: "#64748b", fontSize: 13 }}>No drafts uploaded yet.</Text>
                          </View>
                        )}
                      </ScrollView>
                    </View>
                  )
                ) : (
                  <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#64748b", fontSize: 13, textAlign: "center" }}>Select a session from the history archive to view details.</Text>
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
                        color={chatMode === "oracle" ? "#10b981" : "#06b6d4"} 
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
                          🔮 AI Oracle
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
                          💬 Advisor Chat
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
                        chatHistory.map((message, index) => {
                          const isUser = message.role === "user";
                          return (
                            <View
                              key={`oracle-${index}`}
                              style={[
                                styles.chatBubble,
                                isUser ? styles.chatBubbleUser : styles.chatBubbleAI,
                              ]}
                            >
                              <Text style={styles.chatRole}>
                                {isUser ? "STUDENT" : "AI ORACLE"}
                              </Text>
                              <Text style={styles.chatText}>{message.content}</Text>
                            </View>
                          );
                        })
                      ) : (
                        directMessages.map((message, index) => {
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
                        })
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
                        placeholder={
                          chatMode === "oracle"
                            ? "Ask about thesis writing or revisions..."
                            : "Type a message to your Advisor..."
                        }
                        placeholderTextColor="#475569"
                        onSubmitEditing={() => void sendChat()}
                        style={styles.chatInput}
                      />
                      <Pressable onPress={() => void sendChat()} style={styles.sendButton}>
                        <Text style={styles.sendButtonText}>Send</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.emptyRightPanel}>
                  <ArchiveIcon color="#64748b" size={48} />
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
                <ArchiveIcon color="#6366f1" size={20} />
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
                          <Badge text={`${pendingCount} REVISIONS`} color="#f59e0b" />
                        ) : (
                          <Badge text="VALIDATED" color="#10b981" />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.sessionFile,
                          isSelected ? { color: "#ffffff" } : { color: "#cbd5e1" },
                        ]}
                        numberOfLines={1}
                      >
                        {studentName}
                      </Text>
                      <Text style={styles.sessionDate} numberOfLines={1}>
                        {log.paper_filename}
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
                          getGlowStyle(isPlaying ? "#10b981" : "#6366f1", 0.15) as any
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
                      <Badge text="STT ENGINE ACTIVE" color="#06b6d4" />
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
                  <ArchiveIcon color="#64748b" size={48} />
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
                  <View style={{ height: 180, borderBottomWidth: 1, borderColor: "rgba(255,255,255,0.04)", paddingBottom: 14 }}>
                    <Text style={styles.sectionHeaderTitle}>Select Revision Item</Text>
                    <ScrollView
                      showsVerticalScrollIndicator={true}
                      {...({ className: "ultra-thin-scroll" } as any)}
                      contentContainerStyle={{ gap: 8 }}
                    >
                      {selected.feedback_items?.map((item) => {
                        const isSelected = selectedFeedbackItem?.id === item.id;
                        const statusColor = item.status === "Validated" ? "#10b981" : item.status === "Fixed" ? "#6366f1" : "#f59e0b";
                        
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
                              isSelected ? { borderColor: statusColor, backgroundColor: `${statusColor}08` } : { borderColor: "rgba(255,255,255,0.03)" }
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
                            <Text style={styles.pillText}>MAJOR</Text>
                          </Pressable>
                          <Pressable 
                            onPress={() => setFeedbackCategory("Minor")}
                            style={[styles.pillBtn, feedbackCategory === "Minor" ? styles.pillBtnActiveMinor : styles.pillBtnInactive]}
                          >
                            <Text style={styles.pillText}>MINOR</Text>
                          </Pressable>
                        </View>
                      </View>

                      {/* Main Glowing Action Validation Buttons */}
                      <View style={styles.validationGrid}>
                        <View style={{ width: "100%" }}>
                          <Button
                            title="Validate"
                            onPress={() => void updateStatus(selectedFeedbackItem, "Validated")}
                            tone="success"
                          />
                        </View>
                        <View style={styles.dualButtons}>
                          <View style={{ flex: 1 }}>
                            <Button
                              title="Reject"
                              onPress={() => void updateStatus(selectedFeedbackItem, "Pending")}
                              tone="danger"
                            />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Button
                              title="Reset Pending"
                              onPress={() => void updateStatus(selectedFeedbackItem, "Pending")}
                              tone="warning"
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  ) : (
                    <Text style={styles.emptyFeedbackText}>No feedback items available for audit.</Text>
                  )}
                </View>
              ) : (
                <View style={styles.emptyRightPanel}>
                  <ArchiveIcon color="#64748b" size={48} />
                  <Text style={styles.emptyRightText}>
                    Feedback audits, validation actions, and category control options will be displayed here once a session is selected.
                  </Text>
                </View>
              )}
            </Card>
          </View>
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
    borderColor: "rgba(255,255,255,0.04)",
    paddingBottom: 14,
    marginBottom: 20,
  },
  panelTitle: {
    color: "#ffffff",
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
    backgroundColor: "rgba(2, 6, 23, 0.2)",
    borderColor: "rgba(255,255,255,0.03)",
  },
  sessionItemActive: {
    backgroundColor: "rgba(99, 102, 241, 0.05)",
    borderColor: "#6366f1",
  },
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
    backgroundColor: "#6366f1",
    boxShadow: "0 0 8px #6366f1",
  } as any,
  sessionFile: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  sessionDate: {
    color: "#64748b",
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
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  detailWorkspace: {
    flex: 1,
    gap: 16,
  },
  activeSessionHeader: {
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingBottom: 12,
  },
  chatHeaderTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
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
    backgroundColor: "#6366f1",
  },
  chatHeaderTabText: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "700",
  },
  chatHeaderTabTextActive: {
    color: "#ffffff",
  },
  activeLabel: {
    color: "#6366f1",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  activeTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "900",
    marginTop: 4,
  },
  sectionHeaderTitle: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: 8,
  },
  feedbackSection: {
    height: 200,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
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
    backgroundColor: "rgba(2, 6, 23, 0.2)",
  },
  feedbackItemPending: {
    borderColor: "rgba(245, 158, 11, 0.2)",
    borderLeftColor: "#f59e0b",
  },
  feedbackItemFixed: {
    borderColor: "rgba(16, 185, 129, 0.2)",
    borderLeftColor: "#10b981",
  },
  feedbackItemValidated: {
    borderColor: "rgba(99, 102, 241, 0.2)",
    borderLeftColor: "#6366f1",
  },
  feedbackMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feedbackBody: {
    color: "#e2e8f0",
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
    color: "#475569",
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
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: -0.2,
  },
  chatHistoryScroll: {
    height: 160,
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
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
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.2)",
    alignSelf: "flex-end",
  },
  chatBubbleAI: {
    backgroundColor: "rgba(30, 41, 59, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    alignSelf: "flex-start",
  },
  chatRole: {
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  chatText: {
    color: "#ffffff",
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  emptyChatWrap: {
    paddingVertical: 40,
    alignItems: "center",
  },
  emptyChatText: {
    color: "#475569",
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
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    color: "#ffffff",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    fontWeight: "500",
    outlineStyle: "none",
  } as any,
  sendButton: {
    backgroundColor: "#6366f1",
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
    color: "#64748b",
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
    backgroundColor: "rgba(2, 6, 23, 0.15)",
    transition: "all 0.2s ease",
  } as any,
  miniFeedbackText: {
    color: "#e2e8f0",
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
    color: "#64748b",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  formTextArea: {
    backgroundColor: "rgba(2, 6, 23, 0.4)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 12,
    color: "#ffffff",
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
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderColor: "rgba(255,255,255,0.03)",
  },
  pillBtnActiveMajor: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderColor: "#ef4444",
    boxShadow: "0 0 10px rgba(239,68,68,0.15)"
  } as any,
  pillBtnActiveMinor: {
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderColor: "#6366f1",
    boxShadow: "0 0 10px rgba(99,102,241,0.15)"
  } as any,
  pillText: {
    color: "#ffffff",
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
    backgroundColor: "rgba(2, 6, 23, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 16,
    padding: 16,
    gap: 10,
  },
  audioLabel: {
    color: "#6366f1",
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
    backgroundColor: "#6366f1",
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
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 99,
    width: "100%",
    position: "relative",
  },
  trackSliderLineFill: {
    height: "100%",
    backgroundColor: "#10b981",
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
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
  timeTotal: {
    color: "#64748b",
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
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 12,
    padding: 12,
    outlineStyle: "none",
  } as any,
  transcriptTextLarge: {
    color: "#e2e8f0",
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
    borderColor: "rgba(167, 139, 250, 0.12)",
    gap: 8,
    marginBottom: 12,
    backgroundColor: "rgba(2, 6, 23, 0.2)",
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
    color: "#e2e8f0",
    fontSize: 12,
    fontWeight: "700",
  },
  annotationTypeLabel: {
    color: "#64748b",
    fontSize: 10,
    marginTop: 2,
  },
  annotationBadge: {
    backgroundColor: "rgba(167, 139, 250, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.25)",
  },
  annotationBadgeText: {
    color: "#a78bfa",
    fontSize: 10,
    fontWeight: "700",
  },
  ocrTextBox: {
    backgroundColor: "rgba(2, 6, 23, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.08)",
    borderRadius: 10,
    padding: 10,
    gap: 6,
  },
  ocrLabel: {
    color: "#a78bfa",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  ocrText: {
    color: "#cbd5e1",
    fontSize: 12.5,
    lineHeight: 20,
    fontWeight: "400",
  },
  // ── Drafts Styles ───────────────────────────────────────────────────────────
  draftCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(6, 182, 212, 0.12)",
    gap: 12,
    marginBottom: 12,
    backgroundColor: "rgba(2, 6, 23, 0.2)",
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
    color: "#e2e8f0",
    fontSize: 13,
    fontWeight: "700",
  },
  draftDateLabel: {
    color: "#64748b",
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
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderRadius: 10,
    padding: 10,
  },
  draftMetaItem: {
    flex: 1,
    gap: 4,
  },
  draftMetaLabel: {
    color: "#64748b",
    fontSize: 8,
    fontWeight: "900",
    letterSpacing: 1,
  },
  draftMetaValue: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "600",
  },
}) as any;
