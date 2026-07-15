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
    <div className="dashboard-shell px-0 py-3 py-lg-4">
      <div className="container-fluid px-0">
        <div id="dashboard-content" className="d-flex flex-column gap-3 px-2 px-lg-3">
          <header className="dashboard-hero card border-0 p-3 p-lg-4">
            <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3">
              <div className="flex-grow-1">
                <span className="dashboard-pill px-3 py-2 mb-3">Velocity insights</span>
                <h1 className="display-6 fw-bold mb-3">Jira Velocity Dashboard</h1>
                <p className="lead dashboard-subtle mb-0">
                  Track AI story point savings, developer contributions, and
                  sprint efficiency in a calm, executive-ready workspace.
                </p>
              </div>

              {user && (
                <div className="dashboard-user-pill d-flex align-items-center gap-3">
                  <div className="text-end">
                    <div className="fw-semibold text-dark">
                      {user.name || user.email}
                    </div>
                    <div className="small dashboard-subtle">{user.email}</div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="btn btn-dashboard-secondary rounded-pill px-3 py-2"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>

            <div className="mt-4 d-flex flex-column flex-lg-row align-items-end justify-content-between gap-3">
              <div className="w-100">
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
                  className={`btn btn-dashboard-primary rounded-pill px-4 py-2 ${downloadingPDF || loading ? "disabled" : ""}`}
                >
                  <span className="me-2">{downloadingPDF ? "⏳" : "📥"}</span>
                  <span>Download PDF</span>
                </button>
              )}
            </div>

            {(error || refreshing || (loading && cachedMetrics) || newDataReady) && (
              <div className="mt-4 d-grid gap-3">
                {error && (
                  <div className="alert dashboard-alert-soft mb-0" role="alert">
                    {error}
                  </div>
                )}

                {refreshing && !loading && (
                  <div className="alert dashboard-alert-info mb-0 d-flex align-items-center gap-2" role="status">
                    <span>🔄</span>
                    <span>
                      Fetching latest data in background. Current report shown
                      below.
                    </span>
                  </div>
                )}

                {loading && cachedMetrics && (
                  <div className="alert dashboard-alert-warm mb-0 d-flex align-items-center gap-2" role="status">
                    <span>⏳</span>
                    <span>
                      Generating new metrics... Showing previous data while the
                      latest data loads.
                    </span>
                  </div>
                )}

                {newDataReady && (
                  <div className="alert dashboard-alert-success mb-0 d-flex align-items-center justify-content-between gap-3" role="status">
                    <span>✅ New report is ready! Data has been refreshed.</span>
                    <button
                      onClick={() => setNewDataReady(false)}
                      className="btn btn-link p-0 text-decoration-none"
                      style={{ color: "inherit" }}
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
            )}
          </header>

          {metrics || cachedMetrics ? (
            <main className="d-flex flex-column gap-4">
              <MetricsCharts
                metrics={metrics || cachedMetrics!}
                isLoading={loading && !metrics}
              />
            </main>
          ) : (
            <div className="dashboard-card p-4 text-center">
              <h2 className="h4 fw-semibold mb-3">Ready for your next sprint review</h2>
              <p className="dashboard-subtle mb-0">
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
