"use client";

import { useState, useEffect } from "react";
import BoardSelector from "./BoardSelector";
import MetricsCharts from "./MetricsCharts";
import { fetchMetrics, checkAuthStatus, logout as apiLogout } from "@/lib/api";
import type { Board, MetricsData } from "@/types";

// Static boards list
const STATIC_BOARDS: Board[] = [
  {
    id: "1",
    name: "SCRUM",
    projectKey: "SCRUM",
  },
  {
    id: "58",
    name: "Rental Discovery & Selection Squad",
    projectKey: "ELECOM",
  },
  {
    id: "56",
    name: "Search And Nav Board",
    projectKey: "ELECOM",
  },
  {
    id: "284",
    name: "Design System Team",
    projectKey: "RFW",
  },
  {
    id: "47",
    name: "Product Discovery-ECOM",
    projectKey: "ELECOM",
  },
  {
    id: "50",
    name: "Cart & Checkout",
    projectKey: "ELECOM",
  },
];

export default function Dashboard() {
  const [boards] = useState<Board[]>(STATIC_BOARDS);
  const [selectedBoard, setSelectedBoard] = useState<string>(
    STATIC_BOARDS[0]?.id || "",
  );
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [cachedMetrics, setCachedMetrics] = useState<MetricsData | null>(null); // Show previous while loading
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Background refresh in progress
  const [newDataReady, setNewDataReady] = useState(false); // New data available notification
  const [user, setUser] = useState<{ email: string; name: string } | null>(
    null,
  );

  // Check authentication on mount (optional - only if OAuth is configured)
  // If OAuth is not configured, the app will use .env credentials automatically
  useEffect(() => {
    // Only check auth status if OAuth might be configured
    // If it fails or returns not authenticated, we'll use .env credentials
    checkAuthStatus()
      .then((status) => {
        if (status.authenticated && status.user) {
          setUser(status.user);
        }
        // Don't redirect - allow app to work with .env credentials
      })
      .catch(() => {
        // If auth check fails, continue with .env credentials
      });
  }, []); // Empty dependency array - only run on mount

  // Set default selected board on mount only - no automatic report generation
  useEffect(() => {
    // Set default selected board on mount
    if (STATIC_BOARDS.length > 0 && !selectedBoard) {
      setSelectedBoard(STATIC_BOARDS[0].id);
    }
    // Don't auto-load data - wait for user to click Generate Report button
  }, []);

  const handleLogout = async () => {
    try {
      await apiLogout();
      // Only redirect if OAuth was being used
      if (user) {
        window.location.reload();
      }
    } catch (err: any) {
      console.error("Error logging out:", err);
    }
  };

  const handleGenerateReport = async () => {
    if (!selectedBoard) {
      setError("Please select a board");
      return;
    }

    // Save current metrics as cached/previous to show while loading
    if (metrics) {
      setCachedMetrics(metrics);
    }

    setLoading(true);
    setError(null);
    setNewDataReady(false);
    setRefreshing(true);

    try {
      console.log("Generating report for board:", selectedBoard);
      // Force refresh by adding refresh parameter
      const metricsData = await fetchMetrics(`${selectedBoard}?refresh=true`);
      console.log("Metrics received:", metricsData);
      setMetrics(metricsData);
      setCachedMetrics(null); // Clear cached after new data arrives
      setNewDataReady(true);
      // Auto-hide notification after 5 seconds
      setTimeout(() => setNewDataReady(false), 5000);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate report";
      console.error("Error generating report:", err);

      // Don't redirect on auth errors - allow .env credentials to work
      if (errorMessage === "AUTH_REQUIRED" || err.response?.status === 401) {
        console.log("Auth error - will try with .env credentials if available");
        // Continue to show error but don't redirect
      }

      setError(errorMessage);
      // Restore cached metrics on error
      if (cachedMetrics) {
        setMetrics(cachedMetrics);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!metrics && !cachedMetrics) {
      setError("Please generate a report first");
      return;
    }

    setDownloadingPDF(true);
    setError(null);

    try {
      // Dynamically import html2canvas and jspdf with error handling
      let html2canvas, jsPDF;
      try {
        html2canvas = (await import("html2canvas")).default;
        jsPDF = (await import("jspdf")).jsPDF;
      } catch (importError) {
        throw new Error(
          "PDF libraries not loaded. Please run: cd web && npm install",
        );
      }

      // Get the dashboard content element
      const dashboardElement = document.getElementById("dashboard-content");
      if (!dashboardElement) {
        throw new Error("Dashboard content not found");
      }

      // Capture the dashboard as canvas
      const canvas = await html2canvas(dashboardElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
        windowWidth: document.documentElement.scrollWidth,
        windowHeight: document.documentElement.scrollHeight,
        width: dashboardElement.offsetWidth,
        height: dashboardElement.offsetHeight,
      });
 
      // Create PDF
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });
 
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imgWidth = pdfWidth - margin * 2;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
 
      let heightLeft = imgHeight;
      let position = margin;
 
      pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
 
      while (heightLeft > 0) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", margin, position, imgWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      // Generate filename
      const boardName =
        boards.find((b) => b.id === selectedBoard)?.name || "Report";
      const timestamp = new Date()
        .toISOString()
        .split("T")[0]
        .replace(/-/g, "");
      const filename = `${boardName}_velocity_report_${timestamp}.pdf`;

      // Download PDF
      pdf.save(filename);
    } catch (err: any) {
      const errorMessage = err.message || "Failed to generate PDF";
      console.error("Error generating PDF:", err);

      // If html2canvas fails, suggest installing dependencies
      if (
        errorMessage.includes("html2canvas") ||
        errorMessage.includes("chunk")
      ) {
        setError(
          "PDF generation requires html2canvas. Please run: cd web && npm install && npm run build",
        );
      } else {
        setError(errorMessage);
      }
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#edf2f7",
        padding: "2rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "1400px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <div id="dashboard-content">
          <header
            style={{
              background: "white",
              borderRadius: "24px",
              padding: "2rem",
              boxShadow: "0 24px 60px rgba(15, 23, 42, 0.08)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1.5rem",
                flexWrap: "wrap",
              }}
            >
              <div style={{ minWidth: "280px" }}>
                <h1
                  style={{
                    margin: 0,
                    fontSize: "2.5rem",
                    fontWeight: 800,
                    color: "#111827",
                    lineHeight: 1.05,
                  }}
                >
                  Jira Velocity Dashboard
                </h1>
                <p
                  style={{
                    margin: "1rem 0 0 0",
                    color: "#475569",
                    fontSize: "1rem",
                    maxWidth: "720px",
                    lineHeight: 1.7,
                  }}
                >
                  Track AI story point savings, developer contributions, and
                  sprint efficiency in a clean dashboard built for executive
                  reviews.
                </p>
              </div>

              {user && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1rem",
                    minWidth: "220px",
                  }}
                >
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700, color: "#1f2937" }}>
                      {user.name || user.email}
                    </div>
                    <div style={{ fontSize: "0.95rem", color: "#6b7280" }}>
                      {user.email}
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    style={{
                      padding: "0.75rem 1rem",
                      borderRadius: "999px",
                      border: "1px solid #d1d5db",
                      background: "#f8fafc",
                      color: "#111827",
                      cursor: "pointer",
                      fontWeight: 600,
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "2rem",
                display: "flex",
                flexWrap: "wrap",
                gap: "1rem",
                alignItems: "flex-end",
                justifyContent: "space-between",
              }}
            >
              <div style={{ flex: 1, minWidth: "300px" }}>
                <BoardSelector
                  boards={boards}
                  selectedBoard={selectedBoard}
                  onBoardChange={setSelectedBoard}
                  onGenerate={handleGenerateReport}
                  loading={loading}
                />
              </div>

              {(metrics || cachedMetrics) && (
                <button
                  onClick={handleDownloadPDF}
                  disabled={downloadingPDF || loading}
                  style={{
                    padding: "0.95rem 1.5rem",
                    fontSize: "1rem",
                    fontWeight: 700,
                    color: "white",
                    background: downloadingPDF ? "#94a3b8" : "#2563eb",
                    border: "none",
                    borderRadius: "14px",
                    cursor:
                      downloadingPDF || loading ? "not-allowed" : "pointer",
                    boxShadow: "0 16px 30px rgba(37, 99, 235, 0.25)",
                    transition: "transform 0.2s ease, background 0.2s ease",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.75rem",
                    whiteSpace: "nowrap",
                    minHeight: "48px",
                  }}
                  onMouseEnter={(e) => {
                    if (!downloadingPDF && !loading) {
                      e.currentTarget.style.background = "#1d4ed8";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!downloadingPDF && !loading) {
                      e.currentTarget.style.background = "#2563eb";
                    }
                  }}
                >
                  {downloadingPDF ? (
                    <>
                      <span>⏳</span>
                      <span>Download PDF</span>
                    </>
                  ) : (
                    <>
                      <span>📥</span>
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {(error ||
              refreshing ||
              (loading && cachedMetrics) ||
              newDataReady) && (
              <div
                style={{ marginTop: "1.5rem", display: "grid", gap: "0.75rem" }}
              >
                {error && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      background: "#ffe4e6",
                      color: "#9b2c2c",
                      borderRadius: "14px",
                      border: "1px solid #fecdd3",
                    }}
                  >
                    {error}
                  </div>
                )}

                {refreshing && !loading && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      background: "#e0f2fe",
                      color: "#0369a1",
                      borderRadius: "14px",
                      border: "1px solid #bae6fd",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span>🔄</span>
                    <span>
                      Fetching latest data in background. Current report shown
                      below.
                    </span>
                  </div>
                )}

                {loading && cachedMetrics && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      background: "#fff7dd",
                      color: "#6b4f10",
                      borderRadius: "14px",
                      border: "1px solid #fde68a",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <span>⏳</span>
                    <span>
                      Generating new metrics... Showing previous data while the
                      latest data loads.
                    </span>
                  </div>
                )}

                {newDataReady && (
                  <div
                    style={{
                      padding: "1rem 1.25rem",
                      background: "#d1fae5",
                      color: "#14532d",
                      borderRadius: "14px",
                      border: "1px solid #a7f3d0",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "0.75rem",
                    }}
                  >
                    <span>
                      ✅ New report is ready! Data has been refreshed.
                    </span>
                    <button
                      onClick={() => setNewDataReady(false)}
                      style={{
                        background: "transparent",
                        border: "none",
                        color: "#14532d",
                        cursor: "pointer",
                        fontSize: "1.2rem",
                        lineHeight: 1,
                      }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}
          </header>

          {metrics || cachedMetrics ? (
            <main
              style={{
                marginTop: "1.5rem",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <MetricsCharts
                metrics={metrics || cachedMetrics!}
                isLoading={loading && !metrics}
              />
            </main>
          ) : (
            <div
              style={{
                marginTop: "1.5rem",
                padding: "2rem",
                borderRadius: "24px",
                background: "white",
                boxShadow: "0 20px 45px rgba(15, 23, 42, 0.06)",
                textAlign: "center",
              }}
            >
              <p style={{ margin: 0, color: "#475569", fontSize: "1rem" }}>
                Select a board and click Generate Report to view the AI story
                point dashboard.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
