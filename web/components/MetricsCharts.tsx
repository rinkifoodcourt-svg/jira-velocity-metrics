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
} from "recharts";
import type { MetricsData } from "@/types";

interface MetricsChartsProps {
  metrics: MetricsData;
  isLoading?: boolean;
}

const COLORS = [
  "#667eea",
  "#764ba2",
  "#f093fb",
  "#4facfe",
  "#00f2fe",
  "#43e97b",
  "#fa709a",
  "#fee140",
  "#30cfd0",
  "#a8edea",
];

export default function MetricsCharts({
  metrics,
  isLoading = false,
}: MetricsChartsProps) {
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
      title: "Sprint",
      value: metrics.currentSprint?.sprintName || "Current sprint",
      subtitle: "Current board sprint",
    },
    {
      title: "Committed Points",
      value: `${committedPoints.toFixed(1)} SP`,
      subtitle: `Completed ${completedPoints.toFixed(1)} SP (${completionRate.toFixed(0)}%)`,
    },
    {
      title: "AI Time Saved",
      value: `${aiSaved.toFixed(1)} SP`,
      subtitle: `${metrics.aiMetrics?.timeSavedPercent?.toFixed(1) || 0}% reduction`,
    },
    {
      title: "Code Activity",
      value: `${totalCommits} commits`,
      subtitle: `${storiesWithCommits} stories referenced`,
    },
  ];

  const sectionCardStyle = {
    background: "white",
    borderRadius: "16px",
    padding: "1.5rem",
    border: "1px solid rgba(148, 163, 184, 0.2)",
    boxShadow: "0 12px 30px rgba(148, 163, 184, 0.08)",
  };

  const aiUsageData = [
    { name: "Actual with AI", value: actualWithAI },
    { name: "AI Saved", value: aiSaved },
  ].filter((item) => item.value > 0);

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

  const developerCommitsData = Object.entries(developerCommitsRaw)
    .map(([name, value]) => {
      const rawTicketCount = developerTicketCountsRaw[name];
      return {
        name,
        value: Number(value) || 0,
        tickets:
          rawTicketCount !== undefined && rawTicketCount !== null
            ? Number(rawTicketCount) || 0
            : 0,
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

  console.log("[MetricsCharts] Developer commits data:", developerCommitsData);

  // Prepare story commits data
  const storyCommitsData = Object.entries(
    metrics.commitMetrics?.storyCommits || {},
  )
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
    .filter((item) => item.value > 0)
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const storyCommitDetailsRaw = metrics.commitMetrics?.storyCommitDetails || {};
  const storyCommitDetailsData = storyCommitsData.map((story) => ({
    ...story,
    details: (storyCommitDetailsRaw[story.name] || []).slice(0, 3),
  }));

  // Prepare developer story points data
  const developerStoryPointsRaw =
    metrics.commitMetrics?.developerStoryPoints || {};
  const developerStoryPointsData = Object.entries(developerStoryPointsRaw)
    .map(([name, value]) => ({ name, value: Number(value) || 0 }))
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

  console.log(
    "[MetricsCharts] Developer story points data:",
    developerStoryPointsData,
  );

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          style={{
            background: "white",
            padding: "0.75rem",
            border: "1px solid #e2e8f0",
            borderRadius: "6px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
          }}
        >
          <p style={{ margin: 0, fontWeight: "600", color: "#2d3748" }}>
            {payload[0].name}
          </p>
          <p
            style={{
              margin: "0.25rem 0 0 0",
              color: "#667eea",
              fontWeight: "600",
            }}
          >
            {payload[0].value}{" "}
            {payload[0].name.includes("Commit") ? "commits" : "story points"}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ marginTop: "2rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
          gap: "1rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <h2
            style={{
              fontSize: "1.75rem",
              fontWeight: "700",
              color: "#1f2937",
              margin: 0,
            }}
          >
            Metrics Dashboard
          </h2>
          <p
            style={{
              margin: "0.5rem 0 0 0",
              color: "#4b5563",
              fontSize: "0.95rem",
              maxWidth: "680px",
            }}
          >
            A sharper view of AI story point savings, developer contribution,
            and sprint efficiency for your Jira board.
          </p>
        </div>
        {isLoading && (
          <div
            style={{
              padding: "0.5rem 1rem",
              background: "#e0f2fe",
              color: "#0c4a6e",
              borderRadius: "9999px",
              fontSize: "0.95rem",
              fontWeight: "600",
            }}
          >
            🔄 Refreshing metrics...
          </div>
        )}
      </div>

      <div
        style={{
          marginTop: "2rem",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            padding: "1.5rem",
            borderRadius: "12px",
            color: "white",
          }}
        >
          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
            Story Points Committed
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {metrics.currentSprint?.committedStoryPoints || 0}
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
            padding: "1.5rem",
            borderRadius: "12px",
            color: "white",
          }}
        >
          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
            Story Points Completed
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {metrics.currentSprint?.completedStoryPoints || 0}
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            padding: "1.5rem",
            borderRadius: "12px",
            color: "white",
          }}
        >
          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>
            Completion Rate
          </div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {metrics.currentSprint?.completionRate || 0}%
          </div>
        </div>
        <div
          style={{
            background: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
            padding: "1.5rem",
            borderRadius: "12px",
            color: "white",
          }}
        >
          <div style={{ fontSize: "0.9rem", opacity: 0.9 }}>Total Commits</div>
          <div
            style={{
              fontSize: "2rem",
              fontWeight: "bold",
              marginTop: "0.5rem",
            }}
          >
            {metrics.commitMetrics?.totalCommits || 0}
          </div>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: "1.75rem",
          marginTop: "2.5rem",
          marginBottom: "2rem",
        }}
      >
        {/* AI Usage Metrics */}
        {aiUsageData.length > 0 && (
          <div style={sectionCardStyle}>
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
                    color: "#111827",
                    margin: 0,
                  }}
                >
                  AI Usage Metrics
                </h3>
                <p
                  style={{
                    margin: "0.5rem 0 0 0",
                    color: "#475569",
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
                  fill="#8884d8"
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
                background: "#f8fafc",
                borderRadius: "12px",
                fontSize: "0.95rem",
                color: "#334155",
              }}
            >
              <p style={{ margin: 0, fontWeight: 700 }}>Time Saved</p>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  fontSize: "1.25rem",
                  color: "#0f172a",
                }}
              >
                {metrics.aiMetrics?.timeSavedTotal || 0} SP
              </p>
              <p style={{ margin: "0.5rem 0 0 0", color: "#475569" }}>
                Reduction of{" "}
                {metrics.aiMetrics?.timeSavedPercent?.toFixed(1) || 0}% compared
                to original estimates.
              </p>
            </div>
          </div>
        )}

        {aiUsageByAssigneeData.length > 0 && (
          <div style={sectionCardStyle}>
            <h3
              style={{
                fontSize: "1.35rem",
                fontWeight: "700",
                color: "#111827",
                marginBottom: "1rem",
              }}
            >
              AI Usage by Assignee
            </h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#4338ca", color: "white" }}>
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
                      Estimated Story Points With AI
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
                      Time Saved
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
                        background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                      }}
                    >
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          fontWeight: "600",
                          color: "#0f172a",
                        }}
                      >
                        {assignee.assignee}
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "#2563eb",
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_story_points.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "#4c51bf",
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_ai_story_points.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "#2f855a",
                          fontWeight: "700",
                        }}
                      >
                        {assignee.total_time_saved.toFixed(1)} SP
                      </td>
                      <td
                        style={{
                          padding: "0.85rem 1rem",
                          textAlign: "right",
                          color: "#475569",
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
        )}

        {/* Developer Commits */}
        <div style={sectionCardStyle}>
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
                  color: "#111827",
                  margin: 0,
                }}
              >
                Developer Commits
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#475569",
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={developerCommitsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => {
                      const displayName =
                        name.length > 15 ? `${name.substring(0, 12)}...` : name;
                      return `${displayName}: ${(percent * 100).toFixed(1)}%`;
                    }}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {developerCommitsData.map((entry, index) => (
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
                  overflow: "hidden",
                  borderRadius: "14px",
                  border: "1px solid rgba(148, 163, 184, 0.2)",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#4338ca", color: "white" }}>
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
                            background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              fontWeight: "600",
                              color: "#0f172a",
                            }}
                          >
                            {dev.name}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: "#16a34a",
                              fontWeight: "700",
                            }}
                          >
                            {dev.tickets}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: "#2563eb",
                              fontWeight: "700",
                            }}
                          >
                            {dev.value}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: "#475569",
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
              background: "#f8fafc",
              borderRadius: "14px",
              border: "1px solid rgba(148, 163, 184, 0.18)",
              fontSize: "0.95rem",
              color: "#334155",
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
                    color: "#475569",
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
                        color: "#dc2626",
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
        <div style={{ ...sectionCardStyle, gridColumn: "span 2" }}>
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
                  color: "#111827",
                  margin: 0,
                }}
              >
                Developer Story Points
              </h3>
              <p
                style={{
                  margin: "0.5rem 0 0 0",
                  color: "#475569",
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
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={developerStoryPointsData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) =>
                      `${name}: ${(percent * 100).toFixed(1)}%`
                    }
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {developerStoryPointsData.map((entry, index) => (
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

              {/* Developer Story Points Table */}
              <div
                style={{
                  marginTop: "1.5rem",
                  overflow: "hidden",
                  borderRadius: "14px",
                  border: "1px solid rgba(148, 163, 184, 0.18)",
                }}
              >
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#4338ca", color: "white" }}>
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
                            background: index % 2 === 0 ? "#ffffff" : "#f8fafc",
                          }}
                        >
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              fontWeight: "600",
                              color: "#0f172a",
                            }}
                          >
                            {dev.name}
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: "#2563eb",
                              fontWeight: "700",
                            }}
                          >
                            {dev.value.toFixed(1)} SP
                          </td>
                          <td
                            style={{
                              padding: "0.85rem 1rem",
                              textAlign: "right",
                              color: "#475569",
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
                  <h4 style={{ margin: "1rem 0 0.75rem 0", color: "#111827" }}>
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
                        <tr style={{ background: "#2563eb", color: "white" }}>
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
                              style={{ background: "#eff6ff" }}
                            >
                              <td
                                style={{
                                  padding: "0.85rem 1rem",
                                  fontWeight: "700",
                                  color: "#1e293b",
                                }}
                                colSpan={4}
                              >
                                {developer.assignee} —{" "}
                                {developer.total_story_points.toFixed(1)} SP
                                total
                              </td>
                            </tr>,
                            ...developer.issues.map((story, index) => (
                              <tr
                                key={`${developer.assignee}-${story.storyId}`}
                                style={{
                                  background:
                                    index % 2 === 0 ? "#ffffff" : "#f8fafc",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    fontWeight: "600",
                                    color: "#0f172a",
                                  }}
                                >
                                  {story.storyId}
                                </td>
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    fontWeight: "500",
                                    color: "#475569",
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
                                    color: "#2563eb",
                                    fontWeight: "700",
                                  }}
                                >
                                  {story.storyPoints.toFixed(1)} SP
                                </td>
                                <td
                                  style={{
                                    padding: "0.85rem 1rem",
                                    textAlign: "right",
                                    color: "#475569",
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
      )}

      {/* Story Commits Bar Chart */}
      {storyCommitsData.length > 0 && (
        <div
          style={{
            background: "#f7fafc",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e2e8f0",
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
              <Bar dataKey="value" fill="#667eea" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div style={{ marginTop: "1.25rem" }}>
            <h4
              style={{
                margin: "0 0 0.75rem 0",
                color: "#111827",
                fontSize: "1rem",
                fontWeight: "700",
              }}
            >
              Linked commit details
            </h4>
            <div style={{ display: "grid", gap: "0.75rem" }}>
              {storyCommitDetailsData.map((story) => (
                <div
                  key={story.name}
                  style={{
                    border: "1px solid rgba(148, 163, 184, 0.2)",
                    borderRadius: "10px",
                    padding: "0.9rem 1rem",
                    background: "white",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.75rem",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <strong style={{ color: "#0f172a" }}>{story.name}</strong>
                    <span style={{ color: "#2563eb", fontWeight: 700 }}>
                      {story.value} commit{story.value === 1 ? "" : "s"}
                    </span>
                  </div>
                  {story.details.length > 0 ? (
                    <ul style={{ margin: 0, paddingLeft: "1rem", color: "#475569" }}>
                      {story.details.map((detail) => (
                        <li key={`${story.name}-${detail.sha}`} style={{ marginBottom: "0.35rem" }}>
                          <span style={{ color: "#0f172a", fontWeight: 600 }}>
                            {detail.sha}
                          </span>{" "}
                          {detail.message}
                          <span style={{ color: "#64748b", display: "block", fontSize: "0.85rem" }}>
                            {detail.author} • {detail.date}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span style={{ color: "#64748b" }}>
                      No linked commit details found for this story.
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
