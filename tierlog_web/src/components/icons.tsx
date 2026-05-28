import React from "react";
import { Platform } from "react-native";

// Types for customizable outline icons
export type IconProps = {
  color?: string;
  size?: number;
  style?: object;
};

// Styling helper for glassmorphic elements
export const getGlassStyle = (opacity = 0.45, blurRadius = 24) => {
  return {
    backgroundColor: `rgba(9, 13, 26, ${opacity})`,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.12)",
    borderRadius: 20,
    padding: 24,
    ...Platform.select({
      web: {
        backdropFilter: `blur(${blurRadius}px)`,
        WebkitBackdropFilter: `blur(${blurRadius}px)`,
        boxShadow: "0 12px 40px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 8,
      },
    }),
  };
};

// Glow style helper for indicators and buttons with robust hex parsing
export const getGlowStyle = (color = "#6366f1", intensity = 0.25) => {
  let rgb = "99, 102, 241"; // default indigo
  if (color.startsWith("#")) {
    const hex = color.replace("#", "");
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      rgb = `${r}, ${g}, ${b}`;
    } else if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      rgb = `${r}, ${g}, ${b}`;
    }
  } else if (color.startsWith("rgba")) {
    const match = color.match(/\d+/g);
    if (match && match.length >= 3) {
      rgb = `${match[0]}, ${match[1]}, ${match[2]}`;
    }
  } else if (color === "red" || color === "danger") {
    rgb = "239, 68, 68";
  } else if (color === "green" || color === "success") {
    rgb = "16, 185, 129";
  } else if (color === "amber" || color === "warning") {
    rgb = "245, 158, 11";
  }
  
  return Platform.select({
    web: {
      boxShadow: `0 0 20px 0 rgba(${rgb}, ${intensity}), inset 0 0 0 1px rgba(${rgb}, ${intensity * 1.5})`,
      borderColor: `rgba(${rgb}, ${intensity * 2})`,
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
    },
    default: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: intensity * 2.5,
      shadowRadius: 14,
      elevation: 6,
    },
  });
};

// Unified SVG wrapper for standardizing visual renders on Web
function SvgWrapper({
  size,
  children,
  style,
}: {
  size: number;
  children: React.ReactNode;
  style?: object;
}) {
  if (Platform.OS === "web") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ color: "inherit", ...style } as any}
      >
        {children}
      </svg>
    );
  }

  // Fallback for native wrapper or empty rendering (mostly web is target for tierlog_web)
  return null;
}

// 1. Dashboard Icon (Grid / Home Layout)
export function DashboardIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <rect x="3" y="3" width="7" height="9" />
        <rect x="14" y="3" width="7" height="5" />
        <rect x="14" y="12" width="7" height="9" />
        <rect x="3" y="16" width="7" height="5" />
      </SvgWrapper>
    </span>
  );
}

// 2. Consultation Icon (Chat Message Square)
export function ConsultationIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </SvgWrapper>
    </span>
  );
}

// 3. Archive Icon (Inbox/Folder Box)
export function ArchiveIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <polyline points="21 8 21 21 3 21 3 8" />
        <rect x="1" y="3" width="22" height="5" />
        <line x1="10" y1="12" x2="14" y2="12" />
      </SvgWrapper>
    </span>
  );
}

// 4. Profile Icon (User Outline)
export function ProfileIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </SvgWrapper>
    </span>
  );
}

// 5. Security Icon (Lock Outline)
export function SecurityIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </SvgWrapper>
    </span>
  );
}

// 6. AI Gateway Icon (CPU / Chip Outline)
export function AIGatewayIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <rect x="4" y="4" width="16" height="16" rx="2" />
        <rect x="9" y="9" width="6" height="6" />
        <line x1="9" y1="1" x2="9" y2="4" />
        <line x1="15" y1="1" x2="15" y2="4" />
        <line x1="9" y1="20" x2="9" y2="23" />
        <line x1="15" y1="20" x2="15" y2="23" />
        <line x1="20" y1="9" x2="23" y2="9" />
        <line x1="20" y1="15" x2="23" y2="15" />
        <line x1="1" y1="9" x2="4" y2="9" />
        <line x1="1" y1="15" x2="4" y2="15" />
      </SvgWrapper>
    </span>
  );
}

// 7. Logout Icon (Log Out / Shift Exit)
export function LogoutIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
        <polyline points="16 17 21 12 16 7" />
        <line x1="21" y1="12" x2="9" y2="12" />
      </SvgWrapper>
    </span>
  );
}

// 8. Cloud Upload Icon (Arrow pointing up to Cloud)
export function CloudUploadIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <path d="M21.2 15c.7-1.2 1-2.5.7-3.9-.3-2-1.9-3.6-3.9-3.9-1.3-.2-2.6.2-3.6 1L12.8 5.6C12.3 4 10.8 3 9.2 3.1c-1.9.1-3.4 1.7-3.4 3.7V7c-2 1-3 3-2.6 5.2.3 1.9 1.9 3.5 3.9 3.7h13c.4 0 .9-.3 1.2-.9z" />
        <polyline points="16 16 12 12 8 16" />
        <line x1="12" y1="12" x2="12" y2="21" />
      </SvgWrapper>
    </span>
  );
}

// 9. Check Circle (Validated Tick)
export function CheckCircleIcon({ color = "#10b981", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </SvgWrapper>
    </span>
  );
}

// 10. Clock Icon (Pending State Timer)
export function ClockIcon({ color = "#f59e0b", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </SvgWrapper>
    </span>
  );
}

// 11. Chevron Right (Arrow navigation)
export function ChevronRightIcon({ color = "#94a3b8", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <polyline points="9 18 15 12 9 6" />
      </SvgWrapper>
    </span>
  );
}

// 12. Alert Icon (Warning/Danger indicator)
export function AlertIcon({ color = "#ef4444", size = 20, style }: IconProps) {
  return (
    <span style={{ color, display: "inline-flex", ...style }}>
      <SvgWrapper size={size}>
        <circle cx="12" cy="12" r="10" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </SvgWrapper>
    </span>
  );
}
