"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import type { MetricsData } from "@/types";

interface MetricsChartsProps {
  metrics: MetricsData;
  isLoading?: boolean;
}

const getThemeColors = (activeTheme: string) => {
  if (activeTheme === "ivoryPlum") {
    return {
      primary: "#6B21A8",
      primaryHover: "#581C87",
      primaryLight: "#F3E8FF",
      success: "#059669",
      warning: "#D97706",
      danger: "#E11D48",
      chartAiSaved: "#C026D3",
      chartActualAi: "#A855F7",
      surface: "#FFFFFF",
      background: "#FDFBF7",
      text: "#2D063B",
      muted: "#6B5B75",
      colors: ["#C026D3", "#6B21A8", "#059669", "#D97706", "#A855F7", "#E11D48", "#9333EA", "#7E22CE"],
    };
  } else if (activeTheme === "charcoal") {
    return {
      primary: "#38BDF8",
      primaryHover: "#0EA5E9",
      primaryLight: "rgba(56, 189, 248, 0.18)",
      success: "#34D399",
      warning: "#FBBF24",
      danger: "#F87171",
      chartAiSaved: "#38BDF8",
      chartActualAi: "#A78BFA",
      surface: "#1E293B",
      background: "#0B0F19",
      text: "#F8FAFC",
      muted: "#94A3B8",
      colors: ["#38BDF8", "#818CF8", "#34D399", "#FBBF24", "#A78BFA", "#F87171", "#60A5FA", "#C084FC"],
    };
  } else if (activeTheme === "oliveSage") {
    return {
      primary: "#59842A",
      primaryHover: "#507D23",
      primaryLight: "#EAF2E3",
      success: "#507D23",
      warning: "#D97706",
      danger: "#E0352A",
      chartAiSaved: "#59842A",
      chartActualAi: "#E0352A",
      surface: "#FFFFFF",
      background: "#F2F0ED",
      text: "#1A1A1A",
      muted: "#474747",
      colors: ["#59842A", "#1A1A1A", "#E0352A", "#507D23", "#474747", "#DEDEDE", "#2D2D2D", "#808080"],
    };
  }
  return {
    primary: "#2563EB",
    primaryHover: "#1D4ED8",
    primaryLight: "#DBEAFE",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    chartAiSaved: "#06B6D4",
    chartActualAi: "#8B5CF6",
    surface: "#FFFFFF",
    background: "#F8FAFC",
    text: "#0F172A",
    muted: "#475569",
    colors: ["#06B6D4", "#2563EB", "#10B981", "#F59E0B", "#8B5CF6", "#EF4444", "#3B82F6", "#0284C7"],
  };
};

import { useState, useEffect } from "react";

export default function MetricsCharts({
  metrics,
  isLoading = false,
}: MetricsChartsProps) {
  const [activeTheme, setActiveTheme] = useState("executiveLight");

  useEffect(() => {
    const current =
      typeof document !== "undefined"
        ? document.documentElement.getAttribute("data-theme") || "executiveLight"
        : "executiveLight";
    setActiveTheme(current);

    const observer = new MutationObserver(() => {
      const updated =
        document.documentElement.getAttribute("data-theme") || "executiveLight";
      setActiveTheme(updated);
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => observer.disconnect();
  }, []);

  const theme = getThemeColors(activeTheme);
  const COLORS = theme.colors;
  // Debug logging
  console.log("[MetricsCharts] Metrics data:", {
    hasCommitMetrics: !!metrics.commitMetrics,
    commitMetrics: metrics.commitMetrics,
    developerCommits: metrics.commitMetrics?.developerCommits,
    totalCommits: metrics.commitMetrics?.totalCommits,
  });

  const aiUsageByAssigneeData = metrics.aiMetrics?.aiUsageByAssignee || [];
  const developerStoryPointsByIssueData =
    metrics.commitMetrics?.developerStoryPointsByIssue || [];

  const actualWithAI = metrics.aiMetrics?.committedStoryPoints || 0;
  const aiSaved = metrics.aiMetrics?.timeSavedTotal || 0;
  const totalCommits = metrics.commitMetrics?.totalCommits || 0;
  const storiesWithCommits = metrics.commitMetrics?.storiesWithCommits || 0;
  const completionRate = metrics.currentSprint?.completionRate || 0;
  const committedPoints = metrics.currentSprint?.committedStoryPoints || 0;
  const completedPoints = metrics.currentSprint?.completedStoryPoints || 0;

  const summaryCards = [
    {
      title: "Story Points Committed",
      value: `${committedPoints.toFixed(1)} SP`,
      subtitle: "Total story points committed this sprint",
    },
    {
      title: "Story Points Completed",
      value: `${completedPoints.toFixed(1)} SP`,
      subtitle: "Total story points completed this sprint",
    },
    {
      title: "Completion Rate",
      value: `${completionRate.toFixed(1)}%`,
      subtitle: `${completedPoints.toFixed(1)} SP completed`,
    },
    {
      title: "Total Commits",
      value: `${totalCommits} commits`,
      subtitle: `${storiesWithCommits} stories referenced`,
    },
  ];

  const sectionCardStyle = {};

  const aiUsageRaw = [
    { name: "Actual with AI", value: actualWithAI, unit: "story points" },
    { name: "AI Saved", value: aiSaved, unit: "story points" },
  ].filter((item) => item.value > 0);

  const totalAiUsage = aiUsageRaw.reduce((sum, item) => sum + item.value, 0);
  const aiUsageData = aiUsageRaw.map((item) => ({
    ...item,
    percent:
      totalAiUsage > 0
        ? ((item.value / totalAiUsage) * 100).toFixed(1)
        : "0.0",
  }));

  // Prepare developer commits data
  const developerCommitsRaw = metrics.commitMetrics?.developerCommits || {};
  const developerTicketCountsRaw = metrics.commitMetrics?.developerTicketCounts || {};

  // List of invalid/placeholder developer names to filter out
  const invalidNames = [
    "user",
    "your_email@tailoredbrands.com",
    "unknown",
    "n/a",
    "na",
  ];

  const developerCommitsFiltered = Object.entries(developerCommitsRaw)
    .map(([name, value]) => {
      const rawTicketCount = developerTicketCountsRaw[name];
      return {
        name,
        value: Number(value) || 0,
        tickets:
          rawTicketCount !== undefined && rawTicketCount !== null
            ? Number(rawTicketCount) || 0
            : 0,
        unit: "commits",
      };
    })
    .filter((item) => {
      // Filter out invalid/placeholder developer names
      if (item.value <= 0) return false;

      const name = (item.name || "").trim().toLowerCase();

      // Check if name matches any invalid pattern
      if (!name || name === "") return false;
      if (invalidNames.includes(name)) return false;
      if (name.includes("your_email@tailoredbrands.com")) return false;

      return true;
    })
    .sort((a, b) => b.value - a.value);

  const totalDevCommits = developerCommitsFiltered.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const developerCommitsData = developerCommitsFiltered.map((item) => ({
    ...item,
    percent:
      totalDevCommits > 0
        ? ((item.value / totalDevCommits) * 100).toFixed(1)
        : "0.0",
  }));

  console.log("[MetricsCharts] Developer commits data:", developerCommitsData);

  // Prepare story commits data
  const storyCommitsFiltered = Object.entries(
    metrics.commitMetrics?.storyCommits || {},
  )
    .map(([name, value]) => ({ name, value: Number(value) || 0, unit: "commits" }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const totalStoryCommits = storyCommitsFiltered.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const storyCommitsData = storyCommitsFiltered.map((item) => ({
    ...item,
    percent:
      totalStoryCommits > 0
        ? ((item.value / totalStoryCommits) * 100).toFixed(1)
        : "0.0",
  }));

  // Prepare developer story points data
  const developerStoryPointsRaw =
    metrics.commitMetrics?.developerStoryPoints || {};
  const developerStoryPointsFiltered = Object.entries(developerStoryPointsRaw)
    .map(([name, value]) => ({ name, value: Number(value) || 0, unit: "story points" }))
    .filter((item) => {
      // Filter out invalid/placeholder developer names (same as commits)
      if (item.value <= 0) return false;
      const name = (item.name || "").trim().toLowerCase();
      const invalidNames = [
        "user",
        "your_email@tailoredbrands.com",
        "unknown",
        "n/a",
        "na",
      ];
      if (!name || name === "") return false;
      if (invalidNames.includes(name)) return false;
      if (name.includes("your_email@tailoredbrands.com")) return false;
      return true;
    })
    .sort((a, b) => b.value - a.value);

  const totalDevSP = developerStoryPointsFiltered.reduce(
    (sum, item) => sum + item.value,
    0,
  );

  const developerStoryPointsData = developerStoryPointsFiltered.map((item) => ({
    ...item,
    percent:
      totalDevSP > 0
        ? ((item.value / totalDevSP) * 100).toFixed(1)
        : "0.0",
  }));

  console.log(
    "[MetricsCharts] Developer story points data:",
    developerStoryPointsData,
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0]?.payload;
      const tooltipUnit = dataItem?.unit || "story points";
      const percent = dataItem?.percent;
      const tickets = dataItem?.tickets;

      const displayName = label || payload[0].name;

      return (
        <div
          style={{
            background: theme.surface,
            padding: "0.75rem 1rem",
            border: `1px solid ${theme.primaryLight}`,
            borderRadius: "8px",
            boxShadow: "0 4px 12px rgba(37, 99, 235, 0.15)",
          }}
        >
          <p style={{ margin: 0, fontWeight: "700", color: theme.text, fontSize: "0.95rem" }}>
            {displayName}
          </p>
          <div
            style={{
              marginTop: "0.35rem",
              fontSize: "0.9rem",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <span style={{ color: theme.primary, fontWeight: "600" }}>
              {payload[0].value} {tooltipUnit}
            </span>
            {percent !== undefined && (
              <span
                style={{
                  color: "#1E40AF",
                  fontWeight: "700",
                  background: theme.primaryLight,
                  padding: "0.15rem 0.5rem",
                  borderRadius: "6px",
                  fontSize: "0.825rem",
                }}
              >
                {percent}%
              </span>
            )}
          </div>
          {tickets !== undefined && tickets > 0 && (
            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.8rem", color: theme.muted }}>
              {tickets} ticket{tickets > 1 ? "s" : ""}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-4">
      <div className="d-flex flex-column flex-lg-row justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h2 className="h3 fw-bold mb-2">Metrics Dashboard</h2>
          <p className="dashboard-subtle mb-0" style={{ maxWidth: "680px" }}>
            A sharper view of AI story point savings, developer contribution,
            and sprint efficiency for your Jira board.
          </p>
        </div>
        {isLoading && (
          <div className="badge rounded-pill px-3 py-2" style={{ background: "rgba(37, 99, 235, 0.12)", color: theme.primaryHover }}>
            🔄 Refreshing metrics...
          </div>
        )}
      </div>

      <div className="row g-3 mt-2 mx-0">
        <div className="col-12 col-md-6 col-xl-3">
          <div className="dashboard-metric-card p-3 h-100">
            <div className="dashboard-metric-title mb-2">
              Story Points Committed
            </div>
            <div className="display-6 fw-bold">
              {metrics.currentSprint?.committedStoryPoints || 0}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="dashboard-metric-card p-3 h-100">
            <div className="dashboard-metric-title mb-2">
              Story Points Completed
            </div>
            <div className="display-6 fw-bold">
              {metrics.currentSprint?.completedStoryPoints || 0}
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="dashboard-metric-card p-3 h-100">
            <div className="dashboard-metric-title mb-2">
              Completion Rate
            </div>
            <div className="display-6 fw-bold">
              {metrics.currentSprint?.completionRate || 0}%
            </div>
          </div>
        </div>
        <div className="col-12 col-md-6 col-xl-3">
          <div className="dashboard-metric-card p-3 h-100">
            <div className="dashboard-metric-title mb-2">
              Total Commits
            </div>
            <div className="display-6 fw-bold">
              {metrics.commitMetrics?.totalCommits || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3 mt-2 mb-4 align-items-stretch mx-0">
        {/* AI Usage Metrics */}
        {aiUsageData.length > 0 && (
          <div className="col-12 col-xl-4">
            <div className="dashboard-card p-3 h-100">
              <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.35rem",
                    fontWeight: "700",
                    color: theme.text,
                    margin: 0,
                  }}
                >
                  AI Usage Metrics
                </h3>
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    color: theme.muted,
                    fontSize: "0.95rem",
                  }}
                >
                  View the impact of AI story-point estimates across the sprint.
                </p>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={aiUsageData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) =>
                    `${name}: ${(percent * 100).toFixed(0)}%`
                  }
                  outerRadius={100}
                  fill={theme.primary}
                  dataKey="value"
                >
                  {aiUsageData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="bottom"
                  align="center"
                  wrapperStyle={{ marginTop: "1rem" }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div
              style={{
                marginTop: "1.5rem",
                padding: "1.25rem",
                background: theme.background,
                borderRadius: "12px",
                fontSize: "0.95rem",
                color: theme.muted,
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>Time Saved</p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  fontSize: "1.25rem",
                  color: theme.text,
                }}
              >
                {metrics.aiMetrics?.timeSavedTotal || 0} SP
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: theme.muted }}>
                Reduction of{" "}
                {metrics.aiMetrics?.timeSavedPercent?.toFixed(1) || 0}% compared
                to original estimates.
              </p>
            </div>
          </div>
          </div>
        )}

        {aiUsageByAssigneeData.length > 0 && (
          <div className="col-12 col-xl-4">
            <div className="dashboard-card p-3 h-100">
              <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: theme.text,
                marginBottom: "1rem",
              }}
            >
              AI Usage by Assignee
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: theme.primary, color: "white" }}>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "left",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      Assignee
                    </th>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      Estimated SP (Without AI)
                    </th>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      Actual SP (AI)
                    </th>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      Time Saved (SP)
                    </th>
                    <th
                      style={{
                        padding: "0.85rem 1rem",
                        textAlign: "right",
                        fontWeight: "700",
                        fontSize: "0.9rem",
                      }}
                    >
                      Saved %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {aiUsageByAssigneeData.map((assignee, index) => (
                    <tr
                      key={assignee.assignee}
                      style={{
                        background: index % 2 === 0 ? theme.surface : theme.background,
                      }}
                    >
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          fontWeight: "600",
                          color: theme.text,
                        }}
                      >
                        {assignee.assignee}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: theme.primary,
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_ai_story_points.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: theme.chartActualAi,
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_story_points.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: theme.success,
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_time_saved.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: theme.muted,
                        }}
                      >
                        {assignee.time_saved_percent.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
           </div>
         </div>
        )}

        {/* Developer Commits */}
        <div className="col-12 col-xl-4">
          <div className="dashboard-card p-3 h-100">
            <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              marginBottom: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "700",
                  color: theme.text,
                  margin: 0,
                }}
              >
                Developer Commits
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: theme.muted,
                  fontSize: "0.95rem",
                }}
              >
                Commit activity reveals the team’s sprint engagement and story
                coverage.
              </p>
            </div>
          </div>

          {developerCommitsData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={developerCommitsData}
                  margin={{ top: 15, right: 10, left: -20, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    style={{ fontSize: "0.75rem" }}
                    tickFormatter={(name) => {
                      const profile = metrics.commitMetrics?.developerProfiles?.[name];
                      const username = profile?.username || name;
                      return username.length > 18 ? `${username.substring(0, 15)}...` : username;
                    }}
                  />
                  <YAxis allowDecimals={false} style={{ fontSize: "0.75rem" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]}>
                    {developerCommitsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div
                style={{
                  marginTop: "1.5rem",
                  overflow: "hidden",
                  borderRadius: "14px",
                  border: `1px solid ${theme.primaryLight}`,
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ background: theme.primary, color: "white" }}>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "left",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Developer
                      </th>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Tickets
                      </th>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Commits
                      </th>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Commits %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {developerCommitsData.map((dev, index) => {
                      const total = developerCommitsData.reduce(
                        (sum, d) => sum + d.value,
                        0,
                      );
                      const percent =
                        total > 0
                          ? ((dev.value / total) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr
                          key={dev.name}
                          style={{
                            background: index % 2 === 0 ? theme.surface : theme.background,
                          }}
                        >
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            {(() => {
                              const profile = metrics.commitMetrics?.developerProfiles?.[dev.name];
                              return profile?.username ? `${dev.name} (${profile.username})` : dev.name;
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: theme.success,
                              fontWeight: "700",
                            }}
                          >
                            {dev.tickets}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: theme.primary,
                              fontWeight: "700",
                            }}
                          >
                            {dev.value}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: theme.muted,
                            }}
                          >
                            {percent}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                No developer commits found
              </p>
              <p style={{ fontSize: "0.95rem" }}>
                Commits will appear here when developers make commits
                referencing sprint tickets.
              </p>
              <p
                style={{
                  fontSize: "0.85rem",
                  marginTop: "1rem",
                  color: "#94a3b8",
                }}
              >
                Make sure commits reference tickets like: ELECOM-123
              </p>
            </div>
          )}

          <div
            style={{
              marginTop: "1.5rem",
              padding: "1rem",
              background: theme.background,
              borderRadius: "14px",
              border: `1px solid ${theme.primaryLight}`,
              fontSize: "0.95rem",
              color: theme.muted,
            }}
          >
            <p style={{ margin: "0 0 0.5rem 0", fontWeight: 700 }}>
              Commit Summary
            </p>
            <p style={{ margin: 0 }}>
              <strong>Total Commits:</strong>{" "}
              {metrics.commitMetrics?.totalCommits || 0}
            </p>
            <p style={{ margin: "0.5rem 0 0 0" }}>
              <strong>Stories with Commits:</strong>{" "}
              {metrics.commitMetrics?.storiesWithCommits || 0}
            </p>
            {metrics.commitMetrics?.totalCommitsScanned &&
              metrics.commitMetrics.totalCommitsScanned > 0 && (
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    fontSize: "0.9rem",
                    color: theme.muted,
                  }}
                >
                  <strong>Total Commits Scanned:</strong>{" "}
                  {metrics.commitMetrics.totalCommitsScanned}
                  {metrics.commitMetrics.totalCommitsScanned >
                    (metrics.commitMetrics?.totalCommits || 0) && (
                    <span
                      style={{
                        display: "block",
                        marginTop: "0.25rem",
                        color: theme.danger,
                        fontSize: "0.85rem",
                      }}
                    >
                      ⚠️ Some commits don&apos;t reference sprint tickets
                    </span>
                  )}
                </p>
              )}
          </div>
         </div>
       </div>

      {/* Developer Story Points */}
      {developerStoryPointsData.length > 0 && (
        <div className="col-12">
          <div className="dashboard-card p-3 h-100">
            <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "1rem",
              flexWrap: "wrap",
              marginBottom: "1rem",
            }}
          >
            <div>
              <h3
                style={{
                  fontSize: "1.35rem",
                  fontWeight: "700",
                  color: theme.text,
                  margin: 0,
                }}
              >
                Developer Story Points
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: theme.muted,
                  fontSize: "0.95rem",
                }}
              >
                Story point allocation by developer, with issue-level context
                for each ticket.
              </p>
            </div>
          </div>
          {developerStoryPointsData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart
                  data={developerStoryPointsData}
                  margin={{ top: 15, right: 10, left: -20, bottom: 65 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={70}
                    interval={0}
                    style={{ fontSize: "0.75rem" }}
                    tickFormatter={(name) => {
                      const profile = metrics.commitMetrics?.developerProfiles?.[name];
                      const username = profile?.username || name;
                      return username.length > 18 ? `${username.substring(0, 15)}...` : username;
                    }}
                  />
                  <YAxis style={{ fontSize: "0.75rem" }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="value" fill={theme.primary} radius={[6, 6, 0, 0]}>
                    {developerStoryPointsData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              {/* Developer Story Points Table */}
              <div
                style={{
                  marginTop: "1.5rem",
                  overflow: "hidden",
                  borderRadius: "14px",
                  border: `1px solid ${theme.primaryLight}`,
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: theme.primary, color: "white" }}>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "left",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Developer
                      </th>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Story Points
                      </th>
                      <th
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          fontWeight: "700",
                          fontSize: "0.9rem",
                        }}
                      >
                        Story Points %
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {developerStoryPointsData.map((dev, index) => {
                      const total = developerStoryPointsData.reduce(
                        (sum, d) => sum + d.value,
                        0,
                      );
                      const percent =
                        total > 0
                          ? ((dev.value / total) * 100).toFixed(1)
                          : "0.0";
                      return (
                        <tr
                          key={dev.name}
                          style={{
                            background: index % 2 === 0 ? theme.surface : theme.background,
                          }}
                        >
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              fontWeight: "600",
                              color: theme.text,
                            }}
                          >
                            {(() => {
                              const profile = metrics.commitMetrics?.developerProfiles?.[dev.name];
                              return profile?.username ? `${dev.name} (${profile.username})` : dev.name;
                            })()}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: theme.primary,
                              fontWeight: "700",
                            }}
                          >
                            {dev.value.toFixed(1)} SP
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: theme.muted,
                            }}
                          >
                            {percent}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {developerStoryPointsByIssueData.length > 0 && (
                <div style={{ marginTop: "1.5rem" }}>
                  <h4 style={{ margin: "1rem 0 0.75rem 0", color: theme.text }}>
                    Developer Issue Breakdown
                  </h4>
                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        minWidth: "720px",
                      }}
                    >
                      <thead>
                        <tr style={{ background: theme.primary, color: "white" }}>
                          <th
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "left",
                              fontWeight: "700",
                              fontSize: "0.9rem",
                            }}
                          >
                            Story ID
                          </th>
                          <th
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "left",
                              fontWeight: "700",
                              fontSize: "0.9rem",
                            }}
                          >
                            Issue Header
                          </th>
                          <th
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              fontWeight: "700",
                              fontSize: "0.9rem",
                            }}
                          >
                            Story Points
                          </th>
                          <th
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              fontWeight: "700",
                              fontSize: "0.9rem",
                            }}
                          >
                            Individual Story Point %
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {developerStoryPointsByIssueData.map(
                          (developer, devIndex) => [
                            <tr
                              key={`${developer.assignee}-header`}
                              style={{ background: theme.primaryLight }}
                            >
                              <td
                                style={{
                                  padding: "0.85rem 1rem",
                                  fontWeight: "700",
                                  color: "#1e293b",
                                }}
                                colSpan={4}
                              >
                                {(() => {
                                  const profile = metrics.commitMetrics?.developerProfiles?.[developer.assignee];
                                  return profile?.username ? `${developer.assignee} (${profile.username})` : developer.assignee;
                                })()} —{" "}
                                {developer.total_story_points.toFixed(1)} SP
                                total
                              </td>
                            </tr>,
                            ...developer.issues.map((story, index) => (
                              <tr
                                key={`${developer.assignee}-${story.storyId}`}
                                style={{
                                  background:
                                    index % 2 === 0 ? theme.surface : theme.background,
                                }}
                              >
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    fontWeight: "600",
                                    color: theme.text,
                                  }}
                                >
                                  {story.storyId}
                                </td>
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    fontWeight: "500",
                                    color: theme.muted,
                                    maxWidth: "420px",
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                  }}
                                >
                                  {story.issueFoundation || "—"}
                                </td>
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    textAlign: "right",
                                    color: theme.primary,
                                    fontWeight: "700",
                                  }}
                                >
                                  {story.storyPoints.toFixed(1)} SP
                                </td>
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    textAlign: "right",
                                    color: theme.muted,
                                  }}
                                >
                                  {story.percentage.toFixed(1)}%
                                </td>
                              </tr>
                            )),
                          ],
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "#64748b",
              }}
            >
              <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>
                No developer story points found
              </p>
              <p style={{ fontSize: "0.95rem" }}>
                Story points will appear here when developers work on sprint
                tickets with story points assigned.
              </p>
            </div>
          )}
         </div>
        </div>
      )}

      {/* Story Commits Bar Chart */}
      {storyCommitsData.length > 0 && (
        <div
          style={{
            background: theme.background,
            padding: "1.5rem",
            borderRadius: "12px",
            border: `1px solid ${theme.primaryLight}`,
            marginTop: "2rem",
          }}
        >
          <h3
            style={{
              fontSize: "1.25rem",
              fontWeight: "600",
              color: "#2d3748",
              marginBottom: "1rem",
              textAlign: "center",
            }}
          >
            Commits by Story (Top 10)
          </h3>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={storyCommitsData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                angle={-45}
                textAnchor="end"
                height={100}
                interval={0}
                style={{ fontSize: "0.75rem" }}
              />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" fill={theme.primary} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

        </div>
      )}
    </div>

    </div>
  );
}
