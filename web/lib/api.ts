import axios from "axios";
import type { Board, MetricsData } from "@/types";

// Construct API base URL - replace frontend port (4000) with API port (5000)
const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_BASE_URL) {
    return process.env.NEXT_PUBLIC_API_BASE_URL;
  }
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (origin.includes(":4000")) {
      return origin.replace(":4000", ":5000");
    }
    return "http://localhost:5000";
  }
  return "http://localhost:5000";
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 0, // No timeout - let's see how long server takes
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Include cookies for session management
});

// Add request interceptor for debugging
api.interceptors.request.use(
  (config) => {
    console.log(`[API] Making request to: ${config.baseURL}${config.url}`);
    return config;
  },
  (error) => {
    console.error("[API] Request error:", error);
    return Promise.reject(error);
  },
);

// Add response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`[API] Response received:`, response.status, response.data);
    return response;
  },
  (error) => {
    console.error("[API] Response error:", {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      url: error.config?.url,
    });
    return Promise.reject(error);
  },
);

export async function fetchBoards(): Promise<Board[]> {
  try {
    const response = await api.get("/api/boards");
    return response.data.boards || [];
  } catch (error: any) {
    console.error("Error fetching boards:", error);
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("Network Error")
    ) {
      throw new Error(
        "Cannot connect to API server. Make sure it is running on " +
          API_BASE_URL,
      );
    }
    throw new Error(error.response?.data?.error || "Failed to fetch boards");
  }
}

export async function downloadPDF(boardId: string): Promise<void> {
  const apiBaseUrl = getApiBaseUrl();
  const url = `${apiBaseUrl}/api/pdf/${boardId}`;

  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ error: "Failed to download PDF" }));
      throw new Error(
        errorData.error || `HTTP error! status: ${response.status}`,
      );
    }

    // Get filename from Content-Disposition header or use default
    const contentDisposition = response.headers.get("Content-Disposition");
    let filename = "velocity_report.pdf";
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(
        /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/,
      );
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1].replace(/['"]/g, "");
      }
    }

    // Create blob and download
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  } catch (error: any) {
    console.error("Error downloading PDF:", error);
    if (
      error.message.includes("ECONNREFUSED") ||
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Cannot connect to API server. Make sure the API server is running on port 5000.",
      );
    }
    throw error;
  }
}

export async function checkAuthStatus(): Promise<{
  authenticated: boolean;
  user?: { email: string; name: string };
}> {
  try {
    const response = await api.get("/api/auth/status");
    return response.data;
  } catch (error: any) {
    console.error("Error checking auth status:", error);
    return { authenticated: false };
  }
}

export async function login(): Promise<string> {
  try {
    const response = await api.get("/api/auth/login");
    if (response.data.error) {
      throw new Error(response.data.error);
    }
    if (!response.data.authUrl) {
      throw new Error("No auth URL returned from server");
    }
    return response.data.authUrl;
  } catch (error: any) {
    console.error("Error getting login URL:", error);
    const errorMessage =
      error.response?.data?.error || error.message || "Failed to get login URL";
    throw new Error(errorMessage);
  }
}

export async function logout(): Promise<void> {
  try {
    await api.post("/api/auth/logout");
  } catch (error: any) {
    console.error("Error logging out:", error);
    throw new Error(error.response?.data?.error || "Failed to logout");
  }
}

export async function fetchMetrics(boardId: string): Promise<MetricsData> {
  try {
    // Handle query parameters if included in boardId
    const url = boardId.includes("?")
      ? `/api/metrics/${boardId}`
      : `/api/metrics/${boardId}`;
    console.log(`[API] Fetching metrics for board: ${url}`);
    const response = await api.get(url);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching metrics:", error);
    if (error.response?.status === 401) {
      throw new Error("AUTH_REQUIRED");
    }
    if (
      error.code === "ECONNREFUSED" ||
      error.message.includes("Network Error") ||
      error.code === "ERR_NETWORK"
    ) {
      throw new Error(
        "Cannot connect to API server. Make sure it is running on " +
          API_BASE_URL +
          ". Start it with: python3 api_server.py",
      );
    }
    if (error.code === "ECONNABORTED") {
      throw new Error(
        "Request timed out. The API server may be slow or unresponsive.",
      );
    }
    throw new Error(
      error.response?.data?.error || error.message || "Failed to fetch metrics",
    );
  }
}
