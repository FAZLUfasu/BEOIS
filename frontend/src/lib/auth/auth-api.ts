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
export interface UpdateProfilePayload {
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}
export async function updateCurrentUser(
  payload: UpdateProfilePayload,
) {
  return apiRequest<CurrentUser>(
    "/auth/me/",
    {
      method: "PATCH",
      body: JSON.stringify(payload),
    },
  );
}