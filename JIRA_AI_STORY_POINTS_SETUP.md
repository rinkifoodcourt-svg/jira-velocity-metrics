# Setting Up AI Story Points Field in Jira

## Step 1: Create Custom Field in Jira

1. **Go to Jira Administration**
   - Click on your profile icon (bottom left)
   - Select **"Settings"** → **"Issues"** → **"Custom fields"**
   - Or navigate directly: `https://rajeshkuchinda.atlassian.net/jira/settings/fields`

2. **Create New Custom Field**
   - Click **"Create custom field"** button
   - Select field type: **"Number"** (for story points)
   - Click **"Next"**

3. **Configure the Field**
   - **Name:** `AI Story Points`
   - **Description:** `Estimated story points if this work was done without AI assistance. Used to compare actual vs AI story points.`
   - **Field ID:** Note this down (will be something like `customfield_10XXX`)
   - Click **"Create"**

4. **Add Field to Screens**
   - After creation, you'll be prompted to add it to screens
   - Add it to your **"Default Screen"** or relevant issue type screens
   - Make sure it appears in the **"Details"** panel (right sidebar)

5. **Find Your Field ID**
   - After creating the field, go to any issue
   - Inspect the "AI Story Points" field in browser developer tools
   - Look for `data-testid` or `customfield_XXXXX` in the HTML
   - **OR** check the field URL when editing: `.../fields/customfield_10XXX`

## Step 2: Update Your .env File

Once you have the field ID, add it to your `.env` file:

```env
AI_STORY_POINTS_FIELD_ID=customfield_10XXX
```

## Step 3: Populate the Field

For each issue in your sprints:

- Fill in **"Story Points"** (actual points with AI)
- Fill in **"AI Story Points"** (estimated points without AI)
- The difference shows time/productivity saved

## Example Usage

**Issue: "Implement Email Notifications"**

- **Story Points (with AI):** 2
- **AI Story Points (without AI):** 5
- **Time Saved:** 3 story points (60% reduction)

## Notes

- The field ID will be unique to your Jira instance
- You may need Jira admin permissions to create custom fields
- Consider making this field visible to your team in sprint planning
