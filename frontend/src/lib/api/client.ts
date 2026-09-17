import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  saveAccessToken,
} from "@/lib/auth/storage";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://127.0.0.1:8000/api";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(
    message: string,
    status: number,
    data?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

async function readResponse(
  response: Response,
) {
  const contentType =
    response.headers.get("content-type");

  if (
    contentType?.includes(
      "application/json",
    )
  ) {
    return response.json();
  }

  return response.text();
}

async function refreshAccessToken() {
  const refresh = getRefreshToken();

  if (!refresh) {
    return null;
  }

  const response = await fetch(
    `${API_BASE_URL}/auth/token/refresh/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refresh,
      }),
    },
  );

  if (!response.ok) {
    clearTokens();
    return null;
  }

  const data = (await response.json()) as {
    access: string;
  };

  saveAccessToken(data.access);

  return data.access;
}

interface ApiRequestOptions
  extends RequestInit {
  auth?: boolean;
  retryOnUnauthorized?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const {
    auth = true,
    retryOnUnauthorized = true,
    headers,
    ...requestOptions
  } = options;

  const requestHeaders =
    new Headers(headers);

  if (
    requestOptions.body &&
    !requestHeaders.has("Content-Type") &&
    !(requestOptions.body instanceof FormData)
  ) {
    requestHeaders.set(
      "Content-Type",
      "application/json",
    );
  }

  if (auth) {
    const accessToken =
      getAccessToken();

    if (accessToken) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${accessToken}`,
      );
    }
  }

  let response = await fetch(
    `${API_BASE_URL}${path}`,
    {
      ...requestOptions,
      headers: requestHeaders,
    },
  );

  if (
    response.status === 401 &&
    auth &&
    retryOnUnauthorized
  ) {
    const newAccessToken =
      await refreshAccessToken();

    if (newAccessToken) {
      requestHeaders.set(
        "Authorization",
        `Bearer ${newAccessToken}`,
      );

      response = await fetch(
        `${API_BASE_URL}${path}`,
        {
          ...requestOptions,
          headers: requestHeaders,
        },
      );
    }
  }

  const data =
    await readResponse(response);

  if (!response.ok) {
    throw new ApiError(
      `API request failed with status ${response.status}.`,
      response.status,
      data,
    );
  }

  return data as T;
}