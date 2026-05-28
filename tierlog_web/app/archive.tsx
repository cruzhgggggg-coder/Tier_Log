import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View, ScrollView, Pressable, Platform } from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Card, Heading, Page, Badge, Button } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import type { ConsultationLog, RevisionAnnotation } from "@/src/types";
import { ArchiveIcon, AlertIcon, CheckCircleIcon, ClockIcon } from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";
import { API_URL } from "@/src/lib/config";

// Stateful Timeline Item Component with Clarity Stream Tabbed Interface
function TimelineItem({ log }: { log: ConsultationLog }) {
  const [activeTab, setActiveTab] = useState<"feedback" | "transcript" | "annotations">("feedback");
  const isAllValidated = !log.feedback_items || log.feedback_items.length === 0 || log.feedback_items.every((item) => item.status === "Validated");
  const statusLabel = isAllValidated ? "APPROVED SESSION" : "REVISION REQUIRED";
  const statusColor = isAllValidated ? "#10b981" : "#f59e0b";
  const annotationCount = log.revision_annotations?.length ?? 0;

  return (
    <View style={styles.timelineItemWrapper}>
      {/* Glowing chronological timeline node */}
      <View style={[styles.timelineNode, { backgroundColor: statusColor, shadowColor: statusColor }]} />
      
      <View style={[getGlassStyle(0.2, 16) as any, styles.timelineItem]}>
        {/* Timeline metadata header */}
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <Text style={styles.itemFile} numberOfLines={1}>
              {log.paper_filename}
            </Text>
            <Badge text={statusLabel} color={statusColor} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
            <Text style={styles.itemDate}>
              {new Date(log.created_at).toLocaleString("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </Text>
            <Pressable 
              onPress={() => Platform.OS === "web" && window.open(`${API_URL}/storage/paper/${log.paper_filename}`)}
              style={({ pressed }) => [
                { opacity: pressed ? 0.7 : 1 }
              ]}
            >
              <Text style={{ color: "#06b6d4", fontSize: 11, fontWeight: "700", textDecorationLine: "underline" }}>
                📥 Download Draft
              </Text>
            </Pressable>
          </View>
        </View>

        {/* Glassmorphic tab controls for switching */}
        <View style={styles.tabContainer}>
          <Pressable 
            onPress={() => setActiveTab("feedback")}
            style={[styles.tabButton, activeTab === "feedback" ? styles.tabButtonActive : styles.tabButtonInactive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "feedback" && styles.tabButtonTextActive]}>
              Revision Items ({log.feedback_items ? log.feedback_items.length : 0})
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => setActiveTab("transcript")}
            style={[styles.tabButton, activeTab === "transcript" ? styles.tabButtonActive : styles.tabButtonInactive]}
          >
            <Text style={[styles.tabButtonText, activeTab === "transcript" && styles.tabButtonTextActive]}>
              Full Transcript
            </Text>
          </Pressable>
          {/* Third tab — only show if there are annotations */}
          {annotationCount > 0 && (
            <Pressable
              onPress={() => setActiveTab("annotations")}
              style={[styles.tabButton, activeTab === "annotations" ? styles.tabButtonAnnotationActive : styles.tabButtonInactive]}
            >
              <Text style={[styles.tabButtonText, activeTab === "annotations" && styles.tabButtonTextAnnotation]}>
                ✏️ Lecturer Annotations ({annotationCount})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Tab content panel */}
        {activeTab === "feedback" ? (
          <View style={styles.tabContent}>
            {log.feedback_items && log.feedback_items.length > 0 ? (
              <View style={styles.feedbackListSummary}>
                <View style={{ gap: 8 }}>
                  {log.feedback_items.map((item) => (
                    <View key={item.id} style={styles.feedbackSummaryItem}>
                      <View style={[styles.feedbackDot, { backgroundColor: item.status === "Validated" ? "#10b981" : item.status === "Fixed" ? "#6366f1" : "#f59e0b" }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.feedbackSummaryText}>
                          {item.content}
                        </Text>
                        <View style={{ flexDirection: "row", gap: 6, marginTop: 4, alignItems: "center" }}>
                          <Badge 
                            text={item.category} 
                            color={item.category === "Major" ? "#ef4444" : "#6366f1"} 
                          />
                          <Badge 
                            text={item.status} 
                            color={item.status === "Validated" ? "#10b981" : item.status === "Fixed" ? "#818cf8" : "#f59e0b"} 
                          />
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            ) : (
              <View style={styles.emptyFeedbackContainer}>
                <CheckCircleIcon color="#10b981" size={20} />
                <Text style={styles.emptyFeedbackText}>All clear! No revisions for this guidance session.</Text>
              </View>
            )}
          </View>
        ) : activeTab === "transcript" ? (
          <View style={styles.tabContent}>
            <View style={styles.transcriptContainer}>
              <ScrollView 
                showsVerticalScrollIndicator={true}
                style={styles.transcriptScrollFull}
                {...({ className: "ultra-thin-scroll" } as any)}
              >
                <Text style={styles.transcriptTextFull}>
                  {log.transcript_text ? log.transcript_text : "The audio transcript for this session is empty or could not be processed."}
                </Text>
              </ScrollView>
            </View>
          </View>
        ) : (
          /* === ANNOTATIONS TAB === */
          <View style={styles.tabContent}>
            <ScrollView
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 320 }}
              {...({ className: "ultra-thin-scroll" } as any)}
            >
              <View style={{ gap: 12 }}>
                {(log.revision_annotations ?? []).map((ann, idx) => (
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
                      <View style={styles.annotationBadge}>
                        <Text style={styles.annotationBadgeText}>#{idx + 1}</Text>
                      </View>
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
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </View>
  );
}

export default function ArchiveScreen() {
  const { api } = useAuth();
  const [logs, setLogs] = useState<ConsultationLog[]>([]);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"all" | "validated" | "pending">("all");

  useEffect(() => {
    api<{ data: ConsultationLog[] }>("/logs")
      .then((response) => setLogs(response.data))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load archive"));
  }, [api]);

  // Chronological filtering logic
  const filteredLogs = logs.filter((log) => {
    const isAllValidated = !log.feedback_items || log.feedback_items.length === 0 || log.feedback_items.every((item) => item.status === "Validated");
    if (filter === "validated") return isAllValidated;
    if (filter === "pending") return !isAllValidated;
    return true;
  });

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        <Heading 
          title="Consultation Archive" 
          subtitle="Digital repository for reviewing audio transcripts, annotations, and historical draft manuscripts." 
        />

        {error ? (
          <Card style={styles.errorCard}>
            <AlertIcon color="#ef4444" size={20} />
            <Text style={styles.errorText}>{error}</Text>
          </Card>
        ) : null}

        {/* Quick Filter Bar */}
        <View style={styles.filterBar}>
          <Pressable 
            onPress={() => setFilter("all")}
            style={[styles.filterBtn, filter === "all" ? styles.filterBtnActive : styles.filterBtnInactive]}
          >
            <Text style={[styles.filterBtnText, filter === "all" && styles.filterBtnTextActive]}>All Sessions ({logs.length})</Text>
          </Pressable>
          <Pressable 
            onPress={() => setFilter("validated")}
            style={[styles.filterBtn, filter === "validated" ? styles.filterBtnActive : styles.filterBtnInactive]}
          >
            <Text style={[styles.filterBtnText, filter === "validated" && styles.filterBtnTextActive]}>
              Approved ({logs.filter(l => !l.feedback_items || l.feedback_items.every(item => item.status === "Validated")).length})
            </Text>
          </Pressable>
          <Pressable 
            onPress={() => setFilter("pending")}
            style={[styles.filterBtn, filter === "pending" ? styles.filterBtnActive : styles.filterBtnInactive]}
          >
            <Text style={[styles.filterBtnText, filter === "pending" && styles.filterBtnTextActive]}>
              Revision Required ({logs.filter(l => l.feedback_items?.some(item => item.status !== "Validated")).length})
            </Text>
          </Pressable>
        </View>

        <Card style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <ArchiveIcon color="#6366f1" size={20} />
            <Text style={styles.cardTitle}>Chronological Session History</Text>
          </View>

          <View style={styles.timelineList}>
            {/* Left chronological vertical track line */}
            {filteredLogs.length > 0 && <View style={styles.timelineTrack} />}

            {filteredLogs.map((log) => (
              <TimelineItem key={log.id} log={log} />
            ))}

            {!filteredLogs.length && (
              <View style={styles.emptyContainer}>
                <ArchiveIcon color="#475569" size={32} />
                <Text style={styles.emptyText}>Archive empty. No session history recorded yet.</Text>
              </View>
            )}
          </View>
        </Card>
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
    marginBottom: 8,
  },
  errorText: {
    color: "#fca5a5",
    fontSize: 14,
    fontWeight: "600",
  },
  filterBar: {
    flexDirection: "row",
    gap: 12,
    flexWrap: "wrap",
    width: "100%",
    marginBottom: 8,
  },
  filterBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 99,
    borderWidth: 1,
    transition: "all 0.25s ease-in-out",
  } as any,
  filterBtnActive: {
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    borderColor: "#6366f1",
  },
  filterBtnInactive: {
    backgroundColor: "rgba(9, 13, 26, 0.35)",
    borderColor: "rgba(255, 255, 255, 0.04)",
  },
  filterBtnText: {
    color: "#64748b",
    fontSize: 13,
    fontWeight: "700",
  },
  filterBtnTextActive: {
    color: "#ffffff",
  },
  mainCard: {
    padding: 28,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.04)",
    paddingBottom: 16,
    marginBottom: 28,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "900",
    letterSpacing: -0.5,
  },
  timelineList: {
    gap: 28,
    position: "relative",
  },
  timelineTrack: {
    position: "absolute",
    left: 11,
    top: 12,
    bottom: 24,
    width: 2,
    backgroundColor: "rgba(99, 102, 241, 0.15)",
    zIndex: 1,
  },
  timelineItemWrapper: {
    position: "relative",
    paddingLeft: 36,
  },
  timelineNode: {
    position: "absolute",
    left: 6,
    top: 24,
    width: 12,
    height: 12,
    borderRadius: 99,
    zIndex: 2,
    elevation: 4,
    ...Platform.select({
      web: {
        boxShadow: "0 0 10px currentColor",
      }
    })
  } as any,
  timelineItem: {
    padding: 22,
    gap: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 12,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.03)",
    paddingBottom: 12,
  },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  },
  itemFile: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  itemDate: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  feedbackListSummary: {
    backgroundColor: "rgba(2, 6, 23, 0.2)",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
  },
  feedbackSummaryTitle: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  feedbackSummaryItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  feedbackDot: {
    width: 6,
    height: 6,
    borderRadius: 99,
  },
  feedbackSummaryText: {
    color: "#cbd5e1",
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
  },
  moreFeedbackTip: {
    color: "#6366f1",
    fontSize: 11,
    fontWeight: "700",
    marginTop: 4,
    paddingLeft: 14,
  },
  transcriptContainer: {
    gap: 8,
  },
  transcriptLabel: {
    color: "#6366f1",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  transcriptScroll: {
    height: 100,
    backgroundColor: "rgba(2, 6, 23, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    borderRadius: 12,
    padding: 12,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      }
    })
  } as any,
  transcriptText: {
    color: "#94a3b8",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
  },
  tabContainer: {
    flexDirection: "row",
    gap: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    paddingBottom: 8,
    marginBottom: 8,
  },
  tabButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    transition: "all 0.2s ease-in-out",
  } as any,
  tabButtonActive: {
    backgroundColor: "rgba(99, 102, 241, 0.12)",
    borderColor: "rgba(99, 102, 241, 0.35)",
  },
  tabButtonInactive: {
    backgroundColor: "transparent",
    borderColor: "transparent",
  },
  tabButtonText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
  },
  tabButtonTextActive: {
    color: "#ffffff",
  },
  tabContent: {
    marginTop: 4,
  },
  transcriptScrollFull: {
    height: 180,
    backgroundColor: "rgba(2, 6, 23, 0.25)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.02)",
    borderRadius: 12,
    padding: 14,
    ...Platform.select({
      web: {
        outlineStyle: "none",
      }
    })
  } as any,
  transcriptTextFull: {
    color: "#cbd5e1",
    fontSize: 13.5,
    lineHeight: 22,
    fontWeight: "500",
  },
  emptyFeedbackContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)",
    padding: 14,
    borderRadius: 12,
  },
  emptyFeedbackText: {
    color: "#a7f3d0",
    fontSize: 13,
    fontWeight: "600",
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    width: "100%",
  },
  emptyText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  // ── Annotation tab styles ───────────────────────────────────────────────────
  tabButtonAnnotationActive: {
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    borderColor: "rgba(167, 139, 250, 0.35)",
  },
  tabButtonTextAnnotation: {
    color: "#c4b5fd",
  },
  annotationCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.12)",
    gap: 8,
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
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  annotationBadgeText: {
    color: "#a78bfa",
    fontSize: 10,
    fontWeight: "700",
  },
  ocrTextBox: {
    backgroundColor: "rgba(2, 6, 23, 0.3)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.1)",
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
});
