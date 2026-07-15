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
    <div className="w-100">
      <div className="d-flex flex-column flex-lg-row gap-3 align-items-end flex-wrap">
        <div className="flex-grow-1 w-100" style={{ minWidth: "280px" }}>
          <label className="form-label fw-semibold mb-2">Select Board</label>
          <select
            value={selectedBoard}
            onChange={(e) => onBoardChange(e.target.value)}
            disabled={loading || boards.length === 0}
            className={`form-select dashboard-select ${boards.length === 0 ? "opacity-75" : ""}`}
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
          className={`btn btn-dashboard-primary rounded-pill px-4 py-2 ${loading || !selectedBoard || boards.length === 0 ? "disabled" : ""}`}
        >
          {loading ? (
            <span className="d-inline-flex align-items-center gap-2">
              <span className="loading-spinner rounded-circle border border-2 border-white border-top-0" style={{ width: "16px", height: "16px" }} />
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
