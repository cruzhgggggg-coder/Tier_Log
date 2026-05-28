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
          background: rgba(7, 10, 19, 0.3);
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.25);
          border-radius: 99px;
          border: 2px solid #070a13;
        }
        ::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.5);
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
          background: rgba(99, 102, 241, 0.3);
          color: #ffffff;
        }
        
        /* Global body properties to match deep Clarity backdrop */
        body {
          background-color: #070a13 !important;
          margin: 0;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
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

