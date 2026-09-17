"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
} from "@/lib/auth/auth-api";
import {
  getRefreshToken,
} from "@/lib/auth/storage";
import type {
  CurrentUser,
} from "@/types/auth";

interface AuthContextValue {
  user: CurrentUser | null;
  loading: boolean;
  authenticated: boolean;
  login: (
    username: string,
    password: string,
  ) => Promise<CurrentUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext =
  createContext<AuthContextValue | null>(
    null,
  );

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [user, setUser] =
    useState<CurrentUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const refreshUser =
    useCallback(async () => {
      try {
        const currentUser =
          await getCurrentUser();

        setUser(currentUser);
      } catch {
        logoutRequest();
        setUser(null);
      }
    }, []);

  useEffect(() => {
    async function initialize() {
      if (!getRefreshToken()) {
        setLoading(false);
        return;
      }

      try {
        await refreshUser();
      } finally {
        setLoading(false);
      }
    }

    void initialize();
  }, [refreshUser]);

  const handleLogin =
    useCallback(
      async (
        username: string,
        password: string,
      ) => {
        const currentUser =
          await loginRequest(
            username,
            password,
          );

        setUser(currentUser);

        return currentUser;
      },
      [],
    );

  const handleLogout =
    useCallback(() => {
      logoutRequest();
      setUser(null);
    }, []);

  const hasRole =
    useCallback(
      (...roles: string[]) => {
        if (!user) {
          return false;
        }

        if (user.is_superuser) {
          return true;
        }

        const userRoles = new Set(
          user.roles.map(
            (role) => role.code,
          ),
        );

        return roles.some((role) =>
          userRoles.has(role),
        );
      },
      [user],
    );

  const value = useMemo(
    () => ({
      user,
      loading,
      authenticated: Boolean(user),
      login: handleLogin,
      logout: handleLogout,
      refreshUser,
      hasRole,
    }),
    [
      user,
      loading,
      handleLogin,
      handleLogout,
      refreshUser,
      hasRole,
    ],
  );

  return (
    <AuthContext.Provider
      value={value}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context =
    useContext(AuthContext);

  if (!context) {
    throw new Error(
      "useAuth must be used inside AuthProvider.",
    );
  }

  return context;
}