"""Configuration management for Jira Velocity Metrics"""
import os
from dotenv import load_dotenv
from typing import List, Dict
from datetime import datetime

load_dotenv()


class Config:
    """Application configuration"""
    
    # Jira Configuration
    JIRA_SERVER = os.getenv('JIRA_SERVER', 'https://tailored-prod.atlassian.net')
    JIRA_EMAIL = os.getenv('JIRA_EMAIL', '')
    JIRA_API_TOKEN = os.getenv('JIRA_API_TOKEN', '')
    
    # AI Adoption Date
    AI_ADOPTION_DATE_STR = os.getenv('AI_ADOPTION_DATE', '2024-01-01')
    AI_ADOPTION_DATE = datetime.strptime(AI_ADOPTION_DATE_STR, '%Y-%m-%d').date()
    
    # AI Story Points Field ID (optional - set after creating custom field in Jira)
    AI_STORY_POINTS_FIELD_ID = os.getenv('AI_STORY_POINTS_FIELD_ID', '')
    
    
    # Teams Configuration
    # Format: team_name:board_id:project_key
    TEAMS_CONFIG = os.getenv('TEAMS', 'ELECOM:58:ELECOM')
    
    @classmethod
    def get_teams(cls) -> List[Dict[str, str]]:
        """Parse teams configuration and return list of team configs"""
        teams = []
        for team_config in cls.TEAMS_CONFIG.split(','):
            parts = team_config.strip().split(':')
            if len(parts) == 3:
                teams.append({
                    'name': parts[0],
                    'board_id': parts[1],
                    'project_key': parts[2]
                })
        return teams
    
    @classmethod
    def validate(cls) -> bool:
        """Validate configuration"""
        if not cls.JIRA_EMAIL or not cls.JIRA_API_TOKEN:
            print("ERROR: JIRA_EMAIL and JIRA_API_TOKEN must be set in .env file")
            return False
        return True
