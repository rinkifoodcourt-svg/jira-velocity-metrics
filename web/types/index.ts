export interface Board {
  id: string
  name: string
  projectKey: string
}

export interface AIAssigneeIssue {
  key: string
  summary: string
  story_points: number
  ai_story_points: number
  time_saved: number
  time_saved_percent: number
  status: string
  labels: string[]
}

export interface AIAssigneeMetrics {
  assignee: string
  total_story_points: number
  total_ai_story_points: number
  total_time_saved: number
  time_saved_percent: number
  issues: AIAssigneeIssue[]
}

export interface AIMetrics {
  committedStoryPoints: number
  completedStoryPoints: number
  timeSavedTotal: number
  timeSavedPercent: number
  aiStoryPointsCommitted: number
  aiUsageByAssignee?: AIAssigneeMetrics[]
}

export interface StoryPointDetail {
  storyId: string
  storyPoints: number
  percentage: number
  issueFoundation?: string
}

export interface DeveloperStoryPointsByIssue {
  assignee: string
  total_story_points: number
  issues: StoryPointDetail[]
}

export interface CommitDetail {
  sha: string
  message: string
  author: string
  date: string
}

export interface CommitMetrics {
  totalCommits: number
  storiesWithCommits: number
  developerCommits: Record<string, number>
  developerTicketCounts?: Record<string, number>
  storyCommits: Record<string, number>
  storyCommitDetails?: Record<string, CommitDetail[]>
  developerStoryPoints?: Record<string, number>
  developerStoryPointsByIssue?: DeveloperStoryPointsByIssue[]
  totalCommitsScanned?: number
}

export interface CurrentSprint {
  sprintName: string
  committedStoryPoints: number
  completedStoryPoints: number
  completionRate: number
  defectCount: number
}

export interface MetricsData {
  currentSprint: CurrentSprint
  aiMetrics: AIMetrics | null
  commitMetrics: CommitMetrics | null
}
