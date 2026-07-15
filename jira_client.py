"""Jira API client for fetching sprint data"""
from jira import JIRA
from typing import List, Dict, Optional, Tuple
from datetime import datetime, date
import config
import requests


class JiraClient:
    """Client for interacting with Jira API"""
    
    def __init__(self):
        """Initialize Jira client"""
        if not config.Config.validate():
            raise ValueError("Invalid configuration. Please check your .env file.")
        
        self.jira = JIRA(
            server=config.Config.JIRA_SERVER,
            basic_auth=(config.Config.JIRA_EMAIL, config.Config.JIRA_API_TOKEN)
        )
        self.server = config.Config.JIRA_SERVER
        self.auth = (config.Config.JIRA_EMAIL, config.Config.JIRA_API_TOKEN)
        self._ai_story_points_field_id = None
        self._field_name_cache: Dict[str, str] = {}
    
    def _resolve_custom_field_id(self, field_ref: str) -> Optional[str]:
        """Resolve a Jira custom field reference to a customfield_XXXXX ID."""
        if not field_ref:
            return None

        normalized = field_ref.strip()
        if normalized.startswith('customfield_'):
            return normalized

        if normalized.isdigit():
            return f'customfield_{normalized}'

        return self._get_field_id_by_name(normalized)

    def _get_field_name_cache(self) -> Dict[str, str]:
        """Cache Jira field metadata by field ID."""
        if not self._field_name_cache:
            try:
                for field in self.jira.fields():
                    field_id = field.get('id')
                    field_name = field.get('name')
                    if field_id and field_name:
                        self._field_name_cache[field_id] = field_name
            except Exception:
                pass
        return self._field_name_cache

    def _get_field_id_by_name(self, field_name: str) -> Optional[str]:
        """Look up a Jira field ID by its display name."""
        if not field_name:
            return None

        target_name = field_name.strip().lower()
        for field_id, name in self._get_field_name_cache().items():
            if name and name.strip().lower() == target_name:
                return field_id
        return None

    def _parse_numeric_value(self, value) -> Optional[float]:
        """Convert Jira field values to floats when possible."""
        if value is None:
            return None

        if isinstance(value, list):
            if not value:
                return None
            value = value[0]

        if isinstance(value, dict):
            if 'value' in value:
                value = value['value']
            elif 'name' in value:
                value = value['name']

        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _get_field_value(self, fields: Dict, field_id: Optional[str]) -> Optional[float]:
        """Extract a numeric value from a field dictionary."""
        if not field_id or field_id not in fields:
            return None
        return self._parse_numeric_value(fields[field_id])

    def _get_story_points_field_and_value(self, fields: Dict) -> Tuple[Optional[str], Optional[float]]:
        """Resolve the actual story points field ID and value from the issue payload."""
        for field_id in ['customfield_10129', 'customfield_10016', 'customfield_10020', 'customfield_10021']:
            value = self._get_field_value(fields, field_id)
            if value is not None:
                return field_id, value

        fallback_field_id = self._get_field_id_by_name('Story Points')
        if fallback_field_id:
            value = self._get_field_value(fields, fallback_field_id)
            if value is not None:
                return fallback_field_id, value

        return None, None

    def _get_story_points_value(self, fields: Dict, excluded_field_id: Optional[str] = None) -> Optional[float]:
        """Resolve actual story points from the issue payload."""
        field_id, value = self._get_story_points_field_and_value(fields)
        if field_id and field_id != excluded_field_id:
            return value
        return None

    def _get_ai_story_points_value(self, fields: Dict, excluded_field_id: Optional[str] = None) -> Optional[float]:
        """Resolve AI story points from the issue payload, preferring the configured field when available."""
        ai_field_id = self._get_ai_story_points_field_id()
        if ai_field_id and ai_field_id != excluded_field_id:
            value = self._get_field_value(fields, ai_field_id)
            if value is not None:
                return value

        for candidate_name in ['AI Story Points', 'Story Points']:
            candidate_field_id = self._get_field_id_by_name(candidate_name)
            if candidate_field_id and candidate_field_id != excluded_field_id and candidate_field_id != ai_field_id:
                value = self._get_field_value(fields, candidate_field_id)
                if value is not None:
                    return value

        return None

    def _get_ai_story_points_field_id(self) -> Optional[str]:
        """Return the resolved AI story points custom field ID."""
        if self._ai_story_points_field_id is not None:
            return self._ai_story_points_field_id

        field_ref = config.Config.AI_STORY_POINTS_FIELD_ID or ''
        resolved = self._resolve_custom_field_id(field_ref)
        if resolved:
            self._ai_story_points_field_id = resolved
            return resolved

        for candidate_name in ['AI Story Points', 'Story Points']:
            resolved = self._get_field_id_by_name(candidate_name)
            if resolved:
                self._ai_story_points_field_id = resolved
                return resolved

        return None

    def get_sprint(self, board_id: str, sprint_name: Optional[str] = None) -> Optional[Dict]:
        """Get active or specified sprint for a board"""
        try:
            # Use Agile API to get sprints
            sprints = self.jira.sprints(int(board_id), state='active')
            
            if not sprints and sprint_name:
                # Try to find sprint by name
                all_sprints = self.jira.sprints(int(board_id), state='all')
                sprints = [s for s in all_sprints if sprint_name.lower() in s.name.lower()]
            
            if sprints:
                return sprints[0]
            return None
        except Exception as e:
            print(f"Error fetching sprint: {e}")
            return None
    
    def get_sprint_issues(self, board_id: str, sprint_id: int) -> List[Dict]:
        """Get all issues for a sprint using API v3"""
        try:
            # Try Agile API first (more efficient for sprint issues)
            # Build fields list dynamically to include story point fields and the configured AI field if present
            field_ids = ['summary', 'status', 'issuetype', 'created', 'resolutiondate', 'labels', 'assignee', 'customfield_10129', 'customfield_10016', 'customfield_10020', 'customfield_10021']
            ai_field_id = self._get_ai_story_points_field_id()
            if ai_field_id:
                field_ids.append(ai_field_id)
            fields_list = ','.join(field_ids)
            
            url = f"{self.server}/rest/agile/1.0/board/{board_id}/sprint/{sprint_id}/issue"
            params = {
                'maxResults': 1000,
                'fields': fields_list
            }
            
            all_issues = []
            start_at = 0
            
            while True:
                params['startAt'] = start_at
                response = requests.get(url, auth=self.auth, params=params)
                
                if response.status_code == 200:
                    data = response.json()
                    issues = data.get('issues', [])
                    
                    if not issues:
                        break
                    
                    all_issues.extend(issues)
                    
                    # Check if we've got all issues
                    total = data.get('total', 0)
                    if start_at + len(issues) >= total or len(issues) == 0:
                        break
                        
                    start_at += len(issues)
                else:
                    # Agile API failed, break and try JQL search
                    break
            
            # If Agile API worked, convert to our format
            if all_issues:
                issue_data = []
                for issue in all_issues:
                    fields = issue.get('fields', {})
                    status = fields.get('status', {})
                    issue_type = fields.get('issuetype', {})
                    
                    # Get story points and AI story points
                    story_points = None
                    ai_story_points = None
                    ai_points_saved = None
                    
                    # Try to get story points from fields first and remember the field ID
                    story_points_field_id, story_points = self._get_story_points_field_and_value(fields)
                      
                    # If not found, fetch full issue
                    if story_points is None:
                        try:
                            issue_key = issue.get('key')
                            full_issue = self.jira.issue(issue_key)
                            story_points = self._get_story_points(full_issue)
                        except:
                            pass
                    
                    # Calculate AI story points from configured custom field first
                    ai_story_points = self._get_ai_story_points_value(fields, excluded_field_id=story_points_field_id)
                    if ai_story_points is not None and story_points is not None:
                        ai_points_saved = ai_story_points - story_points
                    
                    # If no custom field value, try label-based extraction
                    if ai_story_points is None:
                        labels = fields.get('labels', [])
                        ai_points_saved = self._extract_ai_points_from_labels(labels)
                        if ai_points_saved is not None and story_points is not None:
                            ai_story_points = story_points + ai_points_saved
                    
                    # Fallback to full issue if needed
                    if ai_story_points is None and story_points is not None:
                        try:
                            issue_key = issue.get('key')
                            full_issue = self.jira.issue(issue_key)
                            ai_story_points = self._get_ai_story_points(full_issue)
                            if ai_story_points is not None and story_points is not None:
                                ai_points_saved = ai_story_points - story_points
                        except:
                            pass
                    
                    if ai_story_points is not None and story_points is not None:
                        ai_points_saved = ai_story_points - story_points
                    elif ai_points_saved is None and ai_story_points is not None and story_points is not None:
                        ai_points_saved = ai_story_points - story_points
                    
                    if ai_story_points is None and ai_points_saved is not None and story_points is not None:
                        ai_story_points = story_points + ai_points_saved
                    
                    assignee = fields.get('assignee')
                    assignee_name = None
                    if isinstance(assignee, dict):
                        assignee_name = assignee.get('displayName') or assignee.get('emailAddress') or assignee.get('name')
                    elif isinstance(assignee, str):
                        assignee_name = assignee
                    
                    issue_dict = {
                        'key': issue.get('key'),
                        'summary': fields.get('summary', ''),
                        'status': status.get('name', ''),
                        'story_points': story_points,
                        'ai_story_points': ai_story_points,
                        'ai_points_saved': ai_points_saved if ai_points_saved is not None else 0,
                        'issue_type': issue_type.get('name', ''),
                        'created': fields.get('created', ''),
                        'resolved': fields.get('resolutiondate'),
                        'labels': fields.get('labels', []),
                        'assignee': assignee_name or 'Unassigned',
                        'is_defect': issue_type.get('name', '').lower() in ['bug', 'defect', 'error'],
                    }
                    issue_data.append(issue_dict)
                
                return issue_data
            
            # Fallback: Use API v3 JQL search endpoint directly
            url = f"{self.server}/rest/api/3/search/jql"
            jql_query = f'sprint = {sprint_id}'
            
            all_issues = []
            next_page_token = None
            
            while True:
                # Build fields list dynamically to include story-point fields and the configured AI field if present
                fields_list = ['summary', 'status', 'issuetype', 'created', 'resolutiondate', 'labels', 'assignee', 'customfield_10129', 'customfield_10016', 'customfield_10020', 'customfield_10021']
                ai_field_id = self._get_ai_story_points_field_id()
                if ai_field_id:
                    fields_list.append(ai_field_id)
                
                payload = {
                    'jql': jql_query,
                    'maxResults': 100,
                    'fields': fields_list
                }
                
                if next_page_token:
                    payload['nextPageToken'] = next_page_token
                
                response = requests.post(url, auth=self.auth, json=payload)
                
                if response.status_code != 200:
                    raise Exception(f"API v3 JQL search returned status {response.status_code}: {response.text}")
                
                data = response.json()
                issues = data.get('issues', [])
                
                if not issues:
                    break
                
                all_issues.extend(issues)
                
                # Check for next page
                next_page_token = data.get('nextPageToken')
                if not next_page_token or data.get('isLast', True):
                    break
            
            # Convert to our format
            issue_data = []
            for issue in all_issues:
                fields = issue.get('fields', {})
                status = fields.get('status', {})
                issue_type = fields.get('issuetype', {})
                
                # Get story points from custom fields
                story_points_field_id, story_points = self._get_story_points_field_and_value(fields)
                
                # Get AI story points from configured custom field first
                ai_story_points = None
                ai_points_saved = None
                ai_story_points = self._get_ai_story_points_value(fields, excluded_field_id=story_points_field_id)
                if ai_story_points is not None and story_points is not None:
                    ai_points_saved = ai_story_points - story_points
                
                # If no custom field value, try label-based extraction
                if ai_story_points is None:
                    labels = fields.get('labels', [])
                    ai_points_saved = self._extract_ai_points_from_labels(labels)
                    if ai_points_saved is not None and story_points is not None:
                        ai_story_points = story_points + ai_points_saved
                
                # Fallback to full issue if needed
                if ai_story_points is None and story_points is not None:
                    try:
                        issue_key = issue.get('key')
                        full_issue = self.jira.issue(issue_key)
                        ai_story_points = self._get_ai_story_points(full_issue)
                        if ai_story_points is not None and story_points is not None:
                            ai_points_saved = ai_story_points - story_points
                    except:
                        pass
                
                if ai_points_saved is None and ai_story_points is not None and story_points is not None:
                    ai_points_saved = ai_story_points - story_points
                
                assignee = fields.get('assignee')
                assignee_name = None
                if isinstance(assignee, dict):
                    assignee_name = assignee.get('displayName') or assignee.get('emailAddress') or assignee.get('name')
                elif isinstance(assignee, str):
                    assignee_name = assignee
                
                issue_dict = {
                    'key': issue.get('key'),
                    'summary': fields.get('summary', ''),
                    'status': status.get('name', ''),
                    'story_points': story_points,
                    'ai_story_points': ai_story_points,
                    'ai_points_saved': ai_points_saved if ai_points_saved is not None else 0,
                    'issue_type': issue_type.get('name', ''),
                    'created': fields.get('created', ''),
                    'resolved': fields.get('resolutiondate'),
                    'labels': fields.get('labels', []),
                    'assignee': assignee_name or 'Unassigned',
                    'is_defect': issue_type.get('name', '').lower() in ['bug', 'defect', 'error'],
                }
                issue_data.append(issue_dict)
            
            return issue_data
            
        except Exception as e:
            print(f"Error fetching sprint issues: {e}")
            return []
    
    def get_sprint_metrics(self, board_id: str, sprint_id: int) -> Dict:
        """Get comprehensive sprint metrics"""
        issues = self.get_sprint_issues(board_id, sprint_id)
        
        total_story_points = sum(issue['story_points'] for issue in issues if issue['story_points'])
        completed_story_points = sum(
            issue['story_points'] for issue in issues 
            if issue['story_points'] and issue['status'] in ['Done', 'Closed', 'Resolved']
        )
        
        defects = [issue for issue in issues if issue['is_defect']]
        defect_count = len(defects)
        
        completed_issues = [issue for issue in issues if issue['status'] in ['Done', 'Closed', 'Resolved']]
        
        return {
            'total_issues': len(issues),
            'completed_issues': len(completed_issues),
            'total_story_points': total_story_points,
            'completed_story_points': completed_story_points,
            'defect_count': defect_count,
            'issues': issues
        }
    
    def get_historical_sprints(self, board_id: str, limit: int = 10) -> List[Dict]:
        """Get historical sprints for velocity calculation"""
        try:
            sprints = self.jira.sprints(board_id, state='closed')[:limit]
            sprint_data = []
            
            for sprint in sprints:
                metrics = self.get_sprint_metrics(board_id, sprint.id)
                sprint_data.append({
                    'id': sprint.id,
                    'name': sprint.name,
                    'state': sprint.state,
                    'start_date': sprint.startDate,
                    'end_date': sprint.endDate,
                    'metrics': metrics
                })
            
            return sprint_data
        except Exception as e:
            print(f"Error fetching historical sprints: {e}")
            return []
    
    def _get_story_points(self, issue) -> Optional[float]:
        """Extract story points from issue"""
        try:
            issue_fields = getattr(issue, 'fields', None)
            if issue_fields is None:
                return None

            field_ids = ['customfield_10129', 'customfield_10016', 'customfield_10020', 'customfield_10021']
            for field_id in field_ids:
                if hasattr(issue_fields, field_id):
                    value = getattr(issue_fields, field_id)
                    parsed = self._parse_numeric_value(value)
                    if parsed is not None:
                        return parsed

            fallback_field_id = self._get_field_id_by_name('Story Points')
            if fallback_field_id and hasattr(issue_fields, fallback_field_id):
                value = getattr(issue_fields, fallback_field_id)
                parsed = self._parse_numeric_value(value)
                if parsed is not None:
                    return parsed

            return None
        except:
            return None
    
    def _get_ai_story_points(self, issue) -> Optional[float]:
        """Extract AI story points from issue using custom field or labels"""
        try:
            issue_fields = getattr(issue, 'fields', None)
            if issue_fields is None:
                return None

            actual_story_points = self._get_story_points(issue)
            actual_field_id = None
            if actual_story_points is not None:
                actual_field_id = None
                for field_id in ['customfield_10129', 'customfield_10016', 'customfield_10020', 'customfield_10021']:
                    if hasattr(issue_fields, field_id):
                        value = getattr(issue_fields, field_id)
                        if self._parse_numeric_value(value) is not None:
                            actual_field_id = field_id
                            break
                if actual_field_id is None:
                    actual_field_id = self._get_field_id_by_name('Story Points')

            ai_field_id = self._get_ai_story_points_field_id()
            if ai_field_id and hasattr(issue_fields, ai_field_id) and ai_field_id != actual_field_id:
                value = getattr(issue_fields, ai_field_id)
                parsed = self._parse_numeric_value(value)
                if parsed is not None:
                    return parsed

            for candidate_name in ['AI Story Points', 'Story Points']:
                candidate_field_id = self._get_field_id_by_name(candidate_name)
                if candidate_field_id and candidate_field_id != actual_field_id and candidate_field_id != ai_field_id and hasattr(issue_fields, candidate_field_id):
                    value = getattr(issue_fields, candidate_field_id)
                    parsed = self._parse_numeric_value(value)
                    if parsed is not None:
                        return parsed
        except:
            pass
        
        # Fallback to labels (AI1, AI2, AI3, etc.)
        try:
            labels = issue.fields.labels if hasattr(issue.fields, 'labels') else []
            ai_points = self._extract_ai_points_from_labels(labels)
            if ai_points is not None:
                # AI story points = actual story points + points saved from label
                actual_points = self._get_story_points(issue) or 0
                return actual_points + ai_points
        except:
            pass
        
        return None
    
    def _extract_ai_points_from_labels(self, labels: List[str]) -> Optional[float]:
        """Extract AI points saved from labels (AI1 = 1 point, AI2 = 2 points, etc.)
        
        Only accepts labels in format: AI followed immediately by a number (1-999)
        Ignores invalid formats like AI2121212, AIJHS, AI 1 (with space), etc.
        """
        if not labels:
            return None
        
        for label in labels:
            if not isinstance(label, str):
                continue
                
            label_upper = label.upper().strip()
            
            # Must start with "AI" and have something after it
            if not label_upper.startswith('AI') or len(label_upper) <= 2:
                continue
            
            # Extract the part after "AI" (must be immediately after, no spaces)
            after_ai = label_upper[2:]
            
            # Must be only digits (no letters, no special chars, no spaces)
            if not after_ai.isdigit():
                continue
            
            try:
                points = int(after_ai)
                # Only accept reasonable values (1-999, 0 is invalid)
                if 1 <= points <= 999:
                    return float(points)
            except (ValueError, AttributeError):
                continue
        
        return None
    
    def _is_defect(self, issue) -> bool:
        """Check if issue is a defect/bug"""
        issue_type = issue.fields.issuetype.name.lower()
        return issue_type in ['bug', 'defect', 'error']
    
    def get_current_sprint(self, board_id: str) -> Optional[Dict]:
        """Get current active sprint"""
        sprint = self.get_sprint(board_id)
        if sprint:
            metrics = self.get_sprint_metrics(board_id, sprint.id)
            return {
                'id': sprint.id,
                'name': sprint.name,
                'state': sprint.state,
                'start_date': sprint.startDate,
                'end_date': sprint.endDate,
                'metrics': metrics
            }
        return None
