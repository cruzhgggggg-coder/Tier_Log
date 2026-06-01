import React, { useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { CloudUploadIcon, CheckCircleIcon } from "./icons";
import { getGlassStyle, getGlowStyle } from "./icons";

export function WebFileInput({
  label,
  accept,
  onFileSelect,
}: {
  label: string;
  accept: string;
  onFileSelect: (file: File | null) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);

  if (Platform.OS !== "web") {
    return null;
  }

  const handlePress = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setSelectedFileName(file ? file.name : null);
    onFileSelect(file);
  };

  const handleDrag = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: any) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      // Simple validation for accept types
      if (accept.includes("audio") && !file.type.startsWith("audio/")) {
        return;
      }
      if (accept.includes("docx") && !file.name.endsWith(".docx")) {
        return;
      }
      setSelectedFileName(file.name);
      onFileSelect(file);
    }
  };

  // Determine border and glow styling
  const isGlowing = isDragActive || isHovered;
  const activeColor = selectedFileName ? "#10b981" : "#6366f1";

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <input
        type="file"
        ref={fileInputRef}
        accept={accept}
        onChange={handleFileChange}
        style={{ display: "none" }}
      />

      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        style={{ width: "100%" }}
      >
        <Pressable
          onPress={handlePress}
          onHoverIn={() => setIsHovered(true)}
          onHoverOut={() => setIsHovered(false)}
          style={({ pressed }) => [
            getGlassStyle(selectedFileName ? 0.25 : 0.15, 20) as any,
            styles.dropzone,
            selectedFileName ? styles.dropzoneActive : styles.dropzoneInactive,
            isGlowing && (getGlowStyle(activeColor, 0.22) as any),
            {
              transform: [{ scale: pressed ? 0.98 : isHovered ? 1.01 : 1 }],
            },
          ]}
        >
          {selectedFileName ? (
            <View style={styles.fileSelectedWrap}>
              <View style={styles.successIconWrapper}>
                <CheckCircleIcon color="#10b981" size={24} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileLabel}>UPLOADED DOCUMENT</Text>
                <Text style={styles.fileName} numberOfLines={1}>
                  {selectedFileName}
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <CloudUploadIcon color={isGlowing ? "#6366f1" : "#64748b"} size={28} />
              <Text style={[styles.instruction, isGlowing && { color: "#cbd5e1" }]}>
                {isDragActive ? "Drop the file here..." : "Choose document or drag file here"}
              </Text>
              <Text style={styles.formatTip}>Supported format: {accept}</Text>
            </View>
          )}
        </Pressable>
      </div>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    gap: 8,
  },
  label: {
    color: "#64748b",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    paddingLeft: 4,
  },
  dropzone: {
    width: "100%",
    minHeight: 110,
    borderRadius: 16,
    borderWidth: 1.5,
    borderStyle: "dashed",
    padding: 20,
    justifyContent: "center",
    alignItems: "center",
    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
  } as any,
  dropzoneInactive: {
    borderColor: "rgba(99, 102, 241, 0.18)",
  },
  dropzoneActive: {
    borderColor: "#10b981",
  },
  emptyWrap: {
    alignItems: "center",
    gap: 8,
  },
  instruction: {
    color: "#94a3b8",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    transition: "color 0.2s ease",
  } as any,
  formatTip: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "500",
  },
  fileSelectedWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    width: "100%",
    paddingHorizontal: 8,
  },
  successIconWrapper: {
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    padding: 10,
    borderRadius: 99,
  },
  fileLabel: {
    color: "#10b981",
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  fileName: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 4,
  },
});
