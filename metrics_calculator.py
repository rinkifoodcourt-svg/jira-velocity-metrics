"""Calculate velocity metrics and improvements"""
from typing import List, Dict, Optional
from datetime import date, datetime
import config


class MetricsCalculator:
    """Calculate velocity metrics and AI impact"""
    
    def __init__(self, ai_adoption_date: date):
        """Initialize calculator with AI adoption date"""
        self.ai_adoption_date = ai_adoption_date
    
    def calculate_velocity(self, sprints: List[Dict]) -> Dict:
        """Calculate average velocity from sprint data"""
        if not sprints:
            return {
                'average_velocity': 0,
                'sprint_count': 0,
                'velocities': []
            }
        
        velocities = []
        for sprint in sprints:
            metrics = sprint.get('metrics', {})
            completed_points = metrics.get('completed_story_points', 0)
            if completed_points > 0:
                velocities.append(completed_points)
        
        average_velocity = sum(velocities) / len(velocities) if velocities else 0
        
        return {
            'average_velocity': round(average_velocity, 2),
            'sprint_count': len(velocities),
            'velocities': velocities
        }
    
    def calculate_baseline_velocity(self, sprints: List[Dict]) -> Dict:
        """Calculate baseline velocity before AI adoption"""
        baseline_sprints = [
            sprint for sprint in sprints
            if sprint.get('end_date') and self._is_before_ai_adoption(sprint['end_date'])
        ]
        return self.calculate_velocity(baseline_sprints)
    
    def calculate_post_ai_velocity(self, sprints: List[Dict]) -> Dict:
        """Calculate velocity after AI adoption"""
        post_ai_sprints = [
            sprint for sprint in sprints
            if sprint.get('end_date') and not self._is_before_ai_adoption(sprint['end_date'])
        ]
        return self.calculate_velocity(post_ai_sprints)
    
    def calculate_velocity_improvement(self, baseline: Dict, post_ai: Dict) -> Dict:
        """Calculate velocity improvement percentage"""
        baseline_velocity = baseline.get('average_velocity', 0)
        post_ai_velocity = post_ai.get('average_velocity', 0)
        
        if baseline_velocity == 0:
            improvement_percent = 0 if post_ai_velocity == 0 else 100
        else:
            improvement_percent = ((post_ai_velocity - baseline_velocity) / baseline_velocity) * 100
        
        return {
            'baseline_velocity': baseline_velocity,
            'post_ai_velocity': post_ai_velocity,
            'improvement_percent': round(improvement_percent, 2),
            'improvement_points': round(post_ai_velocity - baseline_velocity, 2)
        }
    
    def calculate_defect_metrics(self, sprints: List[Dict]) -> Dict:
        """Calculate defect metrics"""
        baseline_defects = []
        post_ai_defects = []
        
        for sprint in sprints:
            metrics = sprint.get('metrics', {})
            defect_count = metrics.get('defect_count', 0)
            
            if sprint.get('end_date'):
                if self._is_before_ai_adoption(sprint['end_date']):
                    baseline_defects.append(defect_count)
                else:
                    post_ai_defects.append(defect_count)
        
        baseline_avg = sum(baseline_defects) / len(baseline_defects) if baseline_defects else 0
        post_ai_avg = sum(post_ai_defects) / len(post_ai_defects) if post_ai_defects else 0
        
        defect_reduction = baseline_avg - post_ai_avg if baseline_avg > 0 else 0
        defect_reduction_percent = (defect_reduction / baseline_avg * 100) if baseline_avg > 0 else 0
        
        return {
            'baseline_avg_defects': round(baseline_avg, 2),
            'post_ai_avg_defects': round(post_ai_avg, 2),
            'defect_reduction': round(defect_reduction, 2),
            'defect_reduction_percent': round(defect_reduction_percent, 2)
        }
    
    def calculate_current_sprint_metrics(self, sprint: Dict) -> Dict:
        """Calculate metrics for current sprint"""
        if not sprint:
            return {}
        
        metrics = sprint.get('metrics', {})
        issues = metrics.get('issues', [])
        
        # Get total actual story points (all issues)
        total_story_points = metrics.get('total_story_points', 0) or 0
        completed_story_points = metrics.get('completed_story_points', 0) or 0
        
        # Calculate total points saved from labels (AI1, AI2, etc.)
        # Preserve signed values so time saved and loss are both reflected correctly.
        # Use ai_points_saved field if available, otherwise extract from labels
        def extract_ai_points_from_labels(labels):
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
        
        total_points_saved = 0
        completed_points_saved = 0
        
        # Debug: Track which issues have AI labels
        ai_labeled_issues = []
        
        for issue in issues:
            story_points_value = issue.get('story_points', 0) or 0
            ai_story_points_value = issue.get('ai_story_points')
            ai_points_saved = issue.get('ai_points_saved')

            if ai_story_points_value is not None and story_points_value is not None:
                ai_points_saved = ai_story_points_value - story_points_value
            elif ai_points_saved is None or (ai_points_saved == 0 and ai_story_points_value is None):
                ai_points_saved = extract_ai_points_from_labels(issue.get('labels', []))

            if ai_points_saved is None:
                ai_points_saved = 0

            if ai_points_saved != 0:
                ai_labeled_issues.append({
                    'key': issue.get('key', 'Unknown'),
                    'ai_points_saved': ai_points_saved,
                    'ai_story_points': ai_story_points_value,
                    'labels': issue.get('labels', []),
                    'story_points': story_points_value
                })
            total_points_saved += ai_points_saved

            if issue.get('status', '').lower() in ['done', 'closed', 'resolved']:
                completed_points_saved += ai_points_saved
        
        # Debug output
        if ai_labeled_issues:
            print(f"\n[DEBUG] Found {len(ai_labeled_issues)} issue(s) with AI labels:")
            for issue_info in ai_labeled_issues:
                print(f"  - {issue_info['key']}: {issue_info['ai_points_saved']} points saved (Labels: {issue_info['labels']}, SP: {issue_info['story_points']})")
            print(f"[DEBUG] Total points saved from labels: {total_points_saved}")
        
        # AI Story Points = Actual Story Points + Points Saved from Labels
        total_ai_story_points = total_story_points + total_points_saved
        completed_ai_story_points = completed_story_points + completed_points_saved
         
        # Time saved is just the points from labels
        time_saved_total = total_points_saved
        time_saved_completed = completed_points_saved
         
        # Calculate percentage time saved
        time_saved_percent = 0
        if total_ai_story_points > 0:
            time_saved_percent = round((time_saved_total / total_ai_story_points) * 100, 2)
 
        # Aggregate AI usage by assignee
        ai_usage_by_assignee = {}
        for issue in issues:
            assignee = issue.get('assignee') or 'Unassigned'
            story_points_value = issue.get('story_points', 0) or 0
            ai_story_points_value = issue.get('ai_story_points')
            ai_points_saved = issue.get('ai_points_saved')
 
            if ai_story_points_value is not None and story_points_value is not None:
                ai_points_saved = ai_story_points_value - story_points_value
            elif ai_points_saved is None or (ai_points_saved == 0 and ai_story_points_value is None):
                ai_points_saved = extract_ai_points_from_labels(issue.get('labels', []))
 
            if ai_story_points_value is None and ai_points_saved is not None and story_points_value is not None:
                ai_story_points_value = story_points_value + ai_points_saved
 
            if ai_story_points_value is None and story_points_value is not None:
                ai_story_points_value = story_points_value
 
            if ai_points_saved is None:
                ai_points_saved = 0
 
            issue_summary = {
                'key': issue.get('key', 'Unknown'),
                'summary': issue.get('summary', ''),
                'story_points': story_points_value,
                'ai_story_points': ai_story_points_value,
                'time_saved': ai_points_saved,
                'time_saved_percent': round((ai_points_saved / ai_story_points_value * 100), 2) if ai_story_points_value and ai_points_saved else 0,
                'status': issue.get('status', ''),
                'labels': issue.get('labels', [])
            }
 
            assignee_data = ai_usage_by_assignee.get(assignee)
            if not assignee_data:
                assignee_data = {
                    'assignee': assignee,
                    'total_story_points': 0,
                    'total_ai_story_points': 0,
                    'total_time_saved': 0,
                    'issues': []
                }
            assignee_data['total_story_points'] += story_points_value
            assignee_data['total_ai_story_points'] += ai_story_points_value or 0
            assignee_data['total_time_saved'] += ai_points_saved
            assignee_data['issues'].append(issue_summary)
            ai_usage_by_assignee[assignee] = assignee_data
 
        ai_usage_by_assignee_list = []
        for assignee_name, data in ai_usage_by_assignee.items():
            total_ai_points = data['total_ai_story_points'] or 0
            time_saved = data['total_time_saved'] or 0
            data['time_saved_percent'] = round((time_saved / total_ai_points) * 100, 2) if total_ai_points else 0
            ai_usage_by_assignee_list.append(data)
 
        ai_usage_by_assignee_list.sort(key=lambda item: item.get('total_time_saved', 0), reverse=True)
 
        return {
            'sprint_name': sprint.get('name', 'Unknown'),
            'committed_story_points': total_story_points,
            'completed_story_points': completed_story_points,
            'completion_rate': round(
                (completed_story_points / total_story_points) * 100, 
                2
            ) if total_story_points > 0 else 0,
            'defect_count': metrics.get('defect_count', 0),
            'total_issues': metrics.get('total_issues', 0),
            'completed_issues': metrics.get('completed_issues', 0),
            # AI Story Points metrics
            'ai_story_points_committed': round(total_ai_story_points, 2),
            'ai_story_points_completed': round(completed_ai_story_points, 2),
            'time_saved_total': round(time_saved_total, 2),
            'time_saved_completed': round(time_saved_completed, 2),
            'time_saved_percent': time_saved_percent,
            'ai_usage_by_assignee': ai_usage_by_assignee_list,
            'has_ai_data': total_ai_story_points > 0
        }
    
    def _is_before_ai_adoption(self, sprint_end_date) -> bool:
        """Check if sprint ended before AI adoption"""
        if isinstance(sprint_end_date, str):
            try:
                sprint_date = datetime.strptime(sprint_end_date.split('T')[0], '%Y-%m-%d').date()
            except:
                return True
        elif isinstance(sprint_end_date, date):
            sprint_date = sprint_end_date
        else:
            return True
        
        return sprint_date < self.ai_adoption_date
    
    def generate_comprehensive_metrics(self, current_sprint: Dict, historical_sprints: List[Dict]) -> Dict:
        """Generate comprehensive metrics report"""
        baseline_velocity = self.calculate_baseline_velocity(historical_sprints)
        post_ai_velocity = self.calculate_post_ai_velocity(historical_sprints)
        velocity_improvement = self.calculate_velocity_improvement(baseline_velocity, post_ai_velocity)
        defect_metrics = self.calculate_defect_metrics(historical_sprints)
        current_sprint_metrics = self.calculate_current_sprint_metrics(current_sprint)
        
        return {
            'current_sprint': current_sprint_metrics,
            'baseline_velocity': baseline_velocity,
            'post_ai_velocity': post_ai_velocity,
            'velocity_improvement': velocity_improvement,
            'defect_metrics': defect_metrics,
            'ai_adoption_date': self.ai_adoption_date.isoformat()
        }
