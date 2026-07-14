"""Helpers for collecting actual commit details from the local git repository."""
from __future__ import annotations

import re
import subprocess
from pathlib import Path
from typing import Dict, List, Optional


class CommitDetail(dict):
    """Simple mapping for commit metadata."""


def _repo_root(repo_root: Optional[str] = None) -> Path:
    if repo_root:
        return Path(repo_root).resolve()
    return Path(__file__).resolve().parent


def collect_story_commit_details(issue_keys: List[str], repo_root: Optional[str] = None) -> Dict[str, List[Dict[str, str]]]:
    """Collect commit details that reference Jira story IDs from the local git history."""
    issue_keys = [issue_key for issue_key in (issue_keys or []) if issue_key]
    if not issue_keys:
        return {}

    root = _repo_root(repo_root)
    git_dir = root / ".git"
    if not git_dir.exists():
        return {}

    pattern = re.compile(r"\b(?:" + "|".join(re.escape(key) for key in issue_keys) + r")\b", re.IGNORECASE)

    result = subprocess.run(
        ["git", "log", "--all", "--date=short", "--pretty=format:%H%x09%an%x09%ae%x09%ad%x09%s%x00"],
        cwd=str(root),
        capture_output=True,
        text=True,
        check=False,
    )
    if result.returncode != 0:
        print(f"Warning: Unable to read git history: {result.stderr.strip()}")
        return {}

    commits_by_issue: Dict[str, List[Dict[str, str]]] = {}
    for raw_entry in result.stdout.split("\x00"):
        if not raw_entry.strip():
            continue

        parts = raw_entry.split("\t", 4)
        if len(parts) < 5:
            continue

        sha, author_name, author_email, commit_date, subject = parts[:5]
        message = subject.strip()
        if not message:
            continue

        matched_issue_keys = [key for key in issue_keys if pattern.search(message) and re.search(rf"\b{re.escape(key)}\b", message, re.IGNORECASE)]
        if not matched_issue_keys:
            continue

        commit_detail = {
            "sha": sha[:8],
            "message": message,
            "author": author_name or author_email or "Unknown",
            "date": commit_date,
        }

        for matched_key in matched_issue_keys:
            commits_by_issue.setdefault(matched_key, []).append(commit_detail)

    return commits_by_issue
