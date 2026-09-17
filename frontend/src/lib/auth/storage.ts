
const ACCESS_TOKEN_KEY = "beois_access_token";
const REFRESH_TOKEN_KEY = "beois_refresh_token";

function browserAvailable() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (!browserAvailable()) {
    return null;
  }

  return sessionStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken() {
  if (!browserAvailable()) {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function saveTokens(
  access: string,
  refresh: string,
) {
  if (!browserAvailable()) {
    return;
  }

  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    access,
  );

  localStorage.setItem(
    REFRESH_TOKEN_KEY,
    refresh,
  );
}

export function saveAccessToken(
  access: string,
) {
  if (!browserAvailable()) {
    return;
  }

  sessionStorage.setItem(
    ACCESS_TOKEN_KEY,
    access,
  );
}

export function clearTokens() {
  if (!browserAvailable()) {
    return;
  }

  sessionStorage.removeItem(
    ACCESS_TOKEN_KEY,
  );

  localStorage.removeItem(
    REFRESH_TOKEN_KEY,
  );
}