"""Simple Flask API server to trigger Jira Velocity report generation.

Endpoints:
- GET /health -> Returns service health
- POST /generate -> Trigger report generation for all teams or a specific team
    JSON body options:
      - team_name: (optional) generate only for the team with this name
      - upload: (optional bool) whether to upload to Confluence (passed to generate_report_for_team)
      - background: (optional bool) if true, run generation in a background thread and return immediately

Usage:
  python api_server.py

Note: Flask must be installed in the environment (pip install flask). This server calls into the existing main.generate_report_for_team function.
"""
import os
import tempfile

# Ensure a valid, writable temporary directory exists for Werkzeug/multiprocessing
workspace_tmp = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.tmp')
os.makedirs(workspace_tmp, exist_ok=True)
os.environ['TMPDIR'] = workspace_tmp
tempfile.tempdir = workspace_tmp

from flask import Flask, request, jsonify
from threading import Thread
import traceback
import config

app = Flask(__name__)


@app.after_request
def add_cors_headers(response):
    # Echo the Origin header and allow credentials. Browsers reject '*' when withCredentials is true.
    origin = request.headers.get('Origin')
    if origin:
        response.headers['Access-Control-Allow-Origin'] = origin
        # Signal caches/proxies that the response varies by Origin
        response.headers['Vary'] = 'Origin'
    else:
        # Default to the local frontend origin when no Origin header is present
        response.headers['Access-Control-Allow-Origin'] = 'http://localhost:4000'

    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,OPTIONS'
    # Allow cookies/credentials from the frontend
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


@app.route("/", methods=["GET"])
def index():
    return "<h1>Jira Velocity Metrics Backend API</h1><p>The dashboard is running at <a href='http://localhost:4000'>http://localhost:4000</a></p>"


@app.route("/api/health", methods=["GET"])
@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


def _generate_for_team(team_config: dict, upload: bool):
    # Import reporting code lazily so the API server can start even if heavy deps
    # (pandas/matplotlib) are not installed. This provides a clearer error at runtime.
    try:
        import main as report_main
    except Exception as imp_err:
        return {
            "team": team_config.get("name"),
            "success": False,
            "error": f"Reporting dependencies are not available: {imp_err}"
        }

    try:
        success = report_main.generate_report_for_team(team_config, upload_to_confluence=upload)
        return {"team": team_config.get("name"), "success": bool(success)}
    except Exception as e:
        return {"team": team_config.get("name"), "success": False, "error": str(e)}


@app.route("/generate", methods=["POST"])
def generate():
    """Trigger report generation.

    JSON body (all fields optional):
      - team_name: string
      - upload: bool (default False)
      - background: bool (default False)
    """
    try:
        data = request.get_json(silent=True) or {}
        team_name = data.get('team_name')
        upload = bool(data.get('upload', False))
        background = bool(data.get('background', False))

        teams = config.Config.get_teams()
        if not teams:
            return jsonify({"error": "No teams configured. Set TEAMS in .env or update config."}), 400

        # Resolve target teams
        target_teams = []
        if team_name:
            for t in teams:
                if t.get('name') == team_name:
                    target_teams = [t]
                    break
            if not target_teams:
                return jsonify({"error": f"Team named '{team_name}' not found."}), 404
        else:
            target_teams = teams

        def run_generation():
            results = []
            for team in target_teams:
                res = _generate_for_team(team, upload)
                results.append(res)
            # Optionally, could persist results or log them
            return results

        if background:
            thread = Thread(target=run_generation, daemon=True)
            thread.start()
            return jsonify({"status": "started", "teams": [t.get('name') for t in target_teams]}), 202
        else:
            results = run_generation()
            return jsonify({"status": "completed", "results": results}), 200

    except Exception as e:
        tb = traceback.format_exc()
        return jsonify({"error": str(e), "traceback": tb}), 500


@app.route('/api/boards', methods=['GET'])
def api_boards():
    try:
        teams = config.Config.get_teams() or []
        boards = []
        for t in teams:
            boards.append({
                'id': t.get('board_id'),
                'name': t.get('name'),
                'projectKey': t.get('project_key')
            })
        return jsonify({'boards': boards})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/metrics/<board_id>', methods=['GET'])
def api_metrics(board_id):
    try:
        # Lazy import Jira client and metrics calculator to avoid startup failures when deps are missing
        try:
            from jira_client import JiraClient
            from metrics_calculator import MetricsCalculator
        except Exception as imp_err:
            return jsonify({'error': f'Jira client not available: {imp_err}'}), 500

        from commit_metrics import collect_story_commit_details

        jira = JiraClient()
        sprint = jira.get_current_sprint(board_id)
        if not sprint:
            return jsonify({'error': f'No active sprint found for board {board_id}'}), 404

        metrics = sprint.get('metrics', {})
        total = metrics.get('total_story_points', 0)
        completed = metrics.get('completed_story_points', 0)
        completion_rate = 0
        if total:
            try:
                completion_rate = round((completed / total) * 100, 2)
            except Exception:
                completion_rate = 0

        current_sprint = {
            'sprintName': sprint.get('name'),
            'committedStoryPoints': total,
            'completedStoryPoints': completed,
            'completionRate': completion_rate,
            'defectCount': metrics.get('defect_count', 0)
        }

        # Calculate AI metrics from current sprint
        ai_metrics = None
        if metrics.get('issues'):
            try:
                calculator = MetricsCalculator(config.Config.AI_ADOPTION_DATE)
                sprint_metrics = calculator.calculate_current_sprint_metrics(sprint)
                
                if sprint_metrics.get('has_ai_data'):
                    ai_metrics = {
                        'committedStoryPoints': sprint_metrics.get('committed_story_points', 0),
                        'completedStoryPoints': sprint_metrics.get('completed_story_points', 0),
                        'timeSavedTotal': sprint_metrics.get('time_saved_total', 0),
                        'timeSavedPercent': sprint_metrics.get('time_saved_percent', 0),
                        'aiStoryPointsCommitted': sprint_metrics.get('ai_story_points_committed', 0),
                        'aiUsageByAssignee': sprint_metrics.get('ai_usage_by_assignee', [])
                    }
            except Exception as calc_err:
                print(f"Warning: Failed to calculate AI metrics: {calc_err}")

        # Generate commit metrics data from Jira issues.
        commit_metrics = None
        if metrics.get('issues'):
            try:
                issues = metrics.get('issues', [])
                issue_keys = [issue.get('key') for issue in issues if issue.get('key')]
                story_commit_details = collect_story_commit_details(issue_keys)

                developer_commits = {}
                story_commits = {}
                story_commit_details_payload = {}
                developer_story_points = {}
                developer_ticket_sets = {}
                developer_profiles = {}

                for issue in issues:
                    assignee = issue.get('assignee', 'Unassigned')
                    story_points = issue.get('story_points', 0)
                    key = issue.get('key', 'Unknown')

                    linked_commits = story_commit_details.get(key, []) if key else []
                    if key:
                        story_commits[key] = len(linked_commits)
                        story_commit_details_payload[key] = linked_commits

                    if assignee != 'Unassigned':
                        if assignee not in developer_ticket_sets:
                            developer_ticket_sets[assignee] = set()
                        if key:
                            developer_ticket_sets[assignee].add(key)
                        if story_points:
                            developer_story_points[assignee] = developer_story_points.get(assignee, 0) + story_points
                        developer_commits[assignee] = developer_commits.get(assignee, 0) + len(linked_commits)
                        
                        assignee_details = issue.get('assignee_details')
                        if assignee_details and assignee not in developer_profiles:
                            developer_profiles[assignee] = assignee_details

                total_commits = sum(developer_commits.values()) if developer_commits else 0

                developer_story_points_by_issue = []
                total_committed_story_points = metrics.get('total_story_points', 0) or 0
                if total_committed_story_points > 0:
                    developers = {}
                    for issue in issues:
                        assignee = issue.get('assignee', 'Unassigned') or 'Unassigned'
                        story_key = issue.get('key')
                        story_points = issue.get('story_points', 0) or 0
                        ai_sp = issue.get('ai_story_points')
                        ai_saved = issue.get('ai_points_saved', 0) or 0
                        if ai_sp is None and story_points is not None:
                            ai_sp = story_points + ai_saved

                        if assignee not in developers:
                            developers[assignee] = {
                                'assignee': assignee,
                                'total_story_points': 0,
                                'issues': []
                            }
                        developers[assignee]['total_story_points'] += story_points
                        if story_key and story_points > 0:
                            developers[assignee]['issues'].append({
                                'storyId': story_key,
                                'storyPoints': story_points,
                                'aiStoryPoints': round(ai_sp, 2) if ai_sp is not None else story_points,
                                'aiPointsSaved': round(ai_saved, 2),
                                'percentage': round((story_points / total_committed_story_points) * 100, 2),
                                'issueFoundation': issue.get('summary', '')
                            })
                    developer_story_points_by_issue = [
                        {
                            'assignee': assignee,
                            'total_story_points': data['total_story_points'],
                            'issues': sorted(data['issues'], key=lambda item: item['storyPoints'], reverse=True)
                        }
                        for assignee, data in sorted(developers.items(), key=lambda item: item[1]['total_story_points'], reverse=True)
                    ]

                developer_ticket_counts = {
                    assignee: len(keys)
                    for assignee, keys in developer_ticket_sets.items()
                }

                if total_commits > 0 or developer_commits or story_commits:
                    stories_with_commits = sum(1 for count in story_commits.values() if count > 0)
                    commit_metrics = {
                        'totalCommits': total_commits,
                        'storiesWithCommits': stories_with_commits,
                        'developerCommits': developer_commits,
                        'developerTicketCounts': developer_ticket_counts,
                        'storyCommits': story_commits,
                        'storyCommitDetails': story_commit_details_payload,
                        'developerStoryPoints': developer_story_points,
                        'developerStoryPointsByIssue': developer_story_points_by_issue,
                        'developerProfiles': developer_profiles
                    }
            except Exception as commits_err:
                print(f"Warning: Failed to calculate commit metrics: {commits_err}")

        return jsonify({
            'currentSprint': current_sprint,
            'aiMetrics': ai_metrics,
            'commitMetrics': commit_metrics
        })
    except Exception as e:
        tb = traceback.format_exc()
        return jsonify({'error': str(e), 'traceback': tb}), 500


if __name__ == "__main__":
    # Default host/port — adjust as needed. Use a production WSGI server for production.
    app.run(host="localhost", port=5000, debug=True)
