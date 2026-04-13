# Email Notification Setup Guide

This guide explains how to set up spam/bad content email notifications for the memory wall.

## What This Does

When someone posts a memory with suspicious content (profanity, spam keywords, excessive caps, etc.), an email is automatically sent to the director(s) so they can review and delete/hide the memory if needed.

## Setup Steps

### 1. Get Your Resend API Key

1. Go to [resend.com](https://resend.com)
2. Sign in or create an account
3. Go to **Settings → API Keys**
4. Copy your API key (starts with `re_`)

### 2. Deploy Cloud Functions

In your terminal, from the project root:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

This deploys the spam detection function to Firebase.

### 3. Configure Settings in Dashboard

1. Go to your dashboard
2. Click the **Settings** button (gear icon)
3. Paste your Resend API key
4. Enter director email(s) - can be one or multiple (comma-separated)
5. Enable notifications
6. (Optional) Add custom keywords to flag
7. Click **Save Settings**

The settings are saved to Firestore automatically.

### 4. Test It

Option A: Manual test
- Submit a memory with spam content like "viagra" or "casino"
- Check the director's email inbox

Option B: Send test email
- Click the Settings button
- Run the test function:
  ```bash
  curl https://[your-firebase-url]/sendTestEmail
  ```

## How It Works

1. When a memory is posted, a Cloud Function checks the content
2. If it contains bad keywords, excessive caps, multiple URLs, or other spam indicators
3. An email is sent to all configured director emails
4. Director can review and delete/hide the memory from the dashboard
5. All settings (API key, emails, keywords) are managed from the dashboard

## Director Emails

You can:
- Add one email: `director@example.com`
- Add multiple (CC): `director@example.com, assistant@example.com`
- Change anytime in Settings without redeploying

## Custom Keywords

Add any keywords you want flagged (comma-separated):
- `viagra, casino, lottery, sponsorship`

## Default Flagged Keywords

- spam, scam, hack, viagra, casino, lottery
- congratulations you won, click here, limited time, act now
- free money, make money fast, work from home, get rich
- Plus: excessive caps, multiple URLs, unusual length

## Troubleshooting

**"Settings not found"**
- Save settings from the dashboard first

**No email received**
- Check director email address in Settings
- Check Resend account is active
- Check spam folder
- Verify the memory content actually triggers the filter (use a test memory with "viagra")

**Email has wrong links**
- Update the dashboard URL in `functions/index.js` (line ~145)
- Redeploy: `firebase deploy --only functions`

## Security Notes

- API key is stored securely (never in Git)
- Settings are in Firestore (encrypted at rest)
- Director can change anytime from dashboard
- Test function requires proper Firebase authentication
