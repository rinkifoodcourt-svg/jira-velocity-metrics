# Jira Velocity Dashboard - Web UI

A modern Next.js + TypeScript web dashboard for visualizing Jira velocity metrics, AI usage, and developer commit analytics.

## Features

- 📊 **Interactive Dashboard**: Real-time metrics visualization
- 🎯 **Board Selection**: Dropdown to select from configured Jira boards
- 📈 **AI Usage Metrics**: Pie chart showing AI impact and time saved
- 👥 **Developer Commits**: Pie chart showing commit distribution by developer
- 📋 **Story Commits**: Bar chart showing commits per story
- 🎨 **Modern UI**: Beautiful gradient design with responsive layout

## Prerequisites

- Node.js 18+ and npm/yarn
- Python 3.7+ (for API server)
- Jira API credentials configured in `.env`

## Setup

### 1. Install Dependencies

```bash
cd web
npm install
```

### 2. Configure Environment

Create `.env.local` in the `web` directory:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:5000
```

Then create a root `.env` file with your Jira credentials:

```env
JIRA_SERVER=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
```

### 3. Start the API Server

In the project root directory:

```bash
# Install Python dependencies if not already installed
pip install -r requirements.txt

# Start the Flask API server
python3 api_server.py
```

The API server will run on `http://localhost:5000`

### 4. Start the Next.js Development Server

In the `web` directory:

```bash
npm run dev
```

The dashboard will be available at `http://localhost:4000`

## Usage

1. **Select a Board**: Choose a board from the dropdown
2. **Generate Report**: Click "Generate Report" button
3. **View Metrics**:
   - AI Usage Metrics pie chart
   - Developer Commits pie chart
   - Story Commits bar chart
   - Summary statistics cards

## Project Structure

```
web/
├── app/
│   ├── layout.tsx          # Root layout
│   ├── page.tsx            # Main page
│   └── globals.css         # Global styles
├── components/
│   ├── Dashboard.tsx       # Main dashboard component
│   ├── BoardSelector.tsx  # Board selection dropdown
│   ├── MetricsCharts.tsx  # Charts and visualizations
│   └── LoadingSpinner.tsx # Loading indicator
├── lib/
│   └── api.ts             # API client functions
├── types/
│   └── index.ts           # TypeScript type definitions
└── package.json           # Dependencies
```

## API Endpoints

The Flask API server provides:

- `GET /api/health` - Health check
- `GET /api/boards` - Get list of configured boards
- `GET /api/metrics/<board_id>` - Get metrics for a board

## Development

### Run in Development Mode

```bash
# Terminal 1: Start API server
python3 api_server.py

# Terminal 2: Start Next.js dev server
cd web
npm run dev
```

### Build for Production

```bash
cd web
npm run build
npm start
```

## Troubleshooting

### "Failed to load boards"

- Ensure the API server is running on port 5000
- Check that `.env` file has correct Jira credentials
- Verify `NEXT_PUBLIC_API_BASE_URL` in `.env.local`

### "No boards available"

- Check your `.env` file has `TEAMS` configured
- Format: `TEAMS=TeamName:BoardID:ProjectKey`

### Charts not showing

- Check browser console for errors
- Ensure metrics data is being returned from API

## Technologies Used

- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Recharts** - Chart library
- **Flask** - Python API server
- **Axios** - HTTP client

## License

Same as main project
