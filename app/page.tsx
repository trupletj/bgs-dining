"use client";

import { ScanScreen } from "@/components/kiosk/scan-screen";
import { ChefLoginScreen } from "@/components/kiosk/chef-login-screen";
import { useChefAuth } from "@/hooks/use-chef-auth";

export default function Home() {
  const { isLoggedIn } = useChefAuth();

  if (!isLoggedIn) {
    return <ChefLoginScreen />;
  }

  return <ScanScreen />;
}
