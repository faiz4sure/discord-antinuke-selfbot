# Discord Antinuke Selfbot

A sophisticated Discord anti-abuse selfbot engineered to provide comprehensive server protection through advanced security monitoring and proactive threat mitigation.

![Discord Antinuke Selfbot](./self.png)

## 👮 Officials
Below are the officials of this repository who actually build it and will also provide support upon it.
On github you can also find repository skidders, who dont even know how to code. So make sure you always use official repository provided by these Officials.

- [faiz4sure](https://github.com/faiz4sure) (Currently)

## ⚠️ DISCLAIMER

**Using selfbots is against Discord's Terms of Service.**
This code is provided for educational purposes only.
Use at your own risk. The developer does not take responsibility for any consequences.
This repository is officially owned by [faiz4sure](https://github.com/faiz4sure) and any kind of user data is not being collected by developers through this. We dont take responsiblity if you use repository of any **Unofficial skidder**.

## 🛡️ Features

- **WebSocket Optimized**: Ultra-fast response to threats using WebSocket connection
- **No Commands Required**: Fully configurable via config.yaml, no discord commands
- **Anti-Abuse Protection**:
  - Anti Bot Add: Prevents unauthorized bot additions
  - Anti Channel Create/Delete/Update: Prevents unauthorized channel modifications
  - Anti Mass Ban/Kick/Unban: Detects and prevents mass member removals
  - Anti Role Create/Delete/Update: Prevents unauthorized role modifications
  - Anti Member Update: Monitors suspicious member permission changes
- **Auto-Recovery**: Can recover deleted channels and roles
- **Threshold-based Detection**: Smart algorithms to minimize false positives
- **Role Hierarchy Monitoring**: Checks bot's position in role hierarchy
- **Permission Analysis**: 70% rule enforcement for optimal protection
- **Detailed Logging**: Separate logs for actions and errors
- **Daily Log Organization**: Keeps logs organized by date
- **Graceful Shutdown Handling**: Proper client disconnection on termination
- **Silent Operation**: Works without sending messages in Discord channels
- **Whitelist System**: Protect trusted admins from false detections
- **Owner Notifications**: Get alerts about important security events

## 💻 System Requirements

- **Memory**: Minimum 512MB RAM
- **CPU**: 1 vCPU or better
- **Storage**: At least 100MB of free space
- **Node.js**: v20 or higher
- **Connection**: Stable internet connection
- **Hosting**: 24/7 uptime recommended for continuous protection

## 📋 Setup Instructions

### 1. Prerequisites
```bash
# Install Node.js if you don't have it already
# Clone or download this repository
git clone https://github.com/faiz4sure/discord-antinuke-selfbot.git
cd discord-antinuke-selfbot

# Install dependencies
npm install
```

### 2. Configuration
1. Edit the `config/config.yaml` file:
   - Add your Discord token (required)
   - Add your Owner IDs (your Discord user ID)
   - Set Protected server IDs (the servers you want to protect)
   - Add whitelist users (trusted admins who won't trigger protection)
   - Adjust action thresholds and timeframes if needed
   - Configure other security settings as needed

The config file structure looks like this:
```yaml
selfbot:
  token: "YOUR_DISCORD_TOKEN_HERE" # Your account token
  server1_id: "111222333444555666" # First server to protect
  server2_id: "222333444555666777" # Second server to protect
  owner1_id: "123456789012345678" # Your Discord user ID
  owner2_id: "234567890123456789" # Another owner ID (optional)
  
antinuke_settings:
  punishment: "ban" # Options: "ban", "kick", "none"
  # Various limits for different actions
  
whitelisted:
  users: ["123456789012345678", "234567890123456789"] # Trusted admin IDs
```

Alternatively, you can use environment variables:
- Create a `.env` file with `DISCORD_TOKEN=your_token_here`

### 3. Starting the Selfbot
```bash
# Start the selfbot
node index.js
```

## ⚙️ Configuration Options

The selfbot is fully configurable through `config/config.yaml`. Here are the key configuration options:

```yaml
selfbot:
  token: "YOUR_DISCORD_TOKEN_HERE" # Your account token (required)
  server1_id: "111222333444555666" # First server to protect
  server2_id: "222333444555666777" # Second server to protect (optional)
  owner1_id: "123456789012345678" # Your Discord user ID (for notifications)
  owner2_id: "234567890123456789" # Another owner ID (optional)
  
antinuke_settings:
  punishment: "ban" # What to do when attack detected: "ban", "kick", or "none"
  ban_limit: 5 # How many bans in time window before triggering protection
  kick_limit: 5 # How many kicks in time window before triggering protection
  channel_create_limit: 5 # Limit for channel creation
  role_create_limit: 5 # Limit for role creation
  channel_delete_limit: 5 # Limit for channel deletion
  role_delete_limit: 5 # Limit for role deletion
  channel_update_limit: 5 # Limit for channel updates
  role_update_limit: 5 # Limit for role updates
  member_update_limit: 5 # Limit for member permission changes
  unban_limit: 5 # Limit for unbans (mass unbanning)
  time_window: 36000000 # Time window in milliseconds (10 hours)

logs:
  channel_id: "1234567890123456789" # Optional log channel ID
  log_level: "info" # What to log: "all", "info", "warning", "error", "critical"
  timestamp: true # Show timestamps in logs
  log_webhook: "" # Discord webhook URL for logging (optional)
  log_owner_dm: false # Whether to DM owners with important alerts
  
whitelisted:
  users: ["1234567890123456789", "2345678901234567890"] # Users who won't trigger the system
  
rpc:
  enabled: true # Show activity status
  rotation: false # Whether to rotate status messages
```

## ⚠️ Precautions

1. **Account Security**: Keep your Discord token secure. Never share it with others.
2. **TOS Violation**: Remember that selfbots violate Discord's Terms of Service.
3. **Permissions**: The selfbot needs Administrator permission in protected servers.
4. **False Positives**: Configure thresholds carefully to avoid accidental triggers.
5. **Role Hierarchy**: Ensure the selfbot's role is high enough in the hierarchy.
6. **Backup**: Keep backups of your server settings in case of issues.
7. **Hosting**: Don't run on your main PC - use a dedicated hosting service.

## 🌐 Hosting Recommendations

While you can run this on your own device, we strongly recommend using a dedicated hosting service for:
- 24/7 uptime
- Better reliability
- Lower risk to your personal devices and network

**Recommended hosting options:**
- VPS providers (DigitalOcean, Linode, AWS, etc.)
- NodeJS hosting services
- Replit (with hacks to prevent sleep)

Join our [support server](https://discord.gg/PEphKsNpe8) for hosting recommendations and setup help.

## 📱 Mobile Setup

For instructions on setting up on Android using Termux, see [Android.md](Android.md)

## 🔧 Troubleshooting

- **Token Invalid**: Double-check your Discord token is correct and not expired.
- **Permission Issues**: Ensure the bot has Administrator permission in protected servers.
- **Role Hierarchy**: The bot's role needs to be high enough to take action. 
- **Memory Issues**: Ensure your hosting has at least 512MB RAM.
- **Startup Errors**: Check logs/errors.txt for detailed error information.
- **Other Errors**: For other errors, feel free to open up an issue from the [Issues](https://github.com/faiz4sure/discord-antinuke-selfbot/issues) tab.

## 🤡 Skidder Alert

If you find a repo that looks exactly like this one but with a broken setup and wrong instructions — congrats, you’ve found a **skidder** in the wild. Only trust the original. Stay safe, and don’t get scammed by script kiddies.

## 🤝 Support

For help with setup, hosting, or issues:
- Join our support server: [https://discord.gg/PEphKsNpe8](https://discord.gg/PEphKsNpe8)
- Read the documentation thoroughly before asking questions
- Go to [Website](https://faiz4sure-antinuke.netlify.app) for easier understanding.
- You can also explain your issue in the [Issues](https://github.com/faiz4sure/discord-antinuke-selfbot/issues) tab.

## 🎁 Contribute

- If you love the project, you can simply contribute in it by leaving a star.
- You can also work with us in this project at support server.

## 👨‍💻 Credits

- Made with ❤️ by [faiz4sure](https://github.com/faiz4sure)
- Support server: [https://discord.gg/PEphKsNpe8](https://discord.gg/PEphKsNpe8)
- Website: https://faiz4sure-antinuke.netlify.app
