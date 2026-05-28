import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, Platform, Pressable, TextInput } from "react-native";

import { NavBar } from "@/src/components/NavBar";
import { RequireAuth } from "@/src/components/RequireAuth";
import { Button, Card, Field, Heading, Page, Badge } from "@/src/components/ui";
import { useAuth } from "@/src/providers/AuthProvider";
import type { User } from "@/src/types";
import { AIGatewayIcon, CheckCircleIcon, AlertIcon, ClockIcon } from "@/src/components/icons";
import { getGlassStyle, getGlowStyle } from "@/src/components/icons";

// Premium predefined model registry grouped by provider
const PROVIDER_MODELS: Record<string, { label: string; value: string; desc: string }[]> = {
  gemini: [
    { label: "Gemini 2.5 Flash", value: "gemini:gemini-2.5-flash", desc: "Recommended. Balanced speed and reasoning accuracy." },
    { label: "Gemini 2.5 Pro", value: "gemini:gemini-2.5-pro", desc: "Advanced model for deep academic reasoning and research." },
    { label: "Gemini 2.0 Flash", value: "gemini:gemini-2.0-flash", desc: "Ultra-low latency, ideal for interactive assistant dialog." },
    { label: "Gemini 1.5 Pro", value: "gemini:gemini-1.5-pro", desc: "Large context window, ideal for long manuscript audits." },
  ],
  openai: [
    { label: "GPT-4o", value: "openai:gpt-4o", desc: "High-performance model, highly accurate on structural instructions." },
    { label: "GPT-4o Mini", value: "openai:gpt-4o-mini", desc: "Cost-effective, fast, and reliable model for general tasks." },
    { label: "GPT-4 Turbo", value: "openai:gpt-4-turbo", desc: "Legacy model with stable performance across standard tasks." },
  ],
  anthropic: [
    { label: "Claude 3.5 Sonnet", value: "anthropic:claude-3-5-sonnet-20241022", desc: "State-of-the-Art. Superior capability for high-end academic writing." },
    { label: "Claude 3.5 Haiku", value: "anthropic:claude-3-5-haiku-20241022", desc: "Ultra-high speed with outstanding contextual comprehension." },
    { label: "Claude 3 Opus", value: "anthropic:claude-3-opus-20240229", desc: "Excellent for complex theoretical analysis and logic mapping." },
  ],
  nvidia: [
    { label: "Llama 3.1 70B Instruct", value: "nvidia:meta/llama-3.1-70b-instruct", desc: "Meta's flagship open-weights model hosted on NVIDIA infrastructure." },
    { label: "Nemotron 70B Instruct", value: "nvidia:nvidia/llama-3.1-nemotron-70b-instruct", desc: "NVIDIA-optimized model for highly natural conversational flows." },
    { label: "Mixtral 8x22B Instruct", value: "nvidia:mistralai/mixtral-8x22b-instruct-v0.1", desc: "High-performance Mixture of Experts (MoE) model." },
  ],
};

export default function AIGatewayScreen() {
  const { api, user, setUser } = useAuth();
  const [openaiKey, setOpenaiKey] = useState(user?.openai_key ?? "");
  const [geminiKey, setGeminiKey] = useState(user?.gemini_key ?? "");
  const [anthropicKey, setAnthropicKey] = useState(user?.anthropic_key ?? "");
  const [nvidiaKey, setNvidiaKey] = useState(user?.nvidia_key ?? "");
  const [preferredModel, setPreferredModel] = useState(user?.preferred_model ?? "gemini:gemini-2.5-flash");
  const [redeemCode, setRedeemCode] = useState("");
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(true);
  
  // Hover & saving indicators
  const [isSaving, setIsSaving] = useState(false);
  const [activeAutoSaveProvider, setActiveAutoSaveProvider] = useState<string | null>(null);
  
  // Dynamic Model selector state
  const [activeTab, setActiveTab] = useState<string>("gemini");
  const [customModelInput, setCustomModelInput] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  // Set initial active tab based on preferred model provider
  useEffect(() => {
    if (preferredModel && preferredModel.includes(":")) {
      const provider = preferredModel.split(":")[0];
      if (PROVIDER_MODELS[provider]) {
        setActiveTab(provider);
      } else {
        setShowCustomInput(true);
        setCustomModelInput(preferredModel);
      }
    }
  }, [user?.preferred_model]);

  const save = async (customKeys?: Partial<User>) => {
    setIsSaving(true);
    try {
      const payload = {
        openai_key: customKeys?.openai_key !== undefined ? customKeys.openai_key : openaiKey,
        gemini_key: customKeys?.gemini_key !== undefined ? customKeys.gemini_key : geminiKey,
        anthropic_key: customKeys?.anthropic_key !== undefined ? customKeys.anthropic_key : anthropicKey,
        nvidia_key: customKeys?.nvidia_key !== undefined ? customKeys.nvidia_key : nvidiaKey,
        preferred_model: customKeys?.preferred_model !== undefined ? customKeys.preferred_model : preferredModel,
      };

      const response = await api<{ user: User; message: string }>("/settings/ai-gateway", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setUser(response.user);
      setMessage(response.message);
      setIsSuccess(true);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to update AI gateway settings.");
      setIsSuccess(false);
    } finally {
      setIsSaving(false);
      setActiveAutoSaveProvider(null);
    }
  };

  const handlePaste = (provider: string, pastedValue: string) => {
    setActiveAutoSaveProvider(provider);
    
    const updates: Partial<User> = {};
    if (provider === "openai") {
      setOpenaiKey(pastedValue);
      updates.openai_key = pastedValue;
    } else if (provider === "gemini") {
      setGeminiKey(pastedValue);
      updates.gemini_key = pastedValue;
    } else if (provider === "anthropic") {
      setAnthropicKey(pastedValue);
      updates.anthropic_key = pastedValue;
    } else if (provider === "nvidia") {
      setNvidiaKey(pastedValue);
      updates.nvidia_key = pastedValue;
    }
    
    // Auto-select tab of the pasted provider to reveal models immediately!
    setActiveTab(provider);
    
    // Trigger immediate database sync
    void save(updates);
  };

  const selectModel = (modelValue: string) => {
    setPreferredModel(modelValue);
    // Instant save preferred model selection
    void save({ preferred_model: modelValue });
  };

  const handleCustomModelSubmit = () => {
    if (customModelInput.trim()) {
      setPreferredModel(customModelInput);
      void save({ preferred_model: customModelInput });
    }
  };

  const redeem = async () => {
    if (!redeemCode.trim()) {
      setMessage("Please enter the gateway activation code.");
      setIsSuccess(false);
      return;
    }
    try {
      const response = await api<{ user: User; message: string }>("/settings/ai-gateway/redeem", {
        method: "POST",
        body: JSON.stringify({ code: redeemCode }),
      });
      setUser(response.user);
      setMessage(response.message);
      setIsSuccess(true);
      setRedeemCode("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to redeem activation code.");
      setIsSuccess(false);
    }
  };

  // Helper status render
  const renderProviderStatus = (keyVal: string, providerName: string) => {
    const isPasted = activeAutoSaveProvider === providerName;
    if (isPasted) {
      return <Badge text="SYNCING..." color="#06b6d4" />;
    }
    const hasKey = keyVal && keyVal.length > 8;
    return hasKey ? (
      <Badge text="CONNECTED" color="#10b981" />
    ) : (
      <Badge text="DISCONNECTED" color="#64748b" />
    );
  };

  // Check if a provider has active key
  const hasKey = (provider: string) => {
    if (provider === "gemini") return geminiKey && geminiKey.length > 8;
    if (provider === "openai") return openaiKey && openaiKey.length > 8;
    if (provider === "anthropic") return anthropicKey && anthropicKey.length > 8;
    if (provider === "nvidia") return nvidiaKey && nvidiaKey.length > 8;
    return false;
  };

  return (
    <RequireAuth>
      <Page>
        <NavBar />
        
        <Heading 
          title="AI Gateway Settings" 
          subtitle="Configure preferred academic model intelligence, API credentials, and license options." 
        />

        <View style={styles.layout}>
          
          {/* Main Provider Form Card */}
          <Card style={[getGlassStyle(0.2, 20) as any, styles.mainCard]}>
            <View style={styles.sectionHeader}>
              <AIGatewayIcon color="#8b5cf6" size={20} />
              <Text style={styles.sectionTitle}>Provider API Keys & Preferences</Text>
            </View>

            <View style={styles.formGroup}>
              
              {/* Dynamic Model Selector Terminal */}
              <View style={styles.selectorTerminal}>
                <Text style={styles.gridSectionHeader}>PREFERRED INTELLIGENCE MODEL</Text>
                
                {/* Active model summary */}
                <View style={styles.activeModelSummary}>
                  <ClockIcon color="#6366f1" size={16} />
                  <Text style={styles.activeModelLabel}>ACTIVE SELECTION: </Text>
                  <Text style={styles.activeModelValue}>{preferredModel.toUpperCase()}</Text>
                </View>

                {/* Tabs selection */}
                <View style={styles.tabsHeader}>
                  {Object.keys(PROVIDER_MODELS).map((provider) => {
                    const active = activeTab === provider;
                    const connected = hasKey(provider);
                    return (
                      <Pressable
                        key={provider}
                        onPress={() => {
                          setActiveTab(provider);
                          setShowCustomInput(false);
                        }}
                        style={[
                          styles.tabItem,
                          active ? styles.tabItemActive : styles.tabItemInactive,
                          connected && styles.tabItemConnected
                        ]}
                      >
                        <Text style={[
                          styles.tabText,
                          active ? styles.tabTextActive : styles.tabTextInactive,
                          connected && { color: "#10b981" }
                        ]}>
                          {provider.toUpperCase()}
                        </Text>
                        <View style={[
                          styles.tabIndicator,
                          connected ? { backgroundColor: "#10b981" } : { backgroundColor: "transparent" }
                        ]} />
                      </Pressable>
                    );
                  })}
                  <Pressable
                    onPress={() => setShowCustomInput(true)}
                    style={[styles.tabItem, showCustomInput ? styles.tabItemActive : styles.tabItemInactive]}
                  >
                    <Text style={[styles.tabText, showCustomInput ? styles.tabTextActive : styles.tabTextInactive]}>CUSTOM</Text>
                  </Pressable>
                </View>

                {/* Models List for the active provider tab */}
                {!showCustomInput ? (
                  <View style={styles.modelsGrid}>
                    {PROVIDER_MODELS[activeTab]?.map((model) => {
                      const isSelected = preferredModel === model.value;
                      const connected = hasKey(activeTab);

                      return (
                        <Pressable
                          key={model.value}
                          disabled={!connected}
                          onPress={() => selectModel(model.value)}
                          style={({ pressed }) => [
                            styles.modelItemCard,
                            isSelected ? styles.modelItemCardSelected : styles.modelItemCardNormal,
                            !connected && styles.modelItemCardLocked,
                            isSelected && (getGlowStyle("#6366f1", 0.15) as any),
                            {
                              transform: [{ scale: pressed ? 0.98 : 1 }]
                            }
                          ]}
                        >
                          <View style={styles.modelItemHeader}>
                            <Text style={[styles.modelItemLabel, isSelected && { color: "#ffffff" }]}>
                              {model.label}
                            </Text>
                            {isSelected ? (
                              <CheckCircleIcon color="#10b981" size={16} />
                            ) : !connected ? (
                              <Badge text="KEY REQUIRED" color="#ef4444" />
                            ) : null}
                          </View>
                          <Text style={styles.modelItemDesc}>{model.desc}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : (
                  /* Custom input panel */
                  <View style={styles.customInputPanel}>
                    <Text style={styles.customInputTip}>Enter the complete model identifier string (format: provider:model_name)</Text>
                    <View style={styles.customInputWrapper}>
                      <TextInput
                        value={customModelInput}
                        onChangeText={setCustomModelInput}
                        placeholder="e.g. openai:gpt-4o"
                        placeholderTextColor="#475569"
                        onSubmitEditing={handleCustomModelSubmit}
                        style={styles.customTextInput}
                      />
                      <Pressable onPress={handleCustomModelSubmit} style={styles.customSubmitBtn}>
                        <Text style={{ color: "#ffffff", fontWeight: "800", fontSize: 13 }}>Apply</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
              </View>

              <Text style={styles.gridSectionHeader}>PROVIDER API CREDENTIALS</Text>
              
              {/* API Keys grid layout */}
              <View style={styles.keysGrid}>
                
                {/* Column 1 */}
                <View style={styles.gridColumn}>
                  <View style={styles.fieldHeaderWrap}>
                    <Text style={styles.fieldTitle}>OPENAI API</Text>
                    {renderProviderStatus(openaiKey, "openai")}
                  </View>
                  <Field 
                    label="OpenAI API Key" 
                    placeholder="sk-proj-..."
                    value={openaiKey} 
                    onChangeText={setOpenaiKey} 
                    secureTextEntry
                    {...({
                      onPaste: (e: any) => {
                        const val = e.clipboardData?.getData("Text") || "";
                        if (val) handlePaste("openai", val);
                      }
                    } as any)}
                  />

                  <View style={styles.fieldHeaderWrap}>
                    <Text style={styles.fieldTitle}>GEMINI API</Text>
                    {renderProviderStatus(geminiKey, "gemini")}
                  </View>
                  <Field 
                    label="Gemini API Key" 
                    placeholder="AIzaSy..."
                    value={geminiKey} 
                    onChangeText={setGeminiKey} 
                    secureTextEntry
                    {...({
                      onPaste: (e: any) => {
                        const val = e.clipboardData?.getData("Text") || "";
                        if (val) handlePaste("gemini", val);
                      }
                    } as any)}
                  />
                </View>

                {/* Column 2 */}
                <View style={styles.gridColumn}>
                  <View style={styles.fieldHeaderWrap}>
                    <Text style={styles.fieldTitle}>ANTHROPIC API</Text>
                    {renderProviderStatus(anthropicKey, "anthropic")}
                  </View>
                  <Field 
                    label="Anthropic API Key" 
                    placeholder="sk-ant-..."
                    value={anthropicKey} 
                    onChangeText={setAnthropicKey} 
                    secureTextEntry
                    {...({
                      onPaste: (e: any) => {
                        const val = e.clipboardData?.getData("Text") || "";
                        if (val) handlePaste("anthropic", val);
                      }
                    } as any)}
                  />

                  <View style={styles.fieldHeaderWrap}>
                    <Text style={styles.fieldTitle}>NVIDIA NIM API</Text>
                    {renderProviderStatus(nvidiaKey, "nvidia")}
                  </View>
                  <Field 
                    label="NVIDIA NIM API Key" 
                    placeholder="nvapi-..."
                    value={nvidiaKey} 
                    onChangeText={setNvidiaKey} 
                    secureTextEntry
                    {...({
                      onPaste: (e: any) => {
                        const val = e.clipboardData?.getData("Text") || "";
                        if (val) handlePaste("nvidia", val);
                      }
                    } as any)}
                  />
                </View>

              </View>

              {message && !redeemCode ? (
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

              <Button 
                title={isSaving ? "Syncing..." : "Save AI Settings"} 
                onPress={() => void save()} 
                disabled={isSaving}
              />
            </View>
          </Card>

          {/* Activation Code / Redeem Secondary Card */}
          <Card style={[getGlassStyle(0.15, 20) as any, styles.sideCard]}>
            <View style={styles.sectionHeader}>
              <AIGatewayIcon color="#06b6d4" size={20} />
              <Text style={styles.sectionTitle}>Gateway Activation</Text>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.redeemTip}>
                If your institution or advisor provided a TierLog gateway access coupon, 
                please enter the code below for instant activation.
              </Text>
              
              <Field 
                label="Activation / Redeem Code" 
                placeholder="TL-XXXX-XXXX-XXXX"
                value={redeemCode} 
                onChangeText={setRedeemCode} 
              />

              {message && redeemCode !== "" ? (
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

              <Button 
                title="Activate Gateway" 
                onPress={() => void redeem()} 
                tone="secondary" 
              />
            </View>
          </Card>

        </View>
      </Page>
    </RequireAuth>
  );
}

const styles = StyleSheet.create({
  layout: {
    gap: 24,
    marginTop: 12,
    width: "100%",
  },
  mainCard: {
    padding: 32,
  },
  sideCard: {
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
  formGroup: {
    gap: 10,
  },
  gridSectionHeader: {
    color: "#6366f1",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 12,
    marginBottom: 8,
    borderBottomWidth: 1,
    borderColor: "rgba(255,255,255,0.02)",
    paddingBottom: 6,
  },
  keysGrid: {
    flexDirection: "row",
    gap: 20,
    flexWrap: "wrap",
  },
  gridColumn: {
    flex: 1,
    minWidth: 280,
    gap: 12,
  },
  fieldHeaderWrap: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: -4,
    marginTop: 4,
  },
  fieldTitle: {
    color: "#cbd5e1",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  redeemTip: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 20,
    fontWeight: "500",
    marginBottom: 10,
  },
  alertBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
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

  /* ==================== SELECTOR TERMINAL STYLES ==================== */
  selectorTerminal: {
    backgroundColor: "rgba(2, 6, 23, 0.35)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.03)",
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  activeModelSummary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.15)",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  activeModelLabel: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "900",
    letterSpacing: 1,
  },
  activeModelValue: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  tabsHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    gap: 16,
    overflow: "auto" as any,
  },
  tabItem: {
    paddingVertical: 10,
    paddingHorizontal: 6,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  tabItemActive: {},
  tabItemInactive: {
    opacity: 0.5,
  },
  tabItemConnected: {},
  tabText: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  tabTextInactive: {
    color: "#64748b",
  },
  tabIndicator: {
    position: "absolute",
    bottom: -1,
    left: 0,
    right: 0,
    height: 2,
    borderRadius: 99,
  },
  modelsGrid: {
    flexDirection: "row",
    gap: 14,
    flexWrap: "wrap",
    marginTop: 8,
  },
  modelItemCard: {
    flex: 1,
    minWidth: 260,
    maxWidth: "48%",
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 6,
    transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
  } as any,
  modelItemCardNormal: {
    backgroundColor: "rgba(2, 6, 23, 0.2)",
    borderColor: "rgba(255,255,255,0.03)",
  },
  modelItemCardSelected: {
    backgroundColor: "rgba(99, 102, 241, 0.06)",
    borderColor: "#6366f1",
  },
  modelItemCardLocked: {
    opacity: 0.45,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderColor: "rgba(255,255,255,0.01)",
  },
  modelItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modelItemLabel: {
    color: "#94a3b8",
    fontSize: 14,
    fontWeight: "800",
  },
  modelItemDesc: {
    color: "#64748b",
    fontSize: 11,
    lineHeight: 16,
    fontWeight: "500",
  },
  customInputPanel: {
    padding: 12,
    gap: 8,
  },
  customInputTip: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "600",
  },
  customInputWrapper: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  customTextInput: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.5)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 10,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    fontWeight: "500",
    outlineStyle: "none",
  } as any,
  customSubmitBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 11,
    borderRadius: 10,
  },
});
