import React, { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { getGlassStyle, getGlowStyle } from "./icons";

// ─── Icons ───────────────────────────────────────────────────────────────────
function AnnotationIcon({ color = "#a78bfa", size = 24 }: { color?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function DocxAnnotationIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <polyline points="14 2 14 8 20 8" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="16" y1="13" x2="8" y2="13" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="16" y1="17" x2="8" y2="17" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}

function TrashIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <polyline points="3 6 5 6 21 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M19 6l-1 14H6L5 6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M10 11v6M14 11v6" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function MultiImageInput({
  label,
  files,
  onFilesChange,
}: {
  label: string;
  files: File[];
  onFilesChange: (files: File[]) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  if (Platform.OS !== "web") return null;

  const ACCEPTED_EXTS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".docx"];
  const ACCEPT_ATTR = "image/*,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  const isValidFile = (f: File) => {
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    return ACCEPTED_EXTS.includes(ext);
  };

  const addFiles = (newFiles: FileList | File[]) => {
    const arr = Array.from(newFiles).filter(isValidFile);
    if (arr.length === 0) return;
    onFilesChange([...files, ...arr]);
  };

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragActive(true);
    else setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };

  const isImage = (f: File) => f.type.startsWith("image/");
  const isGlowing = isDragActive || isHovered;

  return (
    <View style={styles.container}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {files.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{files.length} files</Text>
          </View>
        )}
      </View>

      {/* Drop zone */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        style={{ display: "none" }}
        onChange={(e) => e.target.files && addFiles(e.target.files)}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{ width: "100%" }}
      >
        <Pressable
          onPress={() => fileInputRef.current?.click()}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          style={({ pressed }) => [
            getGlassStyle(0.12, 16) as any,
            styles.dropzone,
            isGlowing && (getGlowStyle("#a78bfa", 0.18) as any),
            isDragActive && styles.dropzoneActive,
            { transform: [{ scale: pressed ? 0.98 : 1 }] },
          ]}
        >
          <AnnotationIcon color={isGlowing ? "#a78bfa" : "#64748b"} size={26} />
          <Text style={[styles.instruction, isGlowing && { color: "#c4b5fd" }]}>
            {isDragActive
              ? "Drop files here..."
              : "Add photos of crossed-out pages or revision DOCX"}
          </Text>
          <Text style={styles.formatTip}>JPG · PNG · WEBP · DOCX · Multi-file</Text>
        </Pressable>
      </div>

      {/* File thumbnails */}
      {files.length > 0 && (
        <View style={styles.previewGrid}>
          {files.map((f, idx) => (
            <View key={idx} style={[getGlassStyle(0.15, 12) as any, styles.previewCard]}>
              {isImage(f) ? (
                <img
                  src={URL.createObjectURL(f)}
                  alt={f.name}
                  style={previewImgStyle}
                />
              ) : (
                <View style={styles.docxPreview}>
                  <DocxAnnotationIcon size={28} />
                </View>
              )}
              <View style={styles.previewInfo}>
                <Text style={styles.previewName} numberOfLines={1}>{f.name}</Text>
                <Text style={styles.previewType}>
                  {isImage(f) ? "📸 Annotation Photo" : "📄 Revision DOCX"}
                </Text>
              </View>
              <Pressable
                onPress={() => removeFile(idx)}
                style={({ pressed }) => [
                  styles.removeBtn,
                  { opacity: pressed ? 0.7 : 1 },
                ]}
              >
                <TrashIcon size={13} />
              </Pressable>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const previewImgStyle: React.CSSProperties = {
  width: "100%",
  height: 80,
  objectFit: "cover",
  borderRadius: 8,
};

const styles = StyleSheet.create({
  container: { marginBottom: 20, gap: 8 },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  label: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  badge: {
    backgroundColor: "rgba(167, 139, 250, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.35)",
  },
  badgeText: { color: "#a78bfa", fontSize: 10, fontWeight: "700" },
  dropzone: {
    width: "100%",
    minHeight: 90,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(167, 139, 250, 0.22)",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    padding: 16,
    transition: "all 0.3s ease",
  } as any,
  dropzoneActive: { borderColor: "#a78bfa" },
  instruction: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    transition: "color 0.2s ease",
  } as any,
  formatTip: { color: "#475569", fontSize: 10, fontWeight: "500" },
  previewGrid: { gap: 8 },
  previewCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.15)",
    overflow: "hidden",
  },
  docxPreview: {
    width: 48,
    height: 48,
    backgroundColor: "rgba(96, 165, 250, 0.08)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  previewInfo: { flex: 1 },
  previewName: { color: "#e2e8f0", fontSize: 12, fontWeight: "600" },
  previewType: { color: "#64748b", fontSize: 10, marginTop: 2 },
  removeBtn: {
    padding: 6,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: 8,
  },
});
