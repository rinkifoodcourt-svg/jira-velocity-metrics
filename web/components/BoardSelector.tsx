"use client";

import type { Board } from "@/types";

interface BoardSelectorProps {
  boards: Board[];
  selectedBoard: string;
  onBoardChange: (boardId: string) => void;
  onGenerate: () => void;
  loading: boolean;
}

export default function BoardSelector({
  boards,
  selectedBoard,
  onBoardChange,
  onGenerate,
  loading,
}: BoardSelectorProps) {
  return (
    <div style={{ marginBottom: "0" }}>
      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-end",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1", minWidth: "300px" }}>
          <label
            style={{
              display: "block",
              marginBottom: "0.5rem",
              fontWeight: "600",
              color: "#2d3748",
              fontSize: "0.95rem",
            }}
          >
            Select Board
          </label>
          <select
            value={selectedBoard}
            onChange={(e) => onBoardChange(e.target.value)}
            disabled={loading || boards.length === 0}
            style={{
              width: "100%",
              padding: "0.75rem",
              fontSize: "1rem",
              border: "2px solid #e2e8f0",
              borderRadius: "8px",
              background: "white",
              color: "#2d3748",
              cursor: boards.length === 0 ? "not-allowed" : "pointer",
              opacity: boards.length === 0 ? 0.6 : 1,
            }}
          >
            {boards.length === 0 ? (
              <option value="">No boards available</option>
            ) : (
              boards.map((board) => (
                <option key={board.id} value={board.id}>
                  {board.name} ({board.projectKey})
                </option>
              ))
            )}
          </select>
        </div>

        <button
          onClick={onGenerate}
          disabled={loading || !selectedBoard || boards.length === 0}
          style={{
            padding: "0.75rem 2rem",
            fontSize: "1rem",
            fontWeight: "600",
            color: "white",
            background:
              loading || !selectedBoard || boards.length === 0
                ? "#a0aec0"
                : "#667eea",
            border: "none",
            borderRadius: "8px",
            cursor:
              loading || !selectedBoard || boards.length === 0
                ? "not-allowed"
                : "pointer",
            transition: "background 0.2s",
            minWidth: "150px",
            height: "48px",
          }}
          onMouseOver={(e) => {
            if (!loading && selectedBoard && boards.length > 0) {
              e.currentTarget.style.background = "#5568d3";
            }
          }}
          onMouseOut={(e) => {
            if (!loading && selectedBoard && boards.length > 0) {
              e.currentTarget.style.background = "#667eea";
            }
          }}
        >
          {loading ? (
            <span
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                className="button-spinner"
                style={{
                  display: "inline-block",
                  width: "16px",
                  height: "16px",
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid white",
                  borderRadius: "50%",
                  animation: "spin 0.8s linear infinite",
                }}
              />
              <span>Preparing...</span>
            </span>
          ) : (
            "Generate Report"
          )}
        </button>
      </div>
    </div>
  );
}
