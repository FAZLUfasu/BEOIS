import {
  apiRequest,
} from "@/lib/api/client";
import {
  clearTokens,
  saveTokens,
} from "@/lib/auth/storage";
import type {
  CurrentUser,
  TokenPair,
} from "@/types/auth";

export async function login(
  username: string,
  password: string,
) {
  const tokens =
    await apiRequest<TokenPair>(
      "/auth/token/",
      {
        method: "POST",
        auth: false,
        retryOnUnauthorized: false,
        body: JSON.stringify({
          username,
          password,
        }),
      },
    );

  saveTokens(
    tokens.access,
    tokens.refresh,
  );

  return getCurrentUser();
}

export async function getCurrentUser() {
  return apiRequest<CurrentUser>(
    "/auth/me/",
  );
}

export function logout() {
  clearTokens();
}