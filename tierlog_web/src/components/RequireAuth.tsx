import { Redirect } from "expo-router";
import React from "react";
import { ActivityIndicator, View } from "react-native";

import { useAuth } from "@/src/providers/AuthProvider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { booting, user } = useAuth();

  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#030712" }}>
        <ActivityIndicator color="#818cf8" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/login" />;
  }

  return <>{children}</>;
}
