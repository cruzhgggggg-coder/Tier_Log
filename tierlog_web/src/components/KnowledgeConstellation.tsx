import React, { useState, useRef, useEffect, useMemo, Component } from "react";
import { Platform, View, Text, StyleSheet, Pressable } from "react-native";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

// ─── TYPES ──────────────────────────────────────────────────────────
export interface ConstellationNode {
  id: number;
  position: [number, number, number];
  color: string;
  name: string;
  tag: string;
  description: string;
}

// Industrial Telemetry Nodes
const NODES: ConstellationNode[] = [
  {
    id: 1,
    position: [-2.2, 1.2, 0],
    color: "#3B82F6", // Steel Blue
    name: "PROP-101: AI Oracle Academic Copilot",
    tag: "NVIDIA NIM POWERED CONTEXT COGNITION",
    description: "Generates precise, contextual solutions and revision guidance directly from your advisor's feedback using personal API keys.",
  },
  {
    id: 2,
    position: [-1.0, -1.2, 0.8],
    color: "#0F766E", // Deep Teal
    name: "CHAT-204: Real-Time Advisory Chat",
    tag: "SECURE PEER-TO-PEER WEBSOCKET SYNCHRONIZATION",
    description: "Facilitates immediate, persistent text discussions and live sync checkpoints between students and their advisors.",
  },
  {
    id: 3,
    position: [0.8, 1.6, -0.5],
    color: "#6366F1", // Indigo
    name: "STT-309: High-Fidelity Audio Transcription",
    tag: "INTELLIGENT SPEECH-TO-TEXT DIALOGUE ENGINE",
    description: "Converts raw advisory audio recordings into structured, search-ready text transcripts for immediate academic auditing.",
  },
  {
    id: 4,
    position: [2.2, -0.4, 0.5],
    color: "#3B82F6",
    name: "VAL-402: Contextual Revision Validation",
    tag: "BIDIRECTIONAL STATUS RESOLUTION SYSTEM",
    description: "Symmetric validation workflow where students submit fixes and advisors validate or revoke approvals instantly.",
  },
  {
    id: 5,
    position: [0.4, -1.8, -0.8],
    color: "#0F766E",
    name: "ARC-510: Document Version Archive",
    tag: "SECURE DRAFT STORAGE & ANNOTATION LOGS",
    description: "Stores complete historical records of thesis drafts, uploaded manuscripts, and annotated adviser feedback pages.",
  },
  {
    id: 6,
    position: [-0.6, 0.2, -1.8],
    color: "#6366F1",
    name: "MET-612: Hyper-Minimalist Analytics",
    tag: "INTEGRATED COMPLETION RATE STATISTICS",
    description: "Aggregates active revisions, completion velocity, and pending validation items into an executive-grade dashboard.",
  },
];

// Defined connections between nodes
const CONNECTIONS = [
  [1, 2], [1, 3], [1, 6],
  [2, 4], [2, 5],
  [3, 4], [3, 6],
  [4, 5],
  [5, 6],
];

// ─── ERROR BOUNDARY TO TRAP WEBGL CRASHES ────────────────────────────
class CanvasErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.warn("R3F 3D Canvas failed to instantiate, gracefully falling back.", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// ─── SVG VECTOR GRAPH FALLBACK (100% BULLETPROOF & HIGH PERFORMANCE) ───
interface SVGFallbackProps {
  hoveredNodeId: number | null;
  setHoveredNodeId: (id: number | null) => void;
}

function SVGConstellationFallback({ hoveredNodeId, setHoveredNodeId }: SVGFallbackProps) {
  const svgWidth = 500;
  const svgHeight = 480;

  // Convert 3D positions to 2D SVG canvas coordinate space
  const mappedNodes = useMemo(() => {
    return NODES.map((node) => {
      const x = ((node.position[0] + 2.6) / 5.2) * (svgWidth - 120) + 60;
      const y = ((-node.position[1] + 2.2) / 4.4) * (svgHeight - 180) + 50;
      return { ...node, x, y };
    });
  }, [svgWidth, svgHeight]);

  return (
    <View style={styles.fallbackContainer}>
      {Platform.OS === "web" ? (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <defs>
            <radialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Ambient center soft light */}
          <circle cx={svgWidth / 2} cy={svgHeight / 2} r={svgHeight * 0.45} fill="url(#glowGrad)" />

          {/* Constellation Grid Connections */}
          {CONNECTIONS.map(([startId, endId], idx) => {
            const startNode = mappedNodes.find((n) => n.id === startId);
            const endNode = mappedNodes.find((n) => n.id === endId);
            if (startNode && endNode) {
              return (
                <line
                  key={`line-${idx}`}
                  x1={startNode.x}
                  y1={startNode.y}
                  x2={endNode.x}
                  y2={endNode.y}
                  stroke="#6366F1"
                  strokeWidth={1}
                  strokeOpacity={0.25}
                  strokeDasharray="4 4"
                />
              );
            }
            return null;
          })}

          {/* Interactive Node Rings and Dots */}
          {mappedNodes.map((node) => {
            const isActive = hoveredNodeId === node.id;
            return (
              <g
                key={node.id}
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHoveredNodeId(node.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
              >
                {/* Frosted glow ring */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 22 : 12}
                  fill={node.color}
                  fillOpacity={isActive ? 0.22 : 0.08}
                  style={{ transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
                {/* Core node coordinate point */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r={isActive ? 7 : 5}
                  fill={node.color}
                  style={{ transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
                />
                {/* Hover coordinate label */}
                {isActive && (
                  <text
                    x={node.x + 16}
                    y={node.y - 8}
                    fill="#6366F1"
                    fontSize={8}
                    fontWeight="800"
                    fontFamily="monospace"
                  >
                    {`[${node.position[0].toFixed(1)}, ${node.position[1].toFixed(1)}, ${node.position[2].toFixed(1)}]`}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      ) : (
        <View style={styles.fallbackGraph}>
          {NODES.map((node) => (
            <View
              key={node.id}
              style={[
                styles.fallbackDot,
                {
                  left: `${(node.position[0] + 3.5) * 14}%`,
                  top: `${(node.position[1] + 2.5) * 20}%`,
                  backgroundColor: node.color,
                },
              ]}
            />
          ))}
        </View>
      )}

      {/* Floating coordinates indicator */}
      <View style={styles.coordinatesHud}>
        <Text style={styles.hudText}>AXIS SYNC: 100%</Text>
        <Text style={styles.hudText}>NODES ONLINE: 6/6</Text>
      </View>
    </View>
  );
}

// ─── Concentric Glowing Telemetry Rings (100% Native R3F) ───────────────
function NodeTelemetryHud({ node, isActive }: { node: ConstellationNode; isActive: boolean }) {
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (isActive) {
      const elapsed = state.clock.getElapsedTime();
      if (ringRef1.current) {
        ringRef1.current.rotation.z = elapsed * 0.9;
        // Dynamic spring-like breathing amplitude pulse
        const scale = 1.0 + Math.sin(elapsed * 4.5) * 0.05;
        ringRef1.current.scale.set(scale, scale, 1);
      }
      if (ringRef2.current) {
        ringRef2.current.rotation.z = -elapsed * 0.45;
      }
    }
  });

  if (!isActive) return null;

  return (
    <group>
      {/* Concentric Ring 1: Spinning clockwise */}
      <mesh ref={ringRef1} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.2, 0.22, 32]} />
        <meshBasicMaterial
          color="#14B8A6" // Soft glowing Cyber Teal
          transparent
          opacity={0.65}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* Concentric Ring 2: Spinning counter-clockwise */}
      <mesh ref={ringRef2} rotation={[0, 0, 0]}>
        <ringGeometry args={[0.25, 0.27, 6]} />
        <meshBasicMaterial
          color="#6366F1" // Indigo accent ring
          transparent
          opacity={0.4}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

// ─── Dynamic Ambient Nebula Lights (PointLights loop) ────────────────
function FloatingNebulaLights() {
  const lightRef1 = useRef<THREE.PointLight>(null);
  const lightRef2 = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    // Light 1: slow orbital loop
    if (lightRef1.current) {
      lightRef1.current.position.x = Math.sin(elapsed * 0.4) * 3;
      lightRef1.current.position.z = Math.cos(elapsed * 0.4) * 2;
      lightRef1.current.position.y = Math.sin(elapsed * 0.2) * 1.2;
    }
    // Light 2: counter-orbital loop
    if (lightRef2.current) {
      lightRef2.current.position.x = Math.cos(elapsed * 0.3) * -3;
      lightRef2.current.position.z = Math.sin(elapsed * 0.3) * -2;
      lightRef2.current.position.y = Math.cos(elapsed * 0.15) * -1.2;
    }
  });

  return (
    <group>
      <pointLight ref={lightRef1} intensity={2.0} distance={6} color="#6366F1" /> {/* Deep Indigo */}
      <pointLight ref={lightRef2} intensity={1.8} distance={6} color="#14B8A6" /> {/* Cyber Teal */}
    </group>
  );
}

// ─── Wireframe Crystal Background Debris ─────────────────────────────
function BackgroundWireframeDebris() {
  const meshRef1 = useRef<THREE.Mesh>(null);
  const meshRef2 = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (meshRef1.current) {
      meshRef1.current.rotation.y = elapsed * 0.08;
      meshRef1.current.rotation.x = elapsed * 0.04;
      meshRef1.current.position.y = -1.8 + Math.sin(elapsed * 0.25) * 0.12;
    }
    if (meshRef2.current) {
      meshRef2.current.rotation.y = -elapsed * 0.06;
      meshRef2.current.rotation.z = elapsed * 0.05;
      meshRef2.current.position.y = 1.8 + Math.cos(elapsed * 0.2) * 0.12;
    }
  });

  return (
    <group>
      {/* Bottom-right crystal debris */}
      <mesh ref={meshRef1} position={[2.8, -1.8, -2.5]}>
        <octahedronGeometry args={[0.3, 1]} />
        <meshBasicMaterial color="#6366F1" wireframe transparent opacity={0.12} />
      </mesh>
      {/* Top-left crystal debris */}
      <mesh ref={meshRef2} position={[-2.8, 1.8, -2.5]}>
        <octahedronGeometry args={[0.25, 1]} />
        <meshBasicMaterial color="#14B8A6" wireframe transparent opacity={0.12} />
      </mesh>
    </group>
  );
}

// ─── Spiral Telemetry Advisory Core (TorusKnot structure) ───────────
function TelemetryCore() {
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();
    if (coreRef.current) {
      coreRef.current.rotation.y = elapsed * 0.06;
      coreRef.current.rotation.x = elapsed * 0.03;
      // Pulse scale
      const scale = 1.0 + Math.sin(elapsed * 2) * 0.025;
      coreRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={coreRef} position={[0, 0, -1.2]}>
      <torusKnotGeometry args={[1.2, 0.06, 120, 8]} />
      <meshBasicMaterial
        color="#6366F1"
        wireframe
        transparent
        opacity={0.07}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

// ─── 3D INDIVIDUAL INTERACTIVE NODE ──────────────────────────────────
interface InteractiveMeshNodeProps {
  node: ConstellationNode;
  isHovered: boolean;
  onHover: (id: number | null) => void;
}

function InteractiveMeshNode({ node, isHovered, onHover }: InteractiveMeshNodeProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [localHover, setLocalHover] = useState(false);
  const baseScale = 0.16;

  // Animate node scale on hover and float organically (0 Drei dependencies)
  useFrame((state) => {
    const elapsed = state.clock.getElapsedTime();

    // 1. Weightless organic float loop natively (replaces Drei Float)
    if (groupRef.current) {
      groupRef.current.position.y = Math.sin(elapsed * 1.5 + node.id) * 0.06;
    }

    if (meshRef.current) {
      const targetScale = (localHover || isHovered) ? baseScale * 1.55 : baseScale;
      meshRef.current.scale.x = THREE.MathUtils.lerp(meshRef.current.scale.x, targetScale, 0.12);
      meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetScale, 0.12);
      meshRef.current.scale.z = THREE.MathUtils.lerp(meshRef.current.scale.z, targetScale, 0.12);

      // Gentle pulsing emission glow
      const material = meshRef.current.material as THREE.MeshStandardMaterial;
      if (material) {
        material.emissiveIntensity = THREE.MathUtils.lerp(
          material.emissiveIntensity,
          (localHover || isHovered) ? 0.95 : 0.28 + Math.sin(elapsed * 3 + node.id) * 0.12,
          0.1
        );
      }
    }
  });

  return (
    <group ref={groupRef} position={node.position}>
      {/* Concentric glowing rings sub-component */}
      <NodeTelemetryHud node={node} isActive={localHover || isHovered} />

      <mesh
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setLocalHover(true);
          onHover(node.id);
          if (typeof window !== "undefined") {
            document.body.style.cursor = "pointer";
          }
        }}
        onPointerOut={() => {
          setLocalHover(false);
          onHover(null);
          if (typeof window !== "undefined") {
            document.body.style.cursor = "default";
          }
        }}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={node.color}
          roughness={0.08}
          metalness={0.15}
          emissive={node.color}
          emissiveIntensity={0.3}
        />
      </mesh>
    </group>
  );
}

// ─── 3D SCENE ORCHESTRATION ──────────────────────────────────────────
interface SceneProps {
  hoveredNodeId: number | null;
  setHoveredNodeId: (id: number | null) => void;
  mouseRef: React.MutableRefObject<{ x: number; y: number }>;
}

function Scene({ hoveredNodeId, setHoveredNodeId, mouseRef }: SceneProps) {
  const groupRef = useRef<THREE.Group>(null);
  const { size } = useThree();

  // Cinematic figure-8 drift & Frame-rate independent exponential camera tracking
  useFrame((state, delta) => {
    if (groupRef.current) {
      const elapsed = state.clock.getElapsedTime();
      
      // Calculate slow, elegant polar Lissajous ambient drift (figure-8)
      const floatX = Math.sin(elapsed * 0.15) * 0.12;
      const floatY = Math.cos(elapsed * 0.08) * 0.08;

      // targetY and targetX controls camera rotation angles with decay math
      const targetRotY = (mouseRef.current.x * 0.28) + floatX;
      const targetRotX = (mouseRef.current.y * 0.18) + floatY;

      // Dampen mouse alignment smoothly using exp decay decay = 4.5
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotY,
        1.0 - Math.exp(-4.5 * delta)
      );
      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotX,
        1.0 - Math.exp(-4.5 * delta)
      );

      // Smooth vertical levitation wave
      groupRef.current.position.y = Math.sin(elapsed * 0.35) * 0.08;
    }
  });

  // Calculate connection lines geometry
  const lineGeometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    CONNECTIONS.forEach(([startId, endId]) => {
      const startNode = NODES.find((n) => n.id === startId);
      const endNode = NODES.find((n) => n.id === endId);
      if (startNode && endNode) {
        points.push(new THREE.Vector3(...startNode.position));
        points.push(new THREE.Vector3(...endNode.position));
      }
    });
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);

  const scale = useMemo(() => {
    const width = size.width;
    if (width < 600) return 0.7;
    if (width < 1000) return 0.85;
    return 1.05;
  }, [size.width]);

  return (
    <group ref={groupRef} scale={[scale, scale, scale]} position={[0, 0.35, 0]}>
      {/* Dynamic Specular Shines & Ambient Nebula pointLights */}
      <FloatingNebulaLights />

      {/* Wireframe background structures for high spatial density */}
      <BackgroundWireframeDebris />
      <TelemetryCore />

      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={0.8} color="#F1F5F9" />
      <directionalLight position={[-8, 5, 2]} intensity={0.4} color="#94A3B8" />

      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial
          color="#6366F1" // Indigo telemetry link lines
          transparent
          opacity={0.22} // Elevated opacity for dark mode readability
          linewidth={1}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* Interactive Nodes mapped with native spring flotation */}
      {NODES.map((node) => (
        <InteractiveMeshNode
          key={node.id}
          node={node}
          isHovered={hoveredNodeId === node.id}
          onHover={setHoveredNodeId}
        />
      ))}
    </group>
  );
}

// ─── MAIN EXPORTED COMPONENT ─────────────────────────────────────────
export default function KnowledgeConstellation() {
  const [hoveredNodeId, setHoveredNodeId] = useState<number | null>(null);
  const mouse = useRef({ x: 0, y: 0 });

  // Listen to windows mouse coordinates for depth effect
  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const activeNode = useMemo(() => {
    return NODES.find((n) => n.id === hoveredNodeId) || null;
  }, [hoveredNodeId]);

  return (
    <View style={styles.container}>
      {/* 3D WebGL Canvas Layer wrapped in ErrorBoundary */}
      <CanvasErrorBoundary
        fallback={
          <SVGConstellationFallback
            hoveredNodeId={hoveredNodeId}
            setHoveredNodeId={setHoveredNodeId}
          />
        }
      >
        <View style={styles.canvasWrapper}>
          <Canvas
            camera={{ position: [0, 0, 4.2], fov: 65 }}
            gl={{ antialias: true, alpha: true }}
            style={{ width: "100%", height: "100%" }}
          >
            <Scene
              hoveredNodeId={hoveredNodeId}
              setHoveredNodeId={setHoveredNodeId}
              mouseRef={mouse}
            />
          </Canvas>
        </View>
      </CanvasErrorBoundary>

      {/* Absolute Overlay: Hyper-Minimalist Active State Console HUD */}
      <View style={styles.consoleOverlay} pointerEvents="none">
        <View style={[styles.frostedConsole, activeNode && styles.consoleExpanded]}>
          <View style={styles.hudHeaderRow}>
            {/* Blinking system-active LED indicator */}
            <View style={styles.ledIndicator} />
            <Text style={styles.consoleStatus}>
              {activeNode ? `TELEMETRY NODE 0${activeNode.id} CONNECTED` : "ACADEMIC CONSOLE::SYSTEM_ONLINE"}
            </Text>
          </View>
          <Text style={styles.consoleTitle}>
            {activeNode ? activeNode.name : "Academic Progress Graph Structure"}
          </Text>
          <Text style={styles.consoleSubtitle}>
            {activeNode ? activeNode.tag : "Hover over coordinates to retrieve active draft parameters"}
          </Text>

          {activeNode ? (
            <View style={styles.consoleDetailBox}>
              <Text style={styles.consoleDesc} numberOfLines={3}>
                {activeNode.description}
              </Text>
              <View style={styles.consoleTelemetryRow}>
                <Text style={styles.telemetryText}>
                  COORDINATE: <Text style={styles.telemetryVal}>[{activeNode.position[0].toFixed(2)}, {activeNode.position[1].toFixed(2)}, {activeNode.position[2].toFixed(2)}]</Text>
                </Text>
                <Text style={styles.telemetryText}>
                  WEIGHT_VAL: <Text style={styles.telemetryVal}>{((activeNode.id * 1.618) + 2.14).toFixed(3)}</Text>
                </Text>
              </View>
            </View>
          ) : (
            <View style={styles.interactiveGuide}>
              {NODES.map((n) => (
                <Pressable
                  key={n.id}
                  onPressIn={() => setHoveredNodeId(n.id)}
                  onPressOut={() => setHoveredNodeId(null)}
                  style={[
                    styles.guideTab,
                    hoveredNodeId === n.id && { backgroundColor: `${n.color}18`, borderColor: n.color }
                  ]}
                >
                  <Text style={[styles.guideTabText, hoveredNodeId === n.id && { color: n.color }]}>
                    Node 0{n.id}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── STYLES ─────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    height: 560,
    position: "relative",
    width: "100%",
    borderRadius: 24,
    overflow: "hidden",
  },
  canvasWrapper: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1,
  },
  consoleOverlay: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  hudHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 2,
  },
  ledIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981", // glowing emerald
    boxShadow: "0 0 8px #10B981",
  } as any,
  frostedConsole: {
    backgroundColor: "rgba(10, 15, 30, 0.85)", // deep technical glass
    borderWidth: 1,
    borderColor: "rgba(20, 184, 166, 0.25)", // micro-edge cyan glow border
    borderRadius: 16,
    padding: 16,
    backdropFilter: "blur(24px)",
    WebkitBackdropFilter: "blur(24px)",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 4,
    gap: 4,
    transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
  } as any,
  consoleExpanded: {
    borderColor: "rgba(99, 102, 241, 0.35)", // indigo boundary
    boxShadow: "0 12px 28px rgba(0, 0, 0, 0.4), 0 0 16px rgba(99, 102, 241, 0.08)",
  } as any,
  consoleStatus: {
    fontSize: 9,
    fontWeight: "900",
    color: "#94A3B8", // titanium steel
    letterSpacing: 1.5,
    fontFamily: "monospace",
  },
  consoleTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#F8FAFC",
    letterSpacing: -0.3,
  },
  consoleSubtitle: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  consoleDetailBox: {
    marginTop: 8,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 8,
    gap: 6,
  },
  consoleDesc: {
    fontSize: 12,
    lineHeight: 18,
    color: "#CBD5E1",
    fontWeight: "500",
  },
  consoleTelemetryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 2,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.04)",
    paddingTop: 6,
  },
  telemetryText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#64748B",
    fontFamily: "monospace",
    letterSpacing: 0.5,
  },
  telemetryVal: {
    color: "#14B8A6", // cyber-teal glow text
    fontWeight: "900",
    fontVariantNumeric: "tabular-nums",
  } as any,
  interactiveGuide: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
    borderTopWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.06)",
    paddingTop: 10,
  },
  guideTab: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "rgba(255, 255, 255, 0.02)",
    transition: "all 0.2s ease",
    pointerEvents: "auto",
  } as any,
  guideTabText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
  fallbackContainer: {
    flex: 1,
    height: 560,
    backgroundColor: "#080B15", // Dark Midnight Fallback
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
  },
  fallbackGraph: {
    width: "80%",
    height: "80%",
    position: "relative",
  },
  fallbackDot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowColor: "#94a3b8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  coordinatesHud: {
    position: "absolute",
    top: 16,
    right: 16,
    alignItems: "flex-end",
    gap: 2,
  },
  hudText: {
    fontSize: 8,
    fontWeight: "900",
    color: "#64748B",
    letterSpacing: 1.2,
  },
});
