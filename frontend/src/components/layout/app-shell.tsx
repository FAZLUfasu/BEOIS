"use client";

import { useState } from "react";

import { ProtectedApp } from "@/components/auth/protected-app";
import { Header } from "@/components/layout/header";
import { Sidebar } from "@/components/layout/sidebar";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({
  children,
}: AppShellProps) {
  const [collapsed, setCollapsed] =
    useState(false);

  const [mobileOpen, setMobileOpen] =
    useState(false);

  return (
    <ProtectedApp>
      <div className="min-h-screen bg-[var(--background)]">
        <Sidebar
          collapsed={collapsed}
          mobileOpen={mobileOpen}
          onToggle={() =>
            setCollapsed(
              (value) => !value,
            )
          }
          onMobileClose={() =>
            setMobileOpen(false)
          }
        />

        <div
          className={cn(
            "min-h-screen transition-[margin] duration-300",
            collapsed
              ? "lg:ml-[84px]"
              : "lg:ml-[270px]",
          )}
        >
          <Header
            onMenuClick={() =>
              setMobileOpen(true)
            }
          />

          <main className="px-4 py-6 sm:px-6 lg:px-8 lg:py-7">
            <div className="mx-auto w-full max-w-[1600px]">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedApp>
  );
}