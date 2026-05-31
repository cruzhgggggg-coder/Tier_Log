import { Stack } from "expo-router";
import React, { useEffect } from "react";
import { Platform } from "react-native";
import { StatusBar } from "expo-status-bar";

import { AuthProvider } from "@/src/providers/AuthProvider";

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === "web" && typeof document !== "undefined") {
      const style = document.createElement("style");
      style.textContent = `
        /* Custom minimalist scrollbar styling */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.35);
          border-radius: 99px;
          border: 2px solid #020617;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.6);
        }
        
        /* Custom ultra-thin scrollbar for transcripts and chats */
        .ultra-thin-scroll::-webkit-scrollbar {
          width: 4px !important;
          height: 4px !important;
        }
        .ultra-thin-scroll::-webkit-scrollbar-track {
          background: transparent !important;
        }
        .ultra-thin-scroll::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.4) !important;
          border-radius: 99px !important;
        }
        .ultra-thin-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7) !important;
        }
        .ultra-thin-scroll {
          scrollbar-width: thin !important;
          scrollbar-color: rgba(99, 102, 241, 0.4) transparent !important;
        }
        
        /* Smooth text selection styling */
        ::selection {
          background: rgba(99, 102, 241, 0.4);
          color: #ffffff;
        }
        
        /* Global html, body, and root properties for fullscreen immersive dark mode */
        html, body, #root, div[data-reactroot] {
          background-color: #020617 !important;
          margin: 0 !important;
          padding: 0 !important;
          height: 100% !important;
          width: 100% !important;
          min-height: 100vh !important;
          min-width: 100vw !important;
          overflow: hidden;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        }
        
        /* Force react-native-web top elements to stretch to full viewport height */
        #root > div {
          height: 100% !important;
          width: 100% !important;
          display: flex !important;
          flex-direction: column !important;
        }
        
        /* Remove default browser focus outlines on Canvas and active tap highlights */
        canvas, div, [tabindex] {
          outline: none !important;
          -webkit-tap-highlight-color: transparent !important;
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

