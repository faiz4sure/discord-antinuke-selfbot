/**
 * Discord Antinuke Selfbot (WebSocket Optimized)
 * Using discord.js-selfbot-v13
 * 
 * DISCLAIMER: Using selfbots is against Discord's Terms of Service.
 * This code is provided for educational purposes only by faiz4sure.
 * Use at your own risk. I do not take responsibility for any consequences.
 */

const { Client, WebhookClient } = require('discord.js-selfbot-v13');
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const moment = require('moment');
const clear = require('clear');

// Load centralized configuration from config.yaml and .env
const config = require('./utils/ConfigLoader');

// Initialize whitelist manager
const WhitelistManager = require('./utils/WhitelistManager');
const whitelistManager = new WhitelistManager(config);

// Initialize rate limit handler
const rateLimitHandler = require('./utils/RateLimitHandler');

// Initialize client with optimized options for WebSocket
const client = new Client({
    checkUpdate: false,
    ws: {
        properties: {
            $browser: "Discord iOS" // Less likely to get detected as a bot
        }
    },
    autoRedeemNitro: false,
    patchVoice: false, // Disable unneeded voice functionality
    syncStatus: false, // Disable status syncing to save resources
    // RPC is controlled via config
    presence: {
        status: 'online',
        afk: false
    }
});

// ==================== RECENTACTIONS ====================
// Track recent actions to detect rapid malicious activities
const recentActions = {
    bans: {},
    kicks: {},
    unbans: {}, // Added for AntiMassUnban
    channelDeletions: {},
    channelCreations: {},
    roleDeletions: {},
    roleCreations: {},
    webhookCreations: {},
    memberRoleUpdates: {}
};

// ==================== SERVER TRACKING ====================
// Track servers the bot was removed from 
const removedServers = {
    // Format: { serverId: { name: "server name", timestamp: Date.now(), reason: "kicked/left" } }
};

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
}

// Create logs directory within data directory if it doesn't exist
const logsDir = path.join(dataDir, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Load removed servers from disk if the file exists
const removedServersPath = path.join(dataDir, 'removed_servers.json');
try {
    if (fs.existsSync(removedServersPath)) {
        const data = JSON.parse(fs.readFileSync(removedServersPath, 'utf8'));
        Object.assign(removedServers, data);
        console.log(chalk.yellow(`Loaded ${Object.keys(data).length} previously removed servers from disk`));
    }
} catch (error) {
    console.log(chalk.red(`Failed to load removed servers data: ${error.message}`));
}

// ==================== HELPER FUNCTIONS ====================
// Function to log actions specifically (bans, kicks, etc.) to actions.log
function logAction(action) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const actionsLogPath = path.join(dataDir, 'actions.log');
    const logEntry = `[${timestamp}] ${action}\n`;
    
    try {
        fs.appendFileSync(actionsLogPath, logEntry);
        // Only actions are shown in console as important notifications
        console.log(`[${timestamp}] ${chalk.greenBright('✅')} ${action}`);
    } catch (err) {
        // If we can't write to actions log, log to error file
        logError(`Failed to write to actions log: ${err.message}`);
    }
}

// Function to log errors to errors.txt without console output
function logError(error) {
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    const errorLogPath = path.join(logsDir, 'errors.txt');
    const logEntry = `[${timestamp}] ${error}\n`;
    
    try {
        fs.appendFileSync(errorLogPath, logEntry);
        // No console output for errors - they only go to file
    } catch (err) {
        // Last resort: if we can't even write to error log, only then show in console
        console.error(`[${timestamp}] CRITICAL: Failed to write to error log: ${err.message}`);
    }
}

// Log helper function - formats console output with timestamps and colors
function log(message, level = 'info', guildId = null) {
    if (!config.logging) return;
    
    // Log level filtering based on config
    const logLevelPriority = {
        'error': 1,
        'warning': 2,
        'success': 3,
        'info': 4,
        'debug': 5
    };
    
    // Only log messages that have priority <= configured log level
    // This allows finer control over log verbosity
    if (logLevelPriority[level] > logLevelPriority[config.logLevel]) {
        return; // Skip this log message as it's below the configured priority
    }
    
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    let prefix = '';
    let guildInfo = guildId ? ` [${client?.guilds.cache.get(guildId)?.name || guildId}]` : '';
    
    // Special handling for errors - redirect to errors.txt
    if (level === 'error') {
        // Log error to errors.txt but not to console
        logError(`${message}${guildInfo}`);
        
        // Still log to daily file (in logs directory)
        const today = moment().format('YYYY-MM-DD');
        const logFilePath = path.join(logsDir, `${today}.logs`);
        const logEntry = `[${timestamp}] [ERROR] ${message}${guildInfo}\n`;
        
        try {
            fs.appendFileSync(logFilePath, logEntry);
        } catch (err) {
            // If we can't write to daily log, at least it should be in errors.txt
        }
        
        return; // Skip normal console logging for errors
    }
    
    // For non-error levels, determine the console prefix
    switch(level) {
        case 'warning':
            prefix = chalk.yellow('⚠️');
            break;
        case 'success':
            prefix = chalk.green('✅');
            break;
        case 'debug':
            prefix = chalk.magenta('🔍');
            break;
        case 'info':
        default:
            prefix = chalk.blue('ℹ️');
            break;
    }
    
    // Console log (except for errors)
    console.log(`[${timestamp}] ${prefix} ${message}${guildInfo}`);
    
    // Log to daily file (in logs directory)
    const today = moment().format('YYYY-MM-DD');
    const logFilePath = path.join(logsDir, `${today}.logs`);
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}${guildInfo}\n`;
    
    try {
        fs.appendFileSync(logFilePath, logEntry);
    } catch (err) {
        logError(`Failed to write to daily log file: ${err.message}`);
    }
    
    // Only send actual protection alerts and actions to webhook/DM, not status messages
    const importantLevels = ['warning', 'error', 'success'];
    if (guildId && importantLevels.includes(level)) {
        // Only send actual alerts and actions (not basic info)
        sendLogToChannel(guildId, message, level).catch(() => {
            // Silently fail if we can't send log
        });
    }
}

// This function sends notifications through multiple channels:
// 1. Webhook with embeds if configured
// 2. DMs to server owners if enabled
// 3. Messages to a specific discord channel if configured
async function sendLogToChannel(guildId, message, level = 'info') {
    // Get server name and context
    const guild = client.guilds.cache.get(guildId);
    const serverName = guild ? guild.name : guildId;
    const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
    
    // Determine embed color based on level
    let color = 0x3498db; // Default blue for info
    if (level === 'error' || level === 'warning') {
        color = 0xe74c3c; // Red for errors/warnings
    } else if (level === 'success') {
        color = 0x2ecc71; // Green for success
    }
    
    // Create embed for rich formatting
    const embed = {
        color: color,
        title: `Anti-Nuke Alert - ${serverName}`,
        description: message,
        timestamp: new Date(),
        footer: {
            text: `Discord AntiNuke Selfbot`,
            icon_url: 'https://i.imgur.com/NN9S8J7.png'
        },
        fields: [
            {
                name: 'Server',
                value: serverName,
                inline: true
            },
            {
                name: 'Time',
                value: timestamp,
                inline: true
            }
        ]
    };
    
    // 1. Check if log_webhook is enabled in config
    const webhookUrl = config.logWebhook;
    if (webhookUrl && webhookUrl.length > 8) {
        try {
            // Embeds are allowed ONLY for webhooks, not for regular messages
            const webhook = new WebhookClient({ url: webhookUrl });
            await webhook.send({
                embeds: [embed],
                username: 'Discord Antinuke',
                avatarURL: 'https://i.imgur.com/NN9S8J7.png' // Shield icon
            });
            webhook.destroy(); // Cleanup webhook client
            log(`Successfully sent webhook notification`, 'info');
        } catch (error) {
            // Better error handling for webhook failures
            if (error.code === 10015) {
                log(`Webhook no longer exists: ${webhookUrl.substring(0, 20)}...`, 'error');
            } else if (error.code === 50027) {
                log(`Invalid webhook token: ${webhookUrl.substring(0, 20)}...`, 'error');
            } else if (error.code === 429) {
                log(`Rate limited when sending webhook - too many requests`, 'warning');
            } else {
                log(`Failed to send webhook: ${error.message}`, 'warning');
            }
        }
    }
    
    // 2. Check if DM to owners is enabled
    if (config.logOwnerDm) {
        // Format a plain text version of the message for DMs
        const plainTextMessage = [
            `**[${serverName}] Anti-Nuke Alert (${level.toUpperCase()})**`,
            `${message}`,
            `Time: ${timestamp}`
        ].join('\n');
        
        // Keep track of successful DMs to avoid excessive error logging
        let anyDmSuccessful = false;
        let dmErrorsCount = 0;
        
        for (const ownerId of config.ownerIds) {
            try {
                // Use a .catch() handler directly on fetch to avoid throwing errors
                const owner = await client.users.fetch(ownerId)
                    .catch(() => {
                        // Silently handle fetch errors
                        return null;
                    });
                
                // Skip if user can't be fetched
                if (!owner) continue;
                
                // Send a plain text DM (selfbots don't support embeds in DMs)
                await owner.send(plainTextMessage);
                anyDmSuccessful = true;
                
                // Only log successful DMs in debug mode to reduce console spam
                if (config.logLevel === 'debug') {
                    log(`Successfully sent alert to owner ${owner.tag}`, 'info');
                }
            } catch (error) {
                // Count DM errors but don't log each one to avoid spam
                dmErrorsCount++;
                
                // Only log the first error if it's a critical alert (error or warning)
                if (dmErrorsCount === 1 && ['error', 'warning'].includes(level)) {
                    // Use console.log directly instead of log() to avoid file logging
                    if (config.logLevel === 'debug') {
                        console.log(chalk.yellow(`Note: Cannot send DM to one or more owners - they likely have DMs closed`));
                    }
                }
            }
        }
    }
    
    // 3. Send to a specific channel if configured
    // With improved error handling to prevent errors when channel is not found
    const channelId = config.logChannels[guildId];
    if (channelId) {
        // Format a plain text version of the message for channels
        const plainTextMessage = [
            `**Anti-Nuke Alert (${level.toUpperCase()})**`,
            `${message}`,
            `Server: ${serverName}`,
            `Time: ${timestamp}`
        ].join('\n');
        
        try {
            // Wrapped in a silent try/catch to prevent any errors from propagating
            const channel = await client.channels.fetch(channelId)
                .catch(() => {
                    // Instead of logging an error, just return null and handle silently
                    return null;
                });
            
            if (channel && channel.isText()) {
                try {
                    // Use another try/catch around send to handle permission issues silently
                    await channel.send(plainTextMessage);
                    log(`Successfully logged alert to channel #${channel.name}`, 'info');
                } catch (sendError) {
                    // If we can't send to the channel, don't throw an error, just log silently
                    // and fall back to console-only logging
                    
                    // Only log detailed error information in debug mode to reduce console spam
                    if (config.logLevel === 'debug') {
                        if (sendError.code === 50013) {
                            console.log(chalk.yellow(`Cannot send to log channel: Missing permissions`));
                        } else {
                            console.log(chalk.yellow(`Cannot send to log channel: ${sendError.message}`));
                        }
                    }
                }
            }
        } catch (error) {
            // Final catch-all to ensure any unexpected errors don't crash the bot
            // Instead of logging errors about channels, we'll just silently continue
            // This improves stability when log channels aren't available
        }
    }
}

/**
 * Checks if a user is whitelisted
 * @param {string} userId - The Discord user ID to check
 * @param {string} guildId - The guild ID for logging context
 * @returns {boolean} Whether the user is whitelisted
 */
function isWhitelisted(userId, guildId = null) {
    // Validate input
    if (!userId || typeof userId !== 'string') {
        log(`Invalid user ID format checked against whitelist: ${userId}`, 'error', guildId);
        return false;
    }
    
    // Use the WhitelistManager to check if user is whitelisted
    const isInWhitelist = whitelistManager.isWhitelisted(userId);
    
    // If this is a server owner ID check, log this for debugging
    if (guildId && isInWhitelist) {
        log(`User ${userId} is whitelisted and bypassing security checks`, 'info', guildId);
    }
    
    return isInWhitelist;
}

function isServerOwner(userId, guildId) {
    const guild = client.guilds.cache.get(guildId);
    return guild && guild.ownerId === userId;
}

function isProtectedServer(serverId) {
    // ONLY protect servers explicitly listed in config.protectedServers
    // If the array is empty, don't protect any servers
    return config.protectedServers.includes(serverId);
}

function recordAction(actionType, userId, guildId) {
    const now = Date.now();
    
    // Initialize arrays if they don't exist
    if (!recentActions[actionType][guildId]) {
        recentActions[actionType][guildId] = [];
    }
    
    // Add action to the list
    recentActions[actionType][guildId].push({
        userId,
        timestamp: now
    });
    
    // Log the current time window being used (only once per session and only in debug level)
    if (!config.runtime.timeWindowLogged) {
        const timeWindowMinutes = Math.floor(config.thresholds.timeWindow / 60000);
        log(`Using time window of ${timeWindowMinutes} minutes for action tracking`, 'debug');
        config.runtime.timeWindowLogged = true;
    }
    
    // Filter out old actions beyond the time window
    recentActions[actionType][guildId] = recentActions[actionType][guildId].filter(
        action => (now - action.timestamp) < config.thresholds.timeWindow
    );
    
    // Count actions by this user in the time period
    const actionsByUser = recentActions[actionType][guildId].filter(
        action => action.userId === userId
    ).length;
    
    // Check if the threshold is exceeded
    const threshold = config.thresholds[actionType] || 3; // Default threshold of 3
    
    if (actionsByUser >= threshold) {
        log(`ALERT: ${actionType} threshold exceeded by user ${userId} (${actionsByUser}/${threshold})`, 'warning', guildId);
        return true; // Threshold exceeded
    }
    
    return false; // Threshold not exceeded
}

function formatUptime() {
    const uptime = Date.now() - config.runtime.startTime;
    const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
    const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((uptime % (1000 * 60)) / 1000);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0) parts.push(`${seconds}s`);
    
    return parts.join(' ');
}

async function takeAction(userId, guildId, reason) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) return;
        
        // Use RateLimitHandler to avoid Discord API rate limits when fetching members
        let member;
        try {
            member = await rateLimitHandler.execute(
                `guild.${guildId}.members.fetch`,
                async () => {
                    return await guild.members.fetch(userId);
                },
                [],
                { logFunction: (msg) => log(msg, 'debug') }
            );
        } catch (err) {
            log(`Could not fetch member ${userId} for punishment: ${err.message}`, 'error', guildId);
            return null;
        }
        
        if (!member) {
            log(`Could not fetch member ${userId} for punishment`, 'error', guildId);
            return;
        }
        
        // Make sure we're not trying to punish the server owner or ourselves
        if (member.id === guild.ownerId || member.id === client.user.id) {
            log(`Cannot punish server owner or self`, 'warning', guildId);
            return;
        }
        
        // Check if we have permission to do this action
        const me = guild.members.cache.get(client.user.id);
        if (!me.permissions.has("BAN_MEMBERS") && config.punishment === 'ban') {
            log(`No permission to ban members`, 'error', guildId);
            return;
        }
        
        if (!me.permissions.has("KICK_MEMBERS") && config.punishment === 'kick') {
            log(`No permission to kick members`, 'error', guildId);
            return;
        }
        
        // Ensure we can manage this member (role hierarchy check)
        if (member.roles.highest.position >= me.roles.highest.position) {
            log(`Cannot ${config.punishment} member with equal or higher role`, 'warning', guildId);
            return;
        }
        
        // Execute the punishment
        const fullReason = `[AntiNuke] ${reason}`;
        
        // Construct detailed message for logs and notifications
        const actionDetails = {
            user: `${member.user.tag} (${member.id})`,
            action: config.punishment.toUpperCase(),
            reason: reason,
            server: guild.name,
            timestamp: moment().format('YYYY-MM-DD HH:mm:ss')
        };
        
        // Execute the punishment
        if (config.punishment === 'ban') {
            try {
                // Use RateLimitHandler to handle potential rate limits during banning
                await rateLimitHandler.execute(
                    `guild.${guildId}.members.ban`,
                    async () => {
                        await member.ban({ reason: fullReason });
                    },
                    [],
                    { 
                        logFunction: (msg) => log(msg, 'warning', guildId),
                        retryLimit: 3
                    }
                );
                const successMsg = `Banned ${actionDetails.user}: ${actionDetails.reason}`;
                // Log to actions.log in data folder for easy review of actions taken
                logAction(`[${guild.name}] Banned ${actionDetails.user}: ${actionDetails.reason}`);
                log(successMsg, 'success', guildId);
            } catch (error) {
                log(`Failed to ban ${actionDetails.user}: ${error.message}`, 'error', guildId);
                return;
            }
            
            // Direct notification to all server owners (irrespective of config.logOwnerDm)
            // This ensures owners are always notified of bans
            const actionMessage = [
                `🛡️ **ANTI-NUKE ACTION TAKEN**`,
                `A user has been banned for suspicious activity`,
                ``,
                `**User:** ${actionDetails.user}`,
                `**Action:** BANNED`,
                `**Reason:** ${actionDetails.reason}`,
                `**Server:** ${actionDetails.server}`,
                `**Time:** ${actionDetails.timestamp}`
            ].join('\n');
            
            // Always DM owners about actions taken
            for (const ownerId of config.ownerIds) {
                try {
                    // Rate limit handler for fetching users
                    const owner = await rateLimitHandler.execute(
                        `users.fetch.${ownerId}`,
                        async () => await client.users.fetch(ownerId),
                        [],
                        { logFunction: (msg) => log(msg, 'debug') }
                    );
                    
                    // Rate limit handler for sending DMs
                    await rateLimitHandler.execute(
                        `users.${ownerId}.send`,
                        async () => await owner.send(actionMessage),
                        [],
                        { logFunction: (msg) => log(msg, 'debug') }
                    );
                    
                    log(`Successfully notified owner ${ownerId} about ban action`, 'info');
                } catch (error) {
                    // Better error handling for DM failures
                    if (error.code === 50007) {
                        log(`Cannot send ban notification to owner ${ownerId} - they have DMs closed`, 'warning', guildId);
                    } else {
                        log(`Failed to notify owner ${ownerId} about ban: ${error.message}`, 'warning', guildId);
                    }
                }
            }
            
        } else if (config.punishment === 'kick') {
            try {
                // Use RateLimitHandler to handle potential rate limits during kicking
                await rateLimitHandler.execute(
                    `guild.${guildId}.members.kick`,
                    async () => {
                        await member.kick(fullReason);
                    },
                    [],
                    { 
                        logFunction: (msg) => log(msg, 'warning', guildId),
                        retryLimit: 3
                    }
                );
                const successMsg = `Kicked ${actionDetails.user}: ${actionDetails.reason}`;
                // Log to actions.log in data folder for easy review of actions taken
                logAction(`[${guild.name}] Kicked ${actionDetails.user}: ${actionDetails.reason}`);
                log(successMsg, 'success', guildId);
            } catch (error) {
                log(`Failed to kick ${actionDetails.user}: ${error.message}`, 'error', guildId);
                return;
            }
            
            // Same owner notification for kicks
            const actionMessage = [
                `🛡️ **ANTI-NUKE ACTION TAKEN**`,
                `A user has been kicked for suspicious activity`,
                ``,
                `**User:** ${actionDetails.user}`,
                `**Action:** KICKED`,
                `**Reason:** ${actionDetails.reason}`,
                `**Server:** ${actionDetails.server}`,
                `**Time:** ${actionDetails.timestamp}`
            ].join('\n');
            
            // Always DM owners about actions taken
            for (const ownerId of config.ownerIds) {
                try {
                    // Rate limit handler for fetching users
                    const owner = await rateLimitHandler.execute(
                        `users.fetch.${ownerId}`,
                        async () => await client.users.fetch(ownerId),
                        [],
                        { logFunction: (msg) => log(msg, 'debug') }
                    );
                    
                    // Rate limit handler for sending DMs
                    await rateLimitHandler.execute(
                        `users.${ownerId}.send`,
                        async () => await owner.send(actionMessage),
                        [],
                        { logFunction: (msg) => log(msg, 'debug') }
                    );
                    
                    log(`Successfully notified owner ${ownerId} about kick action`, 'info');
                } catch (error) {
                    // Better error handling for DM failures
                    if (error.code === 50007) {
                        log(`Cannot send kick notification to owner ${ownerId} - they have DMs closed`, 'warning', guildId);
                    } else {
                        log(`Failed to notify owner ${ownerId} about kick: ${error.message}`, 'warning', guildId);
                    }
                }
            }
            
        } else {
            // Just log if punishment is set to 'none'
            log(`Detected malicious activity by ${actionDetails.user}: ${actionDetails.reason}`, 'warning', guildId);
        }
    } catch (error) {
        log(`Error taking action against user ${userId}: ${error.message}`, 'error', guildId);
    }
}

function cacheGuild(guild) {
    try {
        // Cache all channels and roles for faster access
        const channelCount = guild.channels.cache.size;
        const roleCount = guild.roles.cache.size;
        
        // Ensure we have all members cached
        // guild.members.fetch().catch(() => {}); // Full fetch is often rate-limited
        
        log(`Cached ${guild.name} data: ${channelCount} channels, ${roleCount} roles`, 'info', guild.id);
    } catch (error) {
        log(`Error caching guild data for ${guild.name}: ${error.message}`, 'error', guild.id);
    }
}

async function recoverChannel(channelId, guildId, deletedChannel) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log(`Cannot recover channel: Guild ${guildId} not found`, 'error', guildId);
            return;
        }
        
        // Check if recovery is enabled in config
        if (!config.antinuke_settings || !config.antinuke_settings.auto_recovery || !config.antinuke_settings.recover_channels) {
            log(`Channel recovery skipped: Recovery disabled in config`, 'info', guildId);
            return;
        }
        
        // First, try to get channel data from our cache (for future implementation)
        // For now, we just use the basic info we have from the deletedChannel object
        if (!deletedChannel) {
            log(`Limited channel recovery: No channel data available for ${channelId}`, 'warning', guildId);
            
            // Attempt basic recovery with minimal info
            const newChannel = await guild.channels.create(`recovered-${channelId}`, {
                type: 'GUILD_TEXT',
                topic: `Recovered channel (ID: ${channelId})`
            }).catch(e => {
                log(`Error creating recovered channel: ${e.message}`, 'error', guildId);
                return null;
            });
            
            if (newChannel) {
                logAction(`[${guild.name}] Successfully recovered deleted channel with basic settings (ID: ${channelId})`);
                log(`Created basic recovery channel ${newChannel.name} for deleted ${channelId}`, 'success', guildId);
                
                // Send a message in the new channel
                await newChannel.send({
                    content: `This channel was recovered after it was deleted by a non-whitelisted user. Original ID: ${channelId}`
                }).catch(() => {});
                
                return newChannel;
            }
        } else {
            // We have the deleted channel data, so we can create a more accurate replica
            log(`Detailed channel recovery for ${deletedChannel.name} (${channelId})`, 'info', guildId);
            
            // Use rate limit handler for channel creation to prevent Discord API limits
            // With improved error handling to prevent crashes
            try {
                await rateLimitHandler.execute('channelCreation', async () => {
                    // Add a small delay to prevent immediate throttling
                    await new Promise(resolve => setTimeout(resolve, config.antinuke_settings?.recovery_delay || 500));
                    return true;
                }, [], { 
                    // Only log rate limit messages in debug mode to avoid console spam
                    logFunction: (msg) => {
                        if (config.logLevel === 'debug') {
                            log(msg, 'info', guildId);
                        }
                    }
                });
            } catch (error) {
                // Silently handle rate limit errors without stopping execution
                // Just a small delay if something goes wrong
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Create a new channel with the same properties
            const channelOptions = {
                type: deletedChannel.type,
                topic: deletedChannel.topic,
                nsfw: deletedChannel.nsfw,
                bitrate: deletedChannel.bitrate,
                userLimit: deletedChannel.userLimit,
                parent: deletedChannel.parent,
                // Copy permission overwrites accurately
                permissionOverwrites: Array.isArray(deletedChannel.permissionOverwrites) 
                    ? deletedChannel.permissionOverwrites 
                    : (deletedChannel.permissionOverwrites?.cache?.map(overwrite => ({
                        id: overwrite.id,
                        type: overwrite.type,
                        allow: overwrite.allow,
                        deny: overwrite.deny
                    })) || [])
            };
            
            // Clean up undefined values
            Object.keys(channelOptions).forEach(key => {
                if (channelOptions[key] === undefined) delete channelOptions[key];
            });
            
            // Create the channel
            const newChannel = await guild.channels.create(deletedChannel.name, channelOptions)
                .catch(e => {
                    log(`Error recreating channel ${deletedChannel.name}: ${e.message}`, 'error', guildId);
                    return null;
                });
            
            if (newChannel) {
                logAction(`[${guild.name}] Successfully recovered deleted channel ${deletedChannel.name} (ID: ${channelId})`);
                log(`Recovered channel ${newChannel.name} with detailed settings`, 'success', guildId);
                
                // Send a message in the new channel if it's a text channel
                if (newChannel.type === 'GUILD_TEXT' || newChannel.type === 'GUILD_NEWS') {
                    await newChannel.send({
                        content: `This channel was recovered after it was deleted by a non-whitelisted user.\nOriginal ID: ${channelId}`
                    }).catch(() => {});
                }
                
                return newChannel;
            }
        }
        
        return null;
    } catch (error) {
        log(`Error during channel recovery: ${error.message}`, 'error', guildId);
        return null;
    }
}

async function recoverRole(roleId, guildId, deletedRole) {
    try {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) {
            log(`Cannot recover role: Guild ${guildId} not found`, 'error', guildId);
            return;
        }
        
        // Check if recovery is enabled in config
        if (!config.antinuke_settings || !config.antinuke_settings.auto_recovery || !config.antinuke_settings.recover_roles) {
            log(`Role recovery skipped: Recovery disabled in config`, 'info', guildId);
            return;
        }
        
        // First, try to get role data from our cache (for future implementation)
        // For now, we just use the basic info we have from the deletedRole object
        if (!deletedRole) {
            log(`Limited role recovery: No role data available for ${roleId}`, 'warning', guildId);
            
            // Attempt basic recovery with minimal info
            const newRole = await guild.roles.create({
                name: `recovered-${roleId}`,
                color: 'GREY',
                reason: `Auto-recovery of deleted role ${roleId}`
            }).catch(e => {
                log(`Error creating recovered role: ${e.message}`, 'error', guildId);
                return null;
            });
            
            if (newRole) {
                logAction(`[${guild.name}] Successfully recovered deleted role with basic settings (ID: ${roleId})`);
                log(`Created basic recovery role ${newRole.name} for deleted ${roleId}`, 'success', guildId);
                return newRole;
            }
        } else {
            // We have the deleted role data, so we can create a more accurate replica
            log(`Detailed role recovery for ${deletedRole.name} (${roleId})`, 'info', guildId);
            
            // Use rate limit handler for role creation to prevent Discord API limits
            // With improved error handling to prevent crashes
            try {
                await rateLimitHandler.execute('roleCreation', async () => {
                    // Add a small delay to prevent immediate throttling
                    await new Promise(resolve => setTimeout(resolve, config.antinuke_settings?.recovery_delay || 500));
                    return true;
                }, [], { 
                    // Only log rate limit messages in debug mode to avoid console spam
                    logFunction: (msg) => {
                        if (config.logLevel === 'debug') {
                            log(msg, 'info', guildId);
                        }
                    }
                });
            } catch (error) {
                // Silently handle rate limit errors without stopping execution
                // Just a small delay if something goes wrong
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
            
            // Create a new role with the same properties
            const roleOptions = {
                name: deletedRole.name,
                color: deletedRole.hexColor || 'GREY',
                hoist: deletedRole.hoist,
                mentionable: deletedRole.mentionable,
                permissions: deletedRole.permissions,
                position: deletedRole.position,
                reason: `Auto-recovery of deleted role ${roleId}`
            };
            
            // Clean up undefined values
            Object.keys(roleOptions).forEach(key => {
                if (roleOptions[key] === undefined) delete roleOptions[key];
            });
            
            // Create the role
            const newRole = await guild.roles.create(roleOptions)
                .catch(e => {
                    log(`Error recreating role ${deletedRole.name}: ${e.message}`, 'error', guildId);
                    return null;
                });
            
            if (newRole) {
                logAction(`[${guild.name}] Successfully recovered deleted role ${deletedRole.name} (ID: ${roleId})`);
                log(`Recovered role ${newRole.name} with detailed settings`, 'success', guildId);
                return newRole;
            }
        }
        
        return null;
    } catch (error) {
        log(`Error during role recovery: ${error.message}`, 'error', guildId);
        return null;
    }
}

function displayStartupBanner() {
    console.log('\n' + chalk.cyanBright('═════════════════════════════════════════════════════════════'));
    console.log(chalk.whiteBright('                Discord Antinuke Selfbot'));
    console.log(chalk.gray('               (WebSocket Optimized)'));
    console.log(chalk.cyanBright('═════════════════════════════════════════════════════════════'));
    console.log(chalk.yellowBright('  🛡️  Protecting servers against nukes and raids'));
    console.log(chalk.yellowBright('  ⚡  Optimized for speed and reliability'));
    console.log(chalk.yellowBright('  🔧  Built with discord.js-selfbot-v13'));
    console.log(chalk.cyanBright('═════════════════════════════════════════════════════════════'));
    console.log(chalk.gray('  • Using WebSocket connection'));
    console.log(chalk.gray('  • Auto-recovery of deleted channels and roles'));
    console.log(chalk.gray('  • Threshold-based detection to minimize false positives'));
    console.log(chalk.cyanBright('═════════════════════════════════════════════════════════════'));
    console.log(chalk.magentaBright('  • For help regarding any issue or setup:'));
    console.log(chalk.blueBright('    https://discord.gg/PEphKsNpe8'));
    console.log(chalk.cyanBright('═════════════════════════════════════════════════════════════'));
    console.log(chalk.redBright('  Made with ❤️ by faiz4sure'));
    console.log(chalk.cyanBright('═════════════════════════════════════════════════════════════\n'));
}

// Export the displayStartupBanner function so it can be used by other modules
module.exports.displayStartupBanner = displayStartupBanner;

// ==================== EVENT HANDLERS ====================
// Load event handlers (silently without logging each one)
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
const eventCount = eventFiles.length;

// Load events silently
for (const file of eventFiles) {
    const event = require(`./events/${file}`);
    
    client.on(event.name, (...args) => {
        // Pass client and helper functions to each event handler
        event.execute(client, ...args, {
            config,
            log,
            isWhitelisted,
            isServerOwner,
            isProtectedServer,
            recordAction,
            takeAction,
            recoverChannel,
            recoverRole,
            cacheGuild,
            recentActions,
            whitelistManager,
            removedServers,
            saveRemovedServers
        });
    });
}

// Load other handlers (anti-crash, permissions, etc.) silently
const handlersDir = './handlers';
const initializedHandlers = [];
if (fs.existsSync(handlersDir)) {
    const handlerFiles = fs.readdirSync(handlersDir).filter(file => file.endsWith('.js'));
    const handlerCount = handlerFiles.length;
    
    for (const file of handlerFiles) {
        const handler = require(`${handlersDir}/${file}`);
        if (typeof handler.init === 'function') {
            handler.init(client, {
                config,
                log,
                isWhitelisted,
                isServerOwner,
                isProtectedServer,
                recordAction,
                takeAction,
                recoverChannel,
                recoverRole,
                cacheGuild,
                sendLogToChannel,
                recentActions,
                whitelistManager
            });
            // Remember handler name without logging
            initializedHandlers.push(file.replace('.js', ''));
        }
    }
}

// No command handling as per requirements
// All configuration is done through config.yaml

// ==================== LOGIN ====================
// Create a visually appealing startup banner (initial, will be cleared after load)
console.log(chalk.blue('\nInitializing Discord Antinuke Selfbot...'));
console.log(chalk.gray('Loading modules and event handlers...'));

// Silent initialization - we'll show the full banner after login

// Check if token is provided
if (!config.token || config.token === 'YOUR_TOKEN_HERE' || config.token === '') {
    console.log(chalk.redBright('❌ No Discord token provided!'));
    console.log(chalk.yellowBright('Please set your token in a .env file or directly in the config.'));
    console.log(chalk.gray('Example .env file: DISCORD_TOKEN=your_token_here'));
    process.exit(1);
}

// Check if at least one owner ID is provided (silently)
const hasNoOwners = config.ownerIds.length === 0;

// Login with progress indicator
console.log(chalk.cyanBright('\n🔄 Connecting to Discord API...'));

// Display event and handler stats
console.log(chalk.gray(`• Loaded ${eventCount} event handlers`));
console.log(chalk.gray(`• Initialized ${initializedHandlers.length} system handlers`));

console.log(chalk.gray(`\nPlease wait while establishing connection...\n`));

client.login(config.token).then(() => {
    // On successful login, the ready event will clear screen and display the full banner
}).catch(error => {
    console.log(chalk.redBright('❌ Failed to login:'), chalk.whiteBright(error.message));
    if (error.message.includes('token')) {
        console.log(chalk.yellowBright('💡 Tip: Check if your Discord token is correct and not expired.'));
    } else if (error.message.includes('network')) {
        console.log(chalk.yellowBright('💡 Tip: Check your internet connection.'));
    }
    process.exit(1);
});

// ==================== REMOVED SERVER TRACKING ====================

/**
 * Saves the removed servers tracking data to disk
 * @param {Object} helpers - Helper functions and utilities
 */
function saveRemovedServers(helpers) {
    const { log } = helpers;
    
    try {
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }
        
        fs.writeFileSync(
            removedServersPath,
            JSON.stringify(removedServers, null, 2),
            'utf8'
        );
        
        log(`Saved removed servers tracking data (${Object.keys(removedServers).length} servers)`, 'debug');
    } catch (error) {
        log(`Failed to save removed servers data: ${error.message}`, 'error');
    }
}

// ==================== GRACEFUL SHUTDOWN HANDLER ====================

/**
 * Handles graceful shutdown when the process receives termination signals
 * @param {string} signal - The signal that triggered the shutdown
 */
async function handleGracefulShutdown(signal) {
    try {
        console.log('\n');
        log(`Received ${signal} signal, initiating graceful shutdown...`, 'warn');
        
        // Log the shutdown in actions.log
        logAction(`Shutting down due to ${signal} signal`);
        
        // Save removed servers data before shutdown
        saveRemovedServers({ log });
        log(`Saved removed servers tracking data (${Object.keys(removedServers).length} servers)`, 'info');
        
        // Set a status message
        if (client && client.user) {
            try {
                // Update status before shutting down
                await client.user.setActivity('Shutting down...', { type: 'PLAYING' });
                log(`Updated status to 'Shutting down'`, 'info');
            } catch (err) {
                log(`Could not update status: ${err.message}`, 'error');
            }
        }

        // Display shutdown banner
        console.log(chalk.redBright('═════════════════════════════════════════════════════════════'));
        console.log(chalk.whiteBright('       Discord Antinuke Selfbot - Shutting Down'));
        console.log(chalk.redBright('═════════════════════════════════════════════════════════════'));
        console.log(chalk.gray(`  • Shutdown triggered by: ${signal}`));
        console.log(chalk.gray(`  • Uptime: ${formatUptime()}`));
        console.log(chalk.gray(`  • Timestamp: ${new Date().toISOString()}`));
        console.log(chalk.redBright('═════════════════════════════════════════════════════════════\n'));
        
        // Notify owners about shutdown if possible
        if (client && client.user && config.notifyOnShutdown) {
            const ownersNotified = [];
            const failedNotifications = [];
            const botUserId = client.user.id;
            
            // Filter out the bot's own ID from the owner list to avoid self-notification
            const ownerIds = config.ownerIds.filter(id => id !== botUserId);
            
            if (ownerIds.length === 0) {
                log('No owners to notify about shutdown (excluding self)', 'info');
            } else {
                log(`Attempting to notify ${ownerIds.length} owners about shutdown...`, 'info');
                
                // Create promises for all DM attempts
                const notificationPromises = ownerIds.map(async (ownerId) => {
                    try {
                        const owner = await client.users.fetch(ownerId);
                        if (!owner) return;
                        
                        // Use Promise with timeout to avoid hanging on closed DMs
                        // Skip notifying the bot itself (additional safety check)
                        if (owner.id === botUserId) {
                            log('Skipping self-notification', 'debug');
                            return;
                        }
                        
                        const dmResult = await Promise.race([
                            owner.send({
                                content: `🔴 **Antinuke Protection Deactivated**\n` +
                                        `The protection system is shutting down due to ${signal} signal.\n` +
                                        `Timestamp: ${new Date().toISOString()}\n` +
                                        `Uptime: ${formatUptime()}`
                            }).then(() => ({ success: true, user: owner.tag }))
                              .catch(() => ({ success: false, user: owner.tag, reason: 'DM closed' })),
                            new Promise(resolve => setTimeout(() => 
                                resolve({ success: false, user: owner.tag, reason: 'timeout' }), 500))
                        ]);
                        
                        if (dmResult.success) {
                            ownersNotified.push(dmResult.user);
                        } else {
                            failedNotifications.push(dmResult.user);
                        }
                    } catch (err) {
                        // Log error but don't throw exception that would stop other notifications
                        log(`Failed to notify owner ${ownerId}: ${err.message}`, 'error');
                    }
                });
                
                // Wait for all notification attempts to complete with a timeout
                await Promise.all(notificationPromises);
            }
            
            // Log results of notification attempts
            if (ownersNotified.length > 0) {
                log(`Successfully notified owners: ${ownersNotified.join(', ')}`, 'info');
            } else if (ownerIds.length > 0) {
                log('Could not successfully notify any owners', 'warn');
            }
            
            if (failedNotifications.length > 0) {
                log(`Could not notify owners (likely closed DMs): ${failedNotifications.join(', ')}`, 'warn');
            }
        }
        
        // Give time for messages to send
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Destroy the client connection properly
        if (client) {
            log('Destroying Discord client connection...', 'info');
            await client.destroy();
            log('Discord client destroyed successfully', 'info');
        }
        
        log('Graceful shutdown completed', 'info');
        
        // Exit with success code
        process.exit(0);
    } catch (error) {
        console.error(chalk.redBright('Error during shutdown:'), error);
        process.exit(1);
    }
}

// Register shutdown handlers for various signals
process.on('SIGINT', () => handleGracefulShutdown('SIGINT')); // Ctrl+C
process.on('SIGTERM', () => handleGracefulShutdown('SIGTERM')); // kill command
process.on('SIGHUP', () => handleGracefulShutdown('SIGHUP')); // Terminal closed

// Handle uncaught exceptions and unhandled rejections as a last resort if AntiCrash fails
process.on('uncaughtException', (error) => {
    log(`CRITICAL ERROR (Uncaught Exception): ${error.message}`, 'error');
    console.error(chalk.redBright('Stack trace:'), error.stack);
    handleGracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    log(`CRITICAL ERROR (Unhandled Rejection): ${reason}`, 'error');
    console.error(chalk.redBright('Promise:'), promise);
    handleGracefulShutdown('unhandledRejection');
});

/* ==================== OFFICIALS ====================

Support server: https://discord.gg/PEphKsNpe8
GitHub: https://github.com/faiz4sure/discord-antinuke-selfbot
Officially Owned by: faiz4sure
Website: https://faiz4sure-antinuke.netlify.app
========================================================
  This code is licensed under the MIT License.
========================================================
*/
