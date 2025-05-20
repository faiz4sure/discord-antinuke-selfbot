# Quick Installation Guide

This guide will help you quickly install and set up the Discord Antinuke Selfbot.

## Prerequisites

- Node.js (v16 or higher)
- npm (comes with Node.js)
- A Discord account (use an alt account for safety)
- Your Discord token
- Server IDs you want to protect

## Installation Steps

### 1. Download the Selfbot

Clone this repository or download it as a ZIP file and extract it.

```bash
git clone https://github.com/faiz4sure/discord-antinuke-selfbot.git
cd discord-antinuke-selfbot
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure the Selfbot

1. Edit the `config/config.yaml` file with your information:
   - Update your Discord token in the `selfbot.token` field
   - Add your Discord user ID as an owner in `selfbot.owner1_id`
   - Add server IDs you want to protect in `selfbot.server1_id` and `selfbot.server2_id`
   - Add trusted admin IDs to the `whitelisted.users` array
   - Adjust protection thresholds in the `antinuke_settings` section if needed

### 4. Get Your Discord Token

⚠️ **NEVER share your token with anyone!**

To get your Discord token:

1. Open Discord in your web browser
2. Press F12 to open Developer Tools
3. Go to the Network tab
4. Type `/api` in the filter
5. Click on any request to discord.com
6. Find the "authorization" header in the request headers
7. That value is your token

### 5. Get Server and User IDs

To get IDs in Discord:

1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode)
2. Right-click on a server, user, or channel and select "Copy ID"

### 6. Start the Selfbot

```bash
node index.js
```

You should see the startup banner and confirmation that the selfbot is protecting your specified servers.

## Running 24/7

For the selfbot to be effective, it needs to run continuously (24/7).

### On VPS/Dedicated Server (Recommended)

Use a process manager like PM2:

```bash
# Install PM2
npm install -g pm2

# Start your application with PM2
pm2 start index.js --name "antinuke"

# Set PM2 to start on system boot
pm2 startup
pm2 save
```

### On Windows

Create a batch file (start.bat) with:
```batch
@echo off
node index.js
pause
```

### On Linux/macOS

Create a shell script (bash.sh or start.sh) with:
```bash
#!/bin/bash
node index.js
```

Make it executable:
```bash
chmod +x start.sh
```

## Hosting Recommendations

We strongly recommend using a VPS or dedicated hosting rather than running on your personal device.

Good affordable options include:
- DigitalOcean ($5/month droplet)
- Linode ($5/month plan)
- OVH ($3.50/month VPS)
- Oracle Cloud (free tier available)

For more detailed instructions and hosting recommendations, please visit our [support server](https://discord.gg/PEphKsNpe8).
