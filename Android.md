# Running Discord Antinuke Selfbot on Android (Termux)

This guide will help you set up and run the Discord Antinuke Selfbot on your Android device using Termux. Please note that **mobile hosting is not recommended for 24/7 production use** due to battery optimization, network limitations, and system instability.

## ⚠️ Important Notes

1. **Battery & Performance Issues**: Running a selfbot on your phone will:
   - Drain your battery faster
   - May cause your phone to heat up
   - Can be killed by Android's battery optimization
   - Requires keeping your phone on and connected to the internet at all times

2. **Recommended Alternative**: Consider using a proper VPS or hosting service instead of your phone.

3. **Support**: For hosting recommendations and help, join our [support server](https://discord.gg/PEphKsNpe8).

## 📱 Termux Setup Guide

### 1. Install Termux

1. Download Termux from [F-Droid](https://f-droid.org/en/packages/com.termux/) (recommended)
   - Note: The Google Play version is outdated and may not work properly.

2. Open Termux and update its packages:
   ```bash
   pkg update && pkg upgrade -y
   ```

### 2. Install Required Packages

Install Node.js, Git, and other required packages:

```bash
pkg install nodejs git nano -y
```

### 3. Clone the Repository

```bash
# Create a directory for the bot
mkdir -p ~/antinuke
cd ~/antinuke

# Clone the repository (or download and extract it)
git clone https://github.com/faiz4sure/discord-antinuke-selfbot.git
cd discord-antinuke-selfbot
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Configure the Selfbot

1. Edit the config file using a text editor:
   ```bash
   nano config/config.yaml
   ```

2. Update the configuration with your information:
   ```yaml
   selfbot:
     token: "YOUR_DISCORD_TOKEN_HERE" # Your account token
     server1_id: "111222333444555666" # First server to protect
     server2_id: "222333444555666777" # Second server to protect (optional)
     owner1_id: "123456789012345678" # Your Discord user ID
     owner2_id: "234567890123456789" # Another owner (optional)
     
   whitelisted:
     users: ["123456789012345678", "234567890123456789"] # Trusted admin IDs
   ```

4. Save and exit:
   - Press Ctrl+O to save
   - Press Enter to confirm
   - Press Ctrl+X to exit

### 6. Running the Selfbot

```bash
node index.js
```

### 7. Keeping the Selfbot Running in Background

To keep the selfbot running even when Termux is closed:

1. Install required package:
   ```bash
   pkg install tmux -y
   ```

2. Create a new tmux session:
   ```bash
   tmux new -s antinuke
   ```

3. Start the selfbot:
   ```bash
   node index.js
   ```

4. Detach from the tmux session (keep it running in background):
   - Press Ctrl+B, then D

5. To reattach to the session later:
   ```bash
   tmux attach -t antinuke
   ```

## 🔋 Preventing Android from Killing the App

1. Disable battery optimization for Termux:
   - Go to Settings > Apps > Termux
   - Battery > Battery Optimization > Disable

2. Some additional steps (varies by phone model):
   - Lock Termux in recent apps
   - Add Termux to protected apps list in battery settings
   - Disable "Optimize battery usage" for Termux

## 📊 Managing Resources

Android phones have limited resources. To check resource usage:

1. Check memory usage:
   ```bash
   free -m
   ```

2. Check CPU usage:
   ```bash
   top
   ```

3. If the selfbot is using too many resources:
   - Reduce the number of servers you're protecting
   - Increase threshold values to reduce processing
   - Consider moving to a proper hosting solution

## ⚠️ Disclaimer for Mobile Hosting

Mobile hosting is generally not recommended for several reasons:

1. **Unreliable Connection**: Mobile networks can be unstable
2. **Battery Constraints**: Phones optimize battery by killing background processes
3. **Hardware Limitations**: Phones are not designed for 24/7 server operations
4. **Temperature Issues**: Continuous operation can cause overheating
5. **Security Concerns**: Running sensitive applications on personal devices

## 🚀 Moving to Proper Hosting

For the best experience, we strongly recommend moving to a proper hosting service:

1. **VPS Options**:
   - DigitalOcean ($5/month droplet is sufficient)
   - Linode
   - AWS Lightsail
   - OVH
   - Oracle Cloud (has free tier)

2. **Affordable Hosting**:
   - Hostinger
   - Panel based hostings
   - For free one's, discuss at [support server](https://discord.gg/PEphKsNpe8)

For help with selecting and setting up hosting, please join our [support server](https://discord.gg/PEphKsNpe8).
