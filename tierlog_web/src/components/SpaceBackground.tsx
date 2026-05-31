import React, { Component, useMemo, useRef, useEffect } from "react";
import { Platform, View, StyleSheet } from "react-native";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

// --- Graceful Fallback for Full Page WebGL Errors ---
class BackgroundErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return <View style={styles.gradientFallback} />;
    }
    return this.props.children;
  }
}

// --- Infinite Grid Shader Material Specification (Midnight Dark Edition) ---
const GridShader = {
  uniforms: {
    uGridColor: { value: new THREE.Color("#1E293B") }, // Dark charcoal grid lines for subtle telemetry mapping
    uSpotColor: { value: new THREE.Color("#6366F1") }, // Vibrant Indigo cursor tracking spot
    uMousePos: { value: new THREE.Vector3(0, 0, 0) },
    uPixelRatio: { value: 1 },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    uniform vec3 uGridColor;
    uniform vec3 uSpotColor;
    uniform vec3 uMousePos;
    uniform float uPixelRatio;

    void main() {
      // Screen-space grid derivatives for infinite crisp sharpness
      vec2 coord = vWorldPosition.xz * 0.45;
      vec2 grid = abs(fract(coord - 0.5) - 0.5) / (fwidth(coord) * 1.6 * uPixelRatio);
      float line = min(grid.x, grid.y);
      float gridPattern = 1.0 - min(line, 1.0);
      
      // Soothing depth horizon falloff (fog)
      float depth = gl_FragCoord.z / gl_FragCoord.w;
      float horizonFade = 1.0 - smoothstep(11.0, 26.0, depth);
      
      // Dynamic pointer tracking spotlight
      float mouseDist = distance(vWorldPosition.xz, uMousePos.xz);
      float spotGlow = 1.0 - smoothstep(0.0, 7.5, mouseDist);
      
      // Luxury color blend between passive slate grid & active neon spotlight
      vec3 gridColor = mix(uGridColor, uSpotColor, spotGlow * 0.75);
      float finalAlpha = gridPattern * horizonFade * (0.09 + spotGlow * 0.32);
      
      gl_FragColor = vec4(gridColor, finalAlpha);
    }
  `
};

// --- Rotating Procedural Grid & Atmospheric Sparkles ---
function AdvancedTelemetryGrid({ mouseRef }: { mouseRef: React.MutableRefObject<{ x: number; y: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const targetMouse = useRef(new THREE.Vector3(0, 0, 0));

  // Generate 80 slow-moving background points natively (0 Drei dependencies)
  const [particlePositions] = useMemo(() => {
    const count = 80;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 20;     // X range
      pos[i * 3 + 1] = (Math.random() - 0.5) * 12; // Y range
      pos[i * 3 + 2] = (Math.random() - 0.5) * 12; // Z range
    }
    return [pos];
  }, []);

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime();

    // Subtle rotational oscillation of the plane grid
    if (meshRef.current) {
      meshRef.current.rotation.z = Math.sin(elapsed * 0.025) * 0.04;
    }

    // Gentle orbital rotation of background dust particles
    if (particlesRef.current) {
      particlesRef.current.rotation.y = elapsed * 0.005;
      particlesRef.current.rotation.x = Math.sin(elapsed * 0.006) * 0.01;
    }

    // Performance-safe direct uniform mutation: exponential lerp math
    if (materialRef.current) {
      // Convert normalized screen coords back to grid space coordinates
      targetMouse.current.set(mouseRef.current.x * 6.5, 0, -mouseRef.current.y * 6.5);
      materialRef.current.uniforms.uMousePos.value.lerp(
        targetMouse.current,
        1.0 - Math.exp(-5.5 * delta) // frame-rate independent exp lerp decay
      );
      materialRef.current.uniforms.uPixelRatio.value = typeof window !== "undefined" ? window.devicePixelRatio : 1;
    }
  });

  return (
    <group>
      {/* Hyper-Luxury Procedural Infinite Shader Grid */}
      <mesh ref={meshRef} position={[0, -3.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[100, 100]} />
        <shaderMaterial
          ref={materialRef}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          args={[GridShader]}
        />
      </mesh>

      {/* GPU-Accelerated Dynamic Atmospheric Sparkles (Native Three.js Points) */}
      <points ref={particlesRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[particlePositions, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          color="#14B8A6" // cyber-teal glow
          size={0.07}
          sizeAttenuation
          transparent
          opacity={0.45} // Slightly brighter for dark mode contrast
        />
      </points>
    </group>
  );
}

export default function SpaceBackground() {
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (Platform.OS !== "web") return;

    const handleMouseMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  if (Platform.OS !== "web") {
    return <View style={styles.gradientFallback} />;
  }

  return (
    <View style={styles.backgroundContainer}>
      <BackgroundErrorBoundary>
        <Canvas
          camera={{ position: [0, 0, 8], fov: 60 }}
          gl={{ antialias: true, alpha: true }}
          style={styles.canvas}
        >
          <ambientLight intensity={0.5} />
          <directionalLight position={[0, 6, 6]} intensity={0.4} color="#F1F5F9" />
          <AdvancedTelemetryGrid mouseRef={mouse} />
        </Canvas>
      </BackgroundErrorBoundary>
      {/* Ambient gradient overlay to blend into deep obsidian */}
      <View style={styles.overlay} />
    </View>
  );
}

const styles = StyleSheet.create({
  backgroundContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    backgroundColor: "#020617", // Midnight Obsidian
  },
  canvas: {
    width: "100%",
    height: "100%",
  },
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "transparent",
    backgroundImage: "radial-gradient(circle at center, rgba(2, 6, 23, 0.1) 0%, #020617 88%)",
  } as any,
  gradientFallback: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: -1,
    backgroundColor: "#020617",
    backgroundImage: "radial-gradient(circle at center, #0B1530 0%, #020617 100%)",
  } as any,
});
