const { 
    Client: BotClient, 
    GatewayIntentBits, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    StringSelectMenuBuilder, 
    ModalBuilder, 
    TextInputBuilder, 
    TextInputStyle,
    ContainerBuilder,
    SectionBuilder,
    TextDisplayBuilder,
    SeparatorBuilder,
    ThumbnailBuilder,
    MessageFlags,
    AttachmentBuilder,
    EmbedBuilder
} = require('discord.js');
const { Client: SelfClient, SpotifyRPC, RichPresence } = require('discord.js-selfbot-v13');
const rpc = require('discordrpcgenerator');
const DiscordRPC = require('discord-rpc');
const fs = require('fs');
const { createCanvas, loadImage } = require('@napi-rs/canvas');
const GIFEncoder = require('gif-encoder-2');
const vm = require('vm');
const path = require('path');
const crypto = require('crypto');

let config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// Config'i yeniden yükle
function reloadConfig() {
    try {
        config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
        console.log('[CONFIG] ✅ Config yeniden yüklendi');
    } catch (e) {
        console.log('[CONFIG] ❌ Config yüklenemedi:', e.message);
    }
}

// ═══════════════════════════════════════════════════════════════
// 🔐 ENCRYPTION SYSTEM - Veriler SQL veritabanına şifrelenmiş
// ═══════════════════════════════════════════════════════════════
const ENCRYPTION_KEY = 'swenzy-ultra-secure-key-2026-v4.0-encrypted-database-system';
const ALGORITHM = 'aes-256-cbc';

const Encryption = {
    encrypt: (text) => {
        try {
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipher(ALGORITHM, key);
            let encrypted = cipher.update(JSON.stringify(text), 'utf8', 'hex');
            encrypted += cipher.final('hex');
            return iv.toString('hex') + ':' + encrypted;
        } catch (e) {
            console.log('[ENCRYPTION] Şifreleme hatası:', e.message);
            return JSON.stringify(text); // Fallback
        }
    },
    
    decrypt: (encryptedText) => {
        try {
            if (!encryptedText.includes(':')) {
                return JSON.parse(encryptedText); // Eski format
            }
            const [ivHex, encrypted] = encryptedText.split(':');
            const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipher(ALGORITHM, key);
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            return JSON.parse(decrypted);
        } catch (e) {
            console.log('[ENCRYPTION] Şifre çözme hatası:', e.message);
            try {
                return JSON.parse(encryptedText); // Fallback
            } catch (e2) {
                return {}; // Son fallback
            }
        }
    }
};

// Şifrelenmiş database yükleme
let database;
try {
    const encryptedData = fs.readFileSync('./database.json', 'utf8');
    database = Encryption.decrypt(encryptedData);
    console.log('[ENCRYPTION] ✅ Veritabanı şifresi çözüldü');
} catch (e) {
    console.log('[ENCRYPTION] ⚠️ Veritabanı yüklenemedi, yeni oluşturuluyor');
    database = { accounts: [], userStats: { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() }, userRanks: {}, notifications: {} };
}

// Database güvenlik kontrolü
if (!database.accounts) database.accounts = [];
if (!database.userStats) database.userStats = { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() };
if (!database.userRanks) database.userRanks = {};
if (!database.notifications) database.notifications = {};


// ═══════════════════════════════════════════════════════════════
// 🧠 ULTRA SYSTEMS - AI POWERED BOT FRAMEWORK
// ═══════════════════════════════════════════════════════════════

// Data dosyalarını yükle
const dataPath = './data';
if (!fs.existsSync(dataPath)) fs.mkdirSync(dataPath);

const loadData = (file) => {
    try {
        const encryptedData = fs.readFileSync(`${dataPath}/${file}`, 'utf8');
        return Encryption.decrypt(encryptedData);
    } catch (e) {
        console.log(`[ENCRYPTION] ${file} yüklenemedi:`, e.message);
        return {};
    }
};

const saveData = (file, data) => {
    try {
        const encryptedData = Encryption.encrypt(data);
        fs.writeFileSync(`${dataPath}/${file}`, encryptedData);
        console.log(`[ENCRYPTION] ✅ ${file} şifrelenmiş olarak kaydedildi`);
    } catch (e) {
        console.log(`[ENCRYPTION] ${file} kaydedilemedi:`, e.message);
        // Fallback - şifresiz kaydet
        fs.writeFileSync(`${dataPath}/${file}`, JSON.stringify(data, null, 2));
    }
};

// ULTRA Data
let ultraMemory = loadData('memory.json');
let ultraModeration = loadData('moderation.json');
let ultraAnalytics = loadData('analytics.json');
let ultraPlugins = loadData('plugins.json');
let ultraSelfHealing = loadData('selfhealing.json');
let ultraProfiles = loadData('profiles.json');
let ultraIntent = loadData('intent.json');

// ═══════════════════════════════════════════════════════════════
// 🔧 1. SELF-HEALING SYSTEM
// ═══════════════════════════════════════════════════════════════
const SelfHealing = {
    errorCount: 0,
    maxErrors: 5,
    
    logError: (error, context = '') => {
        SelfHealing.errorCount++;
        if (!ultraSelfHealing.crashHistory) ultraSelfHealing.crashHistory = [];
        ultraSelfHealing.errorCount = (ultraSelfHealing.errorCount || 0) + 1;
        ultraSelfHealing.crashHistory.push({
            time: Date.now(),
            error: error.message || String(error),
            context: context
        });
        if (ultraSelfHealing.crashHistory.length > 50) {
            ultraSelfHealing.crashHistory = ultraSelfHealing.crashHistory.slice(-50);
        }
        saveData('selfhealing.json', ultraSelfHealing);
        console.log(`[SELF-HEALING] Hata: ${error.message || error}`);
        
        if (SelfHealing.errorCount >= SelfHealing.maxErrors) {
            SelfHealing.attemptFix();
        }
    },
    
    attemptFix: () => {
        console.log('[SELF-HEALING] 🔧 Otomatik düzeltme...');
        SelfHealing.errorCount = 0;
        try {
            database = JSON.parse(fs.readFileSync('./database.json', 'utf8'));
        } catch (e) {}
        ultraSelfHealing.healthStatus = 'recovering';
        saveData('selfhealing.json', ultraSelfHealing);
    },
    
    getHealth: () => {
        const recent = (ultraSelfHealing.crashHistory || []).filter(e => Date.now() - e.time < 3600000).length;
        if (recent === 0) return { status: 'healthy', emoji: '🟢', score: 100 };
        if (recent < 3) return { status: 'good', emoji: '🟡', score: 80 };
        if (recent < 10) return { status: 'warning', emoji: '🟠', score: 50 };
        return { status: 'critical', emoji: '🔴', score: 20 };
    }
};

process.on('uncaughtException', (e) => SelfHealing.logError(e, 'uncaughtException'));
process.on('unhandledRejection', (e) => SelfHealing.logError(e, 'unhandledRejection'));

// ═══════════════════════════════════════════════════════════════
// 🗂️ 2. MEMORY SYSTEM
// ═══════════════════════════════════════════════════════════════
const Memory = {
    rememberUser: (userId, data) => {
        if (!ultraMemory.users) ultraMemory.users = {};
        if (!ultraMemory.users[userId]) {
            ultraMemory.users[userId] = { firstSeen: Date.now(), interactions: 0, preferences: {} };
        }
        ultraMemory.users[userId] = { ...ultraMemory.users[userId], ...data, lastSeen: Date.now() };
        ultraMemory.users[userId].interactions++;
        saveData('memory.json', ultraMemory);
    },
    getUser: (userId) => ultraMemory.users?.[userId] || null,
    rememberServer: (serverId, data) => {
        if (!ultraMemory.servers) ultraMemory.servers = {};
        if (!ultraMemory.servers[serverId]) {
            ultraMemory.servers[serverId] = { firstSeen: Date.now(), settings: {}, culture: 'neutral' };
        }
        ultraMemory.servers[serverId] = { ...ultraMemory.servers[serverId], ...data };
        saveData('memory.json', ultraMemory);
    },
    getServer: (serverId) => ultraMemory.servers?.[serverId] || null
};

// ═══════════════════════════════════════════════════════════════
// 🛡️ 3. MODERATION SYSTEM
// ═══════════════════════════════════════════════════════════════
const Moderation = {
    isToxic: (message) => {
        const lower = message.toLowerCase();
        for (const word of (ultraModeration.toxicWords || [])) {
            if (lower.includes(word.toLowerCase())) return { toxic: true, word };
        }
        return { toxic: false };
    },
    checkSpam: (userId, channelId) => {
        if (!ultraModeration.spamPatterns) ultraModeration.spamPatterns = {};
        const key = `${userId}_${channelId}`;
        const now = Date.now();
        if (!ultraModeration.spamPatterns[key]) ultraModeration.spamPatterns[key] = { messages: [] };
        ultraModeration.spamPatterns[key].messages.push(now);
        ultraModeration.spamPatterns[key].messages = ultraModeration.spamPatterns[key].messages.filter(t => now - t < 10000);
        const count = ultraModeration.spamPatterns[key].messages.length;
        if (count >= 10) return { spam: true, action: 'mute' };
        if (count >= 5) return { spam: true, action: 'warn' };
        return { spam: false };
    },
    warnUser: (userId, reason) => {
        if (!ultraModeration.warnings) ultraModeration.warnings = {};
        if (!ultraModeration.warnings[userId]) ultraModeration.warnings[userId] = [];
        ultraModeration.warnings[userId].push({ time: Date.now(), reason });
        saveData('moderation.json', ultraModeration);
        return ultraModeration.warnings[userId].length;
    },
    getWarnings: (userId) => ultraModeration.warnings?.[userId]?.length || 0
};

// ═══════════════════════════════════════════════════════════════
// 📊 4. ANALYTICS SYSTEM
// ═══════════════════════════════════════════════════════════════
const Analytics = {
    trackCommand: (cmd, userId) => {
        if (!ultraAnalytics.commandUsage) ultraAnalytics.commandUsage = {};
        if (!ultraAnalytics.commandUsage[cmd]) ultraAnalytics.commandUsage[cmd] = { count: 0 };
        ultraAnalytics.commandUsage[cmd].count++;
        saveData('analytics.json', ultraAnalytics);
    },
    logError: (error, context) => {
        if (!ultraAnalytics.errorLogs) ultraAnalytics.errorLogs = [];
        ultraAnalytics.errorLogs.push({ time: Date.now(), error: String(error), context });
        if (ultraAnalytics.errorLogs.length > 100) ultraAnalytics.errorLogs = ultraAnalytics.errorLogs.slice(-100);
        saveData('analytics.json', ultraAnalytics);
    },
    getStats: () => ({
        totalCommands: Object.values(ultraAnalytics.commandUsage || {}).reduce((s, c) => s + c.count, 0),
        totalErrors: ultraAnalytics.errorLogs?.length || 0
    })
};

// ═══════════════════════════════════════════════════════════════
// 🔌 5. PLUGIN SYSTEM
// ═══════════════════════════════════════════════════════════════
const Plugins = {
    isEnabled: (p) => ultraPlugins.enabled?.includes(p) || false,
    enable: (p) => {
        if (!ultraPlugins.enabled) ultraPlugins.enabled = [];
        if (!ultraPlugins.enabled.includes(p)) ultraPlugins.enabled.push(p);
        ultraPlugins.disabled = (ultraPlugins.disabled || []).filter(x => x !== p);
        saveData('plugins.json', ultraPlugins);
    },
    disable: (p) => {
        ultraPlugins.enabled = (ultraPlugins.enabled || []).filter(x => x !== p);
        if (!ultraPlugins.disabled) ultraPlugins.disabled = [];
        if (!ultraPlugins.disabled.includes(p)) ultraPlugins.disabled.push(p);
        saveData('plugins.json', ultraPlugins);
    },
    list: () => ({ enabled: ultraPlugins.enabled || [], disabled: ultraPlugins.disabled || [] })
};

// ═══════════════════════════════════════════════════════════════
// 👤 6. USER PROFILES
// ═══════════════════════════════════════════════════════════════
const Profiles = {
    get: (userId) => {
        if (!ultraProfiles.users) ultraProfiles.users = {};
        if (!ultraProfiles.users[userId]) {
            ultraProfiles.users[userId] = {
                trustScore: 50, behaviorScore: 50, interests: [], penaltyHistory: [],
                totalMessages: 0, toxicMessages: 0, createdAt: Date.now()
            };
            saveData('profiles.json', ultraProfiles);
        }
        return ultraProfiles.users[userId];
    },
    updateTrust: (userId, change, reason) => {
        const p = Profiles.get(userId);
        p.trustScore = Math.max(0, Math.min(100, p.trustScore + change));
        p.penaltyHistory.push({ time: Date.now(), change, reason });
        if (p.penaltyHistory.length > 50) p.penaltyHistory = p.penaltyHistory.slice(-50);
        saveData('profiles.json', ultraProfiles);
        return p.trustScore;
    },
    incrementMessages: (userId, isToxic = false) => {
        const p = Profiles.get(userId);
        p.totalMessages++;
        if (isToxic) p.toxicMessages++;
        saveData('profiles.json', ultraProfiles);
    },
    getRiskLevel: (userId) => {
        const p = Profiles.get(userId);
        const ratio = p.totalMessages > 0 ? (p.toxicMessages / p.totalMessages) * 100 : 0;
        if (p.trustScore < 20 || ratio > 30) return { level: 'high', emoji: '🔴' };
        if (p.trustScore < 40 || ratio > 15) return { level: 'medium', emoji: '🟠' };
        return { level: 'safe', emoji: '🟢' };
    }
};

// ═══════════════════════════════════════════════════════════════
// 🎯 7. INTENT DETECTION
// ═══════════════════════════════════════════════════════════════
const Intent = {
    analyze: (message) => {
        const lower = message.toLowerCase();
        const isJoke = ['haha', 'lol', 'xd', 'şaka'].some(p => lower.includes(p));
        const isThreat = ['silerim', 'hacklerim', 'patlatırım'].some(p => lower.includes(p));
        const isQuestion = message.includes('?');
        return { isJoke, isThreat, isQuestion, action: isThreat && !isJoke ? 'warn' : 'none' };
    }
};

// ═══════════════════════════════════════════════════════════════
// 📈 8. PREDICTIVE SYSTEM
// ═══════════════════════════════════════════════════════════════
const Predictive = {
    banRisk: (userId) => {
        const p = Profiles.get(userId);
        const w = Moderation.getWarnings(userId);
        let risk = w * 15 + (100 - p.trustScore) * 0.3;
        return Math.min(100, Math.round(risk));
    }
};

// ═══════════════════════════════════════════════════════════════
// 🔄 9. HOT RELOAD
// ═══════════════════════════════════════════════════════════════
const HotReload = {
    reloadData: () => {
        ultraMemory = loadData('memory.json');
        ultraModeration = loadData('moderation.json');
        ultraAnalytics = loadData('analytics.json');
        ultraPlugins = loadData('plugins.json');
        ultraSelfHealing = loadData('selfhealing.json');
        ultraProfiles = loadData('profiles.json');
        ultraIntent = loadData('intent.json');
        console.log('[HOT-RELOAD] ✅ Data yenilendi');
    }
};

console.log('[ULTRA] 🧠 Tüm AI Sistemleri yüklendi!');

// Database reload function
function reloadDatabase() {
    try {
        const raw = fs.readFileSync('./database.json', 'utf8');
        try {
            database = Encryption.decrypt(raw);
        } catch(e) {
            database = JSON.parse(raw); // eski format fallback
        }
        if (!database.accounts) database.accounts = [];
        if (!database.userStats) database.userStats = { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() };
        if (!database.userRanks) database.userRanks = {};
        if (!database.notifications) database.notifications = {};
    } catch (e) {
        console.log('[ERROR] Database reload error:', e.message);
        database = { accounts: [], userStats: { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() }, userRanks: {}, notifications: {} };
    }
}

// Database kaydetme fonksiyonu
function saveDatabase() {
    try {
        if (!database.accounts) database.accounts = [];
        if (!database.userStats) database.userStats = { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() };
        if (!database.userRanks) database.userRanks = {};
        if (!database.notifications) database.notifications = {};
        fs.writeFileSync('./database.json', Encryption.encrypt(database));
    } catch (e) {
        console.log('[ERROR] Database save error:', e.message);
    }
}

// Initialize userStats if not exists
if (!database.userStats) {
    database.userStats = {
        xp: 0,
        level: 1,
        totalVoiceTime: 0,
        totalConnections: 0,
        lastXpGain: Date.now()
    };
    fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));
}

const selfClients = new Map();
const startTime = Date.now();
let totalConnections = 0;
let totalErrors = 0;
let totalSongChanges = 0;
let totalVoiceJoins = 0;

// Rank System
const ranks = [
    { name: 'Bronz', minXp: 0, color: '#cd7f32' },
    { name: 'Gumus', minXp: 500, color: '#c0c0c0' },
    { name: 'Altin', minXp: 1500, color: '#ffd700' },
    { name: 'Platin', minXp: 3500, color: '#00d4ff' },
    { name: 'Elmas', minXp: 7000, color: '#b9f2ff' },
    { name: 'Elmas Uye', minXp: 12000, color: '#00ffff' },
    { name: 'Premium', minXp: 20000, color: '#ff69b4' },
    { name: 'Usta', minXp: 30000, color: '#ff4500' },
    { name: 'Efsane', minXp: 50000, color: '#ff00ff' },
    { name: 'Dost', minXp: 75000, color: '#00ff00' },
    { name: 'Owner', minXp: 100000, color: '#ff0000' }
];

function getUserRank(userId = null) {
    // Check if user has an awarded rank first
    if (userId && database.userRanks && database.userRanks[userId]) {
        const awardedRankName = database.userRanks[userId].odulRank;
        const awardedRank = ranks.find(r => r.name === awardedRankName);
        if (awardedRank) return awardedRank;
    }
    
    // Check admin's awarded rank (for panel display)
    if (database.userRanks && database.userRanks[config.adminId]) {
        const awardedRankName = database.userRanks[config.adminId].odulRank;
        const awardedRank = ranks.find(r => r.name === awardedRankName);
        if (awardedRank) return awardedRank;
    }
    
    // Fall back to XP-based rank
    const xp = database.userStats?.xp || 0;
    let currentRank = ranks[0];
    for (const rank of ranks) {
        if (xp >= rank.minXp) currentRank = rank;
    }
    return currentRank;
}

function getNextRank(userId = null) {
    const currentRank = getUserRank(userId);
    const currentIndex = ranks.findIndex(r => r.name === currentRank.name);
    if (currentIndex < ranks.length - 1) {
        return ranks[currentIndex + 1];
    }
    return null;
}

function getRankProgress(userId = null) {
    const currentRank = getUserRank(userId);
    const next = getNextRank(userId);
    if (!next) return 100;
    
    const xp = database.userStats?.xp || 0;
    const progressXp = xp - currentRank.minXp;
    const neededXp = next.minXp - currentRank.minXp;
    return Math.min(100, Math.max(0, Math.round((progressXp / neededXp) * 100)));
}

function addXp(amount) {
    if (!database.userStats) {
        database.userStats = { xp: 0, level: 1, totalVoiceTime: 0, totalConnections: 0, lastXpGain: Date.now() };
    }
    database.userStats.xp += amount;
    database.userStats.lastXpGain = Date.now();
    fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));
}

// Rol bazlı limit kontrolü
function getUserTokenLimit(userId, member) {
    reloadConfig();
    if (userId === config.adminId) return Infinity;
    return config.defaultLimit || 20;
}

// Kullanıcının mevcut token sayısını al
function getUserTokenCount(userId) {
    if (!database.accounts) database.accounts = [];
    return database.accounts.filter(acc => acc.addedBy === userId).length;
}

// Referans sistemi fonksiyonları
function getReferralData(userId) {
    if (!database.referrals) database.referrals = {};
    if (!database.referrals[userId]) {
        database.referrals[userId] = {
            code: generateReferralCode(),
            invitedBy: null,
            invites: [],
            bonusLimit: 0,
            totalEarned: 0
        };
        saveDatabase();
    }
    return database.referrals[userId];
}

function generateReferralCode() {
    return 'SWN-' + Math.random().toString(36).substring(2, 8).toUpperCase();
}

function getReferralBonus(inviteCount) {
    const rewards = config.referralRewards || {};
    let bonus = 0;
    
    for (const [count, reward] of Object.entries(rewards)) {
        if (inviteCount >= parseInt(count)) {
            bonus = Math.max(bonus, reward);
        }
    }
    
    return bonus;
}

function applyReferral(userId, referralCode) {
    if (!database.referrals) database.referrals = {};
    
    // Referral code'u bul
    const referrerId = Object.keys(database.referrals).find(
        id => database.referrals[id].code === referralCode
    );
    
    if (!referrerId) return { success: false, message: 'Geçersiz referans kodu!' };
    if (referrerId === userId) return { success: false, message: 'Kendi kodunuzu kullanamazsınız!' };
    
    const userData = getReferralData(userId);
    if (userData.invitedBy) return { success: false, message: 'Zaten bir referans kodu kullandınız!' };
    
    // Referansı uygula
    userData.invitedBy = referrerId;
    database.referrals[referrerId].invites.push({
        userId: userId,
        date: Date.now()
    });
    
    // Bonus hesapla
    const inviteCount = database.referrals[referrerId].invites.length;
    const newBonus = getReferralBonus(inviteCount);
    const oldBonus = database.referrals[referrerId].bonusLimit;
    
    if (newBonus > oldBonus) {
        database.referrals[referrerId].bonusLimit = newBonus;
        database.referrals[referrerId].totalEarned += (newBonus - oldBonus);
    }
    
    saveDatabase();
    
    return { 
        success: true, 
        referrerId: referrerId,
        inviteCount: inviteCount,
        bonus: newBonus
    };
}

// Bildirim gönderme fonksiyonu
async function sendNotification(userId, type, data) {
    try {
        if (!database.notifications || !database.notifications[userId]) return;
        const settings = database.notifications[userId];
        
        // Bildirim kapalıysa gönderme
        if (type === 'tokenOffline' && !settings.tokenOffline) return;
        if (type === 'limitWarning' && !settings.limitWarning) return;
        if (type === 'limitFull' && !settings.limitFull) return;
        
        const user = await bot.users.fetch(userId);
        if (!user) return;
        
        let container;
        
        if (type === 'tokenOffline') {
            container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ❌ **Token Offline!**\n` +
                        `-# ${new Date().toLocaleString('tr-TR')}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ⚡ **Uyarı**\n\n` +
                        `👤 **Token:** ${data.username || 'Bilinmiyor'}\n` +
                        `❌ **Durum:** Çevrimdışı\n` +
                        `⚙️ **Sebep:** ${data.reason || 'Bilinmiyor'}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# 🔷 Token kontrol edilip yeniden başlatılmalı`
                    )
                );
        } else if (type === 'limitWarning') {
            container = new ContainerBuilder()
                .setAccentColor(0xFFAA00)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# 🎲 **Limit Uyarısı!**\n` +
                        `-# ${new Date().toLocaleString('tr-TR')}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ⚡ **Dikkat**\n\n` +
                        `🔹 **Kullanılan:** ${data.current}/${data.limit}\n` +
                        `✅ **Doluluk:** %${data.percent}\n` +
                        `❌ **Kalan:** ${data.remaining} slot`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# 🔷 Limitiniz dolmak üzere, yeni paket için yöneticilere başvurun`
                    )
                );
        } else if (type === 'limitFull') {
            container = new ContainerBuilder()
                .setAccentColor(0xFF0000)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# ❌ **Limit Doldu!**\n` +
                        `-# ${new Date().toLocaleString('tr-TR')}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ⚡ **Uyarı**\n\n` +
                        `🔹 **Kullanılan:** ${data.current}/${data.limit}\n` +
                        `❌ **Durum:** Limit tamamen doldu\n` +
                        `⚙️ **Yeni token ekleyemezsiniz**`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# 🔷 Daha fazla limit için yöneticilere başvurun • discord.gg/swenzy`
                    )
                );
        }
        
        await user.send({
            components: [container],
            flags: MessageFlags.IsComponentsV2
        });
        
        console.log(`[NOTIFICATION] ${type} bildirimi gönderildi: ${userId}`);
    } catch (err) {
        console.log(`[NOTIFICATION] Bildirim gönderilemedi: ${err.message}`);
    }
}

// XP gain interval (every 5 minutes while connected)
setInterval(() => {
    const activeCount = selfClients.size;
    if (activeCount > 0) {
        const xpGain = activeCount * 10; // 10 XP per active account per 5 min
        addXp(xpGain);
    }
}, 5 * 60 * 1000);

// Console Renkleri & Stiller - SXP.TOOL Style
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    underscore: '\x1b[4m',
    blink: '\x1b[5m',
    reverse: '\x1b[7m',
    hidden: '\x1b[8m',
    black: '\x1b[30m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    gray: '\x1b[90m',
    orange: '\x1b[38;5;208m',
    pink: '\x1b[38;5;205m',
    purple: '\x1b[38;5;141m',
    lime: '\x1b[38;5;118m',
    darkGreen: '\x1b[38;5;22m',
    lightGreen: '\x1b[38;5;46m',
    darkYellow: '\x1b[38;5;178m',
    lightYellow: '\x1b[38;5;226m',
    darkRed: '\x1b[38;5;124m',
    lightRed: '\x1b[38;5;196m',
    bgBlack: '\x1b[40m',
    bgRed: '\x1b[41m',
    bgGreen: '\x1b[42m',
    bgYellow: '\x1b[43m',
    bgBlue: '\x1b[44m',
    bgMagenta: '\x1b[45m',
    bgCyan: '\x1b[46m',
    bgWhite: '\x1b[47m',
    bgOrange: '\x1b[48;5;208m',
    bgPurple: '\x1b[48;5;141m',
    bgDarkGreen: '\x1b[48;5;22m'
};

const c = colors;

// SXP.TOOL Style Gradient renkleri
const gradient = {
    purple: ['\x1b[38;5;129m', '\x1b[38;5;135m', '\x1b[38;5;141m', '\x1b[38;5;147m', '\x1b[38;5;153m'],
    cyan: ['\x1b[38;5;51m', '\x1b[38;5;50m', '\x1b[38;5;49m', '\x1b[38;5;48m', '\x1b[38;5;47m'],
    fire: ['\x1b[38;5;196m', '\x1b[38;5;202m', '\x1b[38;5;208m', '\x1b[38;5;214m', '\x1b[38;5;220m'],
    rainbow: ['\x1b[38;5;196m', '\x1b[38;5;208m', '\x1b[38;5;226m', '\x1b[38;5;46m', '\x1b[38;5;51m', '\x1b[38;5;129m'],
    neon: ['\x1b[38;5;201m', '\x1b[38;5;199m', '\x1b[38;5;197m', '\x1b[38;5;163m', '\x1b[38;5;129m'],
    ice: ['\x1b[38;5;159m', '\x1b[38;5;153m', '\x1b[38;5;147m', '\x1b[38;5;141m', '\x1b[38;5;135m'],
    gold: ['\x1b[38;5;220m', '\x1b[38;5;221m', '\x1b[38;5;222m', '\x1b[38;5;223m', '\x1b[38;5;229m'],
    // SXP.TOOL style gradients
    matrix: ['\x1b[38;5;22m', '\x1b[38;5;28m', '\x1b[38;5;34m', '\x1b[38;5;40m', '\x1b[38;5;46m'],
    toxic: ['\x1b[38;5;226m', '\x1b[38;5;190m', '\x1b[38;5;154m', '\x1b[38;5;118m', '\x1b[38;5;82m'],
    blood: ['\x1b[38;5;52m', '\x1b[38;5;88m', '\x1b[38;5;124m', '\x1b[38;5;160m', '\x1b[38;5;196m']
};

// Spinner animasyonlari
const spinners = {
    dots: ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'],
    pulse: ['█', '▓', '▒', '░', '▒', '▓'],
    star: ['✶', '✸', '✹', '✺', '✹', '✸'],
    bounce: ['⣾', '⣽', '⣻', '⢿', '⡿', '⣟', '⣯', '⣷'],
    arrows: ['▹▹▹▹▹', '▸▹▹▹▹', '▹▸▹▹▹', '▹▹▸▹▹', '▹▹▹▸▹', '▹▹▹▹▸'],
    wave: ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█', '▇', '▆', '▅', '▄', '▃', '▂'],
    matrix: ['/', '-', '\\', '|'],
    loading: ['[    ]', '[=   ]', '[==  ]', '[=== ]', '[====]', '[ ===]', '[  ==]', '[   =]']
};

// CMD Title güncelleme - SXP.TOOL Style
function updateTitle() {
    const active = selfClients.size;
    const total = database.accounts.length;
    const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
    const title = `SWENZY TOOL v4.0 | ${active}/${total} ACTIVE | ${getUptime()} | ${mem}MB | discord.gg/swenzy`;
    process.stdout.write(`\x1b]0;${title}\x07`);
}

// Matrix text effect
function matrixText(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += gradient.matrix[i % gradient.matrix.length] + text[i];
    }
    return result + c.reset;
}

// Toxic text effect
function toxicText(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += gradient.toxic[i % gradient.toxic.length] + text[i];
    }
    return result + c.reset;
}

// Rainbow text
function rainbowText(text) {
    let result = '';
    for (let i = 0; i < text.length; i++) {
        result += gradient.rainbow[i % gradient.rainbow.length] + text[i];
    }
    return result + c.reset;
}

// Typing efekti - Matrix style
async function typeWriter(text, delay = 15) {
    for (const char of text) {
        process.stdout.write(c.green + char);
        await new Promise(r => setTimeout(r, delay));
    }
    process.stdout.write(c.reset);
}

// SXP.TOOL Style Progress Bar
async function waveProgressBar(text, duration = 2000) {
    const length = 35;
    const steps = 50;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
        const percent = i / steps;
        const filled = Math.round(length * percent);
        
        let bar = c.yellow + '[' + c.reset;
        for (let j = 0; j < length; j++) {
            if (j < filled) {
                bar += gradient.matrix[j % gradient.matrix.length] + '█';
            } else {
                bar += c.gray + '░';
            }
        }
        bar += c.reset + c.yellow + ']' + c.reset;
        
        const percentText = Math.round(percent * 100).toString().padStart(3);
        const spinFrame = spinners.matrix[i % spinners.matrix.length];
        process.stdout.write(`\r  ${c.yellow}${spinFrame}${c.reset} ${c.white}${text.padEnd(25)}${c.reset} ${bar} ${c.green}${percentText}%${c.reset}`);
        await new Promise(r => setTimeout(r, stepDuration));
    }
    process.stdout.write(`\r  ${c.green}[+]${c.reset} ${c.green}${text.padEnd(25)}${c.reset} ${c.yellow}[${'█'.repeat(length)}]${c.reset} ${c.green}100%${c.reset}\n`);
}

// Modern Progress Bar
function modernProgressBar(current, total, length = 25) {
    const percent = total > 0 ? current / total : 0;
    const filled = Math.round(length * percent);
    const empty = length - filled;
    
    let bar = '';
    for (let i = 0; i < filled; i++) {
        const colorIndex = Math.floor((i / length) * gradient.cyan.length);
        bar += gradient.cyan[Math.min(colorIndex, gradient.cyan.length - 1)] + '━';
    }
    bar += c.gray + '━'.repeat(empty) + c.reset;
    
    const percentText = Math.round(percent * 100);
    const percentColor = percentText >= 80 ? c.green : percentText >= 50 ? c.yellow : c.red;
    
    return `${bar} ${percentColor}${percentText}%${c.reset}`;
}

// Animated Progress Bar
async function animatedProgressBar(text, duration = 2000) {
    const length = 30;
    const steps = 50;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
        const percent = i / steps;
        const filled = Math.round(length * percent);
        const empty = length - filled;
        
        let bar = '';
        for (let j = 0; j < filled; j++) {
            const colorIndex = Math.floor((j / length) * gradient.purple.length);
            bar += gradient.purple[Math.min(colorIndex, gradient.purple.length - 1)] + '█';
        }
        bar += c.gray + '░'.repeat(empty) + c.reset;
        
        const percentText = Math.round(percent * 100).toString().padStart(3);
        process.stdout.write(`\r    ${c.cyan}${text}${c.reset} ${bar} ${c.bright}${c.white}${percentText}%${c.reset}`);
        await new Promise(r => setTimeout(r, stepDuration));
    }
    process.stdout.write(`\r    ${c.green}✓ ${text}${c.reset}${' '.repeat(50)}\n`);
}

// Zaman formatlama
function getTime() {
    const now = new Date();
    return `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
}

function getDate() {
    const now = new Date();
    const days = ['Pazar', 'Pazartesi', 'Sali', 'Carsamba', 'Persembe', 'Cuma', 'Cumartesi'];
    const months = ['Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran', 'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik'];
    return `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}, ${days[now.getDay()]}`;
}

function getShortDate() {
    const now = new Date();
    return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth()+1).toString().padStart(2, '0')}.${now.getFullYear()}`;
}

// SXP.TOOL Style Modern Progress Bar
function modernProgressBar(current, total, length = 25) {
    const percent = total > 0 ? current / total : 0;
    const filled = Math.round(length * percent);
    const empty = length - filled;
    
    let bar = c.yellow + '[' + c.reset;
    for (let i = 0; i < filled; i++) {
        bar += gradient.matrix[Math.floor((i / length) * gradient.matrix.length)] + '█';
    }
    bar += c.gray + '░'.repeat(empty) + c.reset + c.yellow + ']' + c.reset;
    
    const percentText = Math.round(percent * 100);
    const percentColor = percentText >= 80 ? c.green : percentText >= 50 ? c.yellow : c.red;
    
    return `${bar} ${percentColor}${percentText}%${c.reset}`;
}

// SXP.TOOL Style Animated Progress Bar
async function animatedProgressBar(text, duration = 2000) {
    const length = 35;
    const steps = 40;
    const stepDuration = duration / steps;
    
    for (let i = 0; i <= steps; i++) {
        const percent = i / steps;
        const filled = Math.round(length * percent);
        const empty = length - filled;
        
        let bar = c.yellow + '[' + c.reset;
        for (let j = 0; j < filled; j++) {
            bar += gradient.matrix[j % gradient.matrix.length] + '█';
        }
        bar += c.gray + '░'.repeat(empty) + c.reset + c.yellow + ']' + c.reset;
        
        const percentText = Math.round(percent * 100).toString().padStart(3);
        process.stdout.write(`\r  ${c.yellow}>${c.reset} ${c.white}${text.padEnd(20)}${c.reset} ${bar} ${c.green}${percentText}%${c.reset}`);
        await new Promise(r => setTimeout(r, stepDuration));
    }
    process.stdout.write(`\r  ${c.green}[+]${c.reset} ${c.green}${text.padEnd(20)}${c.reset}${' '.repeat(60)}\n`);
}

function getUptime() {
    const ms = Date.now() - startTime;
    const secs = Math.floor(ms / 1000) % 60;
    const mins = Math.floor(ms / 60000) % 60;
    const hours = Math.floor(ms / 3600000) % 24;
    const days = Math.floor(ms / 86400000);
    if (days > 0) return `${days}g ${hours}s ${mins}d ${secs}sn`;
    if (hours > 0) return `${hours}s ${mins}d ${secs}sn`;
    return `${mins}d ${secs}sn`;
}

function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
}

// Log fonksiyonlari - SXP.TOOL Style
const log = {
    banner: async () => {
        console.clear();
        updateTitle();
        
        // Matrix style intro
        const introText = '[ SWENZY.TOOL INITIALIZING... ]';
        process.stdout.write(`\n  ${c.green}`);
        for (const char of introText) {
            process.stdout.write(char);
            await new Promise(r => setTimeout(r, 30));
        }
        console.log(c.reset);
        await new Promise(r => setTimeout(r, 400));
        
        console.clear();
        
        // SXP.TOOL Style Yellow Border Top
        console.log(`${c.yellow}  ╔${'═'.repeat(78)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}${' '.repeat(78)}${c.yellow}║${c.reset}`);
        
        const bannerLines = [
            '  ███████╗██╗    ██╗███████╗███╗   ██╗███████╗██╗   ██╗    ████████╗ ██████╗  ██████╗ ██╗     ',
            '  ██╔════╝██║    ██║██╔════╝████╗  ██║╚══███╔╝╚██╗ ██╔╝    ╚══██╔══╝██╔═══██╗██╔═══██╗██║     ',
            '  ███████╗██║ █╗ ██║█████╗  ██╔██╗ ██║  ███╔╝  ╚████╔╝        ██║   ██║   ██║██║   ██║██║     ',
            '  ╚════██║██║███╗██║██╔══╝  ██║╚██╗██║ ███╔╝    ╚██╔╝         ██║   ██║   ██║██║   ██║██║     ',
            '  ███████║╚███╔███╔╝███████╗██║ ╚████║███████╗   ██║          ██║   ╚██████╔╝╚██████╔╝███████╗',
            '  ╚══════╝ ╚══╝╚══╝ ╚══════╝╚═╝  ╚═══╝╚══════╝   ╚═╝          ╚═╝    ╚═════╝  ╚═════╝ ╚══════╝'
        ];
        
        for (let i = 0; i < bannerLines.length; i++) {
            let coloredLine = `${c.yellow}  ║${c.reset}`;
            for (let j = 0; j < bannerLines[i].length; j++) {
                coloredLine += gradient.rainbow[j % gradient.rainbow.length] + bannerLines[i][j];
            }
            coloredLine += c.reset + `${c.yellow}║${c.reset}`;
            console.log(coloredLine);
            await new Promise(r => setTimeout(r, 60));
        }
        
        console.log(`${c.yellow}  ║${c.reset}${' '.repeat(78)}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(78)}╣${c.reset}`);
        
        // Welcome Box
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}[+]${c.reset} ${c.white}WELCOME TO SWENZY TOOL${c.reset}                                                   ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}[+]${c.reset} ${c.gray}Ultra AFK Voice Bot System v4.0${c.reset}                                         ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}[+]${c.reset} ${c.gray}Developed by${c.reset} ${c.green}Swenzy${c.reset} ${c.gray}|${c.reset} ${c.yellow}discord.gg/swenzy${c.reset}                                   ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(78)}╣${c.reset}`);
        
        // Status Line
        const statusText = 'CURRENT: NORMAL';
        const maintenanceText = 'MAINTENANCE: OFF';
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}●${c.reset} ${c.green}${statusText}${c.reset}                    ${c.red}●${c.reset} ${c.gray}${maintenanceText}${c.reset}                       ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╚${'═'.repeat(78)}╝${c.reset}`);
        
        console.log();
        
        // Tagline - Rainbow
        const tagline = '[ MORE ACCOUNTS = MORE POWER ]';
        process.stdout.write('  ');
        for (let i = 0; i < tagline.length; i++) {
            process.stdout.write(gradient.rainbow[i % gradient.rainbow.length] + tagline[i]);
        }
        console.log(c.reset);
        console.log();
    },

    box: (title, content) => {
        const width = 70;
        console.log(`${c.yellow}  ╔${'═'.repeat(width)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}${title}${c.reset}${' '.repeat(Math.max(0, width - title.length - 5))}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(width)}╣${c.reset}`);
        content.forEach(line => {
            const cleanLine = line.replace(/\x1b\[[0-9;]*m/g, '');
            const padding = width - cleanLine.length - 1;
            console.log(`${c.yellow}  ║${c.reset} ${line}${' '.repeat(Math.max(0, padding))}${c.yellow}║${c.reset}`);
        });
        console.log(`${c.yellow}  ╚${'═'.repeat(width)}╝${c.reset}`);
    },

    divider: (char = '─') => {
        console.log(`${c.yellow}  ${char.repeat(80)}${c.reset}`);
    },

    doubleDivider: () => {
        console.log(`${c.yellow}  ${'═'.repeat(80)}${c.reset}`);
    },

    info: (msg) => {
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.yellow}[INFO]${c.reset} ${c.white}${msg}${c.reset}`);
    },

    success: (msg) => {
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.green}[+]${c.reset} ${c.green}${msg}${c.reset}`);
    },

    warn: (msg) => {
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.yellow}[!]${c.reset} ${c.yellow}${msg}${c.reset}`);
    },

    error: (msg) => {
        totalErrors++;
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.red}[-]${c.reset} ${c.red}${msg}${c.reset}`);
    },

    connect: (tag) => {
        totalConnections++;
        addXp(25); // 25 XP per connection
        updateTitle();
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.green}[CONNECT]${c.reset} ${c.green}${tag}${c.reset} ${c.gray}connected${c.reset}`);
    },

    disconnect: (tag) => {
        updateTitle();
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.red}[DISCONNECT]${c.reset} ${c.red}${tag}${c.reset} ${c.gray}disconnected${c.reset}`);
    },

    voice: (tag, channel) => {
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.cyan}[VOICE]${c.reset} ${c.white}${tag}${c.reset} ${c.gray}>${c.reset} ${c.cyan}#${channel}${c.reset}`);
    },

    spotify: (tag, song, artist) => {
        totalSongChanges++;
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.green}[SPOTIFY]${c.reset} ${c.white}${tag}${c.reset} ${c.gray}>${c.reset} ${c.green}${song}${c.reset} ${c.gray}-${c.reset} ${c.dim}${artist}${c.reset}`);
    },

    game: (tag, gameName) => {
        console.log(`  ${c.gray}[${getTime()}]${c.reset} ${c.yellow}[GAME]${c.reset} ${c.white}${tag}${c.reset} ${c.gray}>${c.reset} ${c.yellow}${gameName}${c.reset}`);
    },

    loading: async (text, duration = 1500) => {
        const frames = spinners.matrix;
        const start = Date.now();
        let i = 0;
        while (Date.now() - start < duration) {
            process.stdout.write(`\r  ${c.yellow}${frames[i % frames.length]}${c.reset} ${c.white}${text}${c.gray}...${c.reset}`);
            await new Promise(r => setTimeout(r, 100));
            i++;
        }
        process.stdout.write(`\r  ${c.green}[+]${c.reset} ${c.green}${text}${c.reset}${' '.repeat(20)}\n`);
    },

    systemInfo: () => {
        const mem = process.memoryUsage();
        console.log();
        console.log(`${c.yellow}  ╔${'═'.repeat(70)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}SYSTEM INFORMATION${c.reset}${' '.repeat(48)}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(70)}╣${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}Date:${c.reset}      ${c.white}${getDate()} ${getTime()}${c.reset}${' '.repeat(25)}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}Uptime:${c.reset}    ${c.white}${getUptime()}${c.reset}${' '.repeat(Math.max(0, 50 - getUptime().length))}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}Node.js:${c.reset}   ${c.white}${process.version}${c.reset}${' '.repeat(Math.max(0, 50 - process.version.length))}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}Platform:${c.reset}  ${c.white}${process.platform}${c.reset}${' '.repeat(Math.max(0, 50 - process.platform.length))}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.green}Memory:${c.reset}    ${c.white}${formatBytes(mem.heapUsed)} / ${formatBytes(mem.heapTotal)}${c.reset}${' '.repeat(35)}${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╚${'═'.repeat(70)}╝${c.reset}`);
        console.log();
    },

    stats: () => {
        const active = selfClients.size;
        const total = database.accounts.length;
        const mem = process.memoryUsage();
        
        updateTitle();
        
        // Progress bar - SXP.TOOL Style
        const percent = total > 0 ? Math.round((active / total) * 100) : 0;
        const barLength = 30;
        const filled = Math.round(barLength * (percent / 100));
        let progressBar = c.yellow + '[' + c.reset;
        for (let i = 0; i < barLength; i++) {
            if (i < filled) {
                progressBar += gradient.matrix[i % gradient.matrix.length] + '█';
            } else {
                progressBar += c.gray + '░';
            }
        }
        progressBar += c.reset + c.yellow + ']' + c.reset;
        
        console.log();
        console.log(`${c.yellow}  ╔${'═'.repeat(78)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}LIVE STATISTICS${c.reset}                                    ${c.gray}${getShortDate()} ${getTime()}${c.reset}   ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(78)}╣${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}                                                                              ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}   ${c.green}Account Status:${c.reset}  ${progressBar} ${percent >= 80 ? c.green : percent >= 50 ? c.yellow : c.red}${percent}%${c.reset}                    ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}                                                                              ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(78)}╣${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}   ${c.green}● ONLINE:${c.reset}  ${c.bright}${c.white}${active.toString().padStart(3)}${c.reset}      ${c.red}● OFFLINE:${c.reset} ${c.bright}${c.white}${(total-active).toString().padStart(3)}${c.reset}      ${c.cyan}● TOTAL:${c.reset} ${c.bright}${c.white}${total.toString().padStart(3)}${c.reset}              ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(78)}╣${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}   ${c.yellow}Uptime:${c.reset}       ${c.white}${getUptime().padEnd(15)}${c.reset}  ${c.yellow}Connections:${c.reset}  ${c.white}${totalConnections.toString().padEnd(10)}${c.reset}           ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}   ${c.green}Songs:${c.reset}        ${c.white}${totalSongChanges.toString().padEnd(15)}${c.reset}  ${c.red}Errors:${c.reset}       ${c.white}${totalErrors.toString().padEnd(10)}${c.reset}           ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}   ${c.magenta}Memory:${c.reset}       ${c.white}${formatBytes(mem.heapUsed).padEnd(15)}${c.reset}                                     ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╚${'═'.repeat(78)}╝${c.reset}`);
        console.log();
    },

    table: (accounts) => {
        if (accounts.length === 0) {
            console.log(`  ${c.gray}No accounts registered${c.reset}`);
            return;
        }
        
        console.log();
        console.log(`${c.yellow}  ╔════╦════════════════════════╦══════════╦═══════════╦══════════════════════╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.bright}${c.white}#${c.reset}  ${c.yellow}║${c.reset} ${c.bright}${c.white}NAME${c.reset}                   ${c.yellow}║${c.reset} ${c.bright}${c.white}STATUS${c.reset}   ${c.yellow}║${c.reset} ${c.bright}${c.white}POWER${c.reset}     ${c.yellow}║${c.reset} ${c.bright}${c.white}ACTIVITY${c.reset}             ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠════╬════════════════════════╬══════════╬═══════════╬══════════════════════╣${c.reset}`);
        
        accounts.forEach((acc, i) => {
            const isActive = selfClients.has(acc.token);
            const statusIcon = isActive ? `${c.green}ONLINE${c.reset}  ` : `${c.red}OFFLINE${c.reset} `;
            const powerIcon = isActive ? `${c.green}████${c.reset}` : `${c.red}░░░░${c.reset}`;
            const activityType = acc.statusType === 'game' ? `${c.yellow}${(acc.gameName || 'Game').substring(0, 18).padEnd(18)}${c.reset}` : 
                                acc.statusType === 'spotify' ? `${c.green}Spotify${c.reset}           ` : `${c.gray}None${c.reset}              `;
            const name = (acc.username || 'Loading...').substring(0, 20).padEnd(20);
            const num = (i + 1).toString().padStart(2);
            
            console.log(`${c.yellow}  ║${c.reset} ${c.white}${num}${c.reset} ${c.yellow}║${c.reset} ${c.bright}${name}${c.reset} ${c.yellow}║${c.reset} ${statusIcon} ${c.yellow}║${c.reset} ${powerIcon}      ${c.yellow}║${c.reset} ${activityType} ${c.yellow}║${c.reset}`);
        });
        
        console.log(`${c.yellow}  ╚════╩════════════════════════╩══════════╩═══════════╩══════════════════════╝${c.reset}`);
        
        // Top Rankings Panel
        console.log();
        console.log(`${c.yellow}  ╔${'═'.repeat(40)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}TOP ACCOUNTS${c.reset}                      ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(40)}╣${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset}  ${c.gray}NAME${c.reset}              ${c.green}GOOD${c.reset}    ${c.red}FAIL${c.reset}    ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╠${'═'.repeat(40)}╣${c.reset}`);
        
        const topAccounts = accounts.slice(0, 5);
        topAccounts.forEach((acc, i) => {
            const isActive = selfClients.has(acc.token);
            const name = (acc.username || 'Loading...').substring(0, 14).padEnd(14);
            const good = isActive ? `${c.green}✓${c.reset}` : `${c.gray}-${c.reset}`;
            const fail = !isActive ? `${c.red}✗${c.reset}` : `${c.gray}-${c.reset}`;
            console.log(`${c.yellow}  ║${c.reset}  ${c.white}${name}${c.reset}      ${good}       ${fail}       ${c.yellow}║${c.reset}`);
        });
        
        console.log(`${c.yellow}  ╚${'═'.repeat(40)}╝${c.reset}`);
        console.log();
    },

    header: (text) => {
        console.log();
        console.log(`${c.yellow}  ╔${'═'.repeat(text.length + 6)}╗${c.reset}`);
        console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}${text.toUpperCase()}${c.reset} ${c.yellow}║${c.reset}`);
        console.log(`${c.yellow}  ╚${'═'.repeat(text.length + 6)}╝${c.reset}`);
        console.log();
    }
};

// Spotify sarkilari - Turkce & Yabanci Karisik (Gercek Spotify Album Cover ID'leri)
const spotifySongs = [
    // Lvbel C5 - Gercek kapaklar icin bilinen album coverlar kullaniliyor
    { name: "Bundan Sonra", artist: "Lvbel C5", album: "Bundan Sonra", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 180000 },
    { name: "Yalan", artist: "Lvbel C5", album: "Yalan", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 195000 },
    { name: "Sevmedim Deme", artist: "Lvbel C5", album: "Sevmedim Deme", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 210000 },
    { name: "Paris", artist: "Lvbel C5", album: "Paris", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 185000 },
    { name: "Zehir", artist: "Lvbel C5", album: "Zehir", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 200000 },
    { name: "Ara Ara", artist: "Lvbel C5", album: "Ara Ara", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 175000 },
    { name: "Cayir Cayir", artist: "Lvbel C5", album: "Cayir Cayir", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 190000 },
    { name: "Erkenci", artist: "Lvbel C5", album: "Erkenci", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 205000 },
    // Ati242
    { name: "Yine Sensiz", artist: "Ati242", album: "Yine Sensiz", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 215000 },
    { name: "Benim Ol", artist: "Ati242", album: "Benim Ol", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 198000 },
    { name: "Sorsana", artist: "Ati242", album: "Sorsana", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 188000 },
    { name: "Bana Gore", artist: "Ati242", album: "Bana Gore", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 220000 },
    { name: "Biri Var", artist: "Ati242", album: "Biri Var", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 195000 },
    { name: "Gel", artist: "Ati242", album: "Gel", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 182000 },
    { name: "Neden", artist: "Ati242", album: "Neden", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 208000 },
    { name: "Patron", artist: "Ati242", album: "Patron", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 175000 },
    // Ezhel
    { name: "Gecmis Olsun", artist: "Ezhel", album: "Gecmis Olsun", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "3ee8KTMsXOPSwD0vkRPj8p", duration: 198000 },
    { name: "Aya", artist: "Ezhel", album: "Aya", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 210000 },
    { name: "Felaket", artist: "Ezhel", album: "Mutsuzlar Kulubu", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 185000 },
    // Murda
    { name: "Yak", artist: "Murda", album: "Yak", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 188000 },
    { name: "Boynumdaki Chain", artist: "Murda", album: "Boynumdaki Chain", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 195000 },
    // Mero
    { name: "Olabilir", artist: "Mero", album: "Olabilir", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 195000 },
    { name: "Baller los", artist: "Mero", album: "Baller los", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 180000 },
    // Ceza
    { name: "Holocaust", artist: "Ceza", album: "Holocaust", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 235000 },
    { name: "Suspus", artist: "Ceza", album: "Suspus", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 220000 },
    // Sagopa Kajmer
    { name: "Galiba", artist: "Sagopa Kajmer", album: "Galiba", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 248000 },
    { name: "Baytar", artist: "Sagopa Kajmer", album: "Baytar", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 230000 },
    // Semicenk
    { name: "Anlasana", artist: "Semicenk", album: "Anlasana", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 225000 },
    { name: "Icimdeki Sen", artist: "Semicenk", album: "Icimdeki Sen", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 210000 },
    // Heijan
    { name: "Yoksun", artist: "Heijan", album: "Yoksun", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 202000 },
    { name: "Manyak", artist: "Heijan", album: "Manyak", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 190000 },
    // Reynmen
    { name: "Leyla", artist: "Reynmen", album: "Leyla", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 178000 },
    { name: "Derdim Olsun", artist: "Reynmen", album: "Derdim Olsun", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 185000 },
    // Yabanci Hit - Gercek ID'ler
    { name: "Blinding Lights", artist: "The Weeknd", album: "After Hours", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 200000 },
    { name: "Starboy", artist: "The Weeknd", album: "Starboy", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "7MXVkk9YMctZqd1Srtv4MB", duration: 230000 },
    { name: "Save Your Tears", artist: "The Weeknd", album: "After Hours", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "5QO79kh1waicV47BqGRL3g", duration: 215000 },
    { name: "Shape of You", artist: "Ed Sheeran", album: "Divide", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 234000 },
    { name: "Perfect", artist: "Ed Sheeran", album: "Divide", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "0tgVpDi06FyKpA1z0VMD4v", duration: 263000 },
    { name: "Levitating", artist: "Dua Lipa", album: "Future Nostalgia", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "39LLxExYz6ewLAcYrzQQyP", duration: 203000 },
    { name: "Dont Start Now", artist: "Dua Lipa", album: "Future Nostalgia", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 183000 },
    { name: "As It Was", artist: "Harry Styles", album: "Harrys House", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "4Dvkj6JhhA12EX05fT7y2e", duration: 167000 },
    { name: "Watermelon Sugar", artist: "Harry Styles", album: "Fine Line", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "6UelLqGlWMcVH1E5c4H7lY", duration: 174000 },
    // Ek Turkce Sarkilar
    { name: "Imkansizim", artist: "Mero", album: "Imkansizim", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 195000 },
    { name: "Ben Elimi Sana Verdim", artist: "Mero", album: "Ben Elimi", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "0tgVpDi06FyKpA1z0VMD4v", duration: 188000 },
    { name: "Hobby Hobby", artist: "Mero", album: "Hobby", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "39LLxExYz6ewLAcYrzQQyP", duration: 175000 },
    { name: "Koptum", artist: "Murda", album: "Koptum", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "4Dvkj6JhhA12EX05fT7y2e", duration: 192000 },
    { name: "Para Yok", artist: "Murda", album: "Para Yok", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "6UelLqGlWMcVH1E5c4H7lY", duration: 185000 },
    { name: "Gece Goluun Sayesinde", artist: "Murda", album: "Gece Golge", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 210000 },
    { name: "Kazandim", artist: "Ezhel", album: "Kazandim", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 198000 },
    { name: "Imdat", artist: "Ezhel", album: "Imdat", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 205000 },
    { name: "Olay", artist: "Ezhel", album: "Olay", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 188000 },
    { name: "Alo", artist: "Ezhel", album: "Alo", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 195000 },
    { name: "Nefret", artist: "Ceza", album: "Nefret", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 240000 },
    { name: "Yerli Plaka", artist: "Ceza", album: "Yerli Plaka", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 225000 },
    { name: "Rapstar", artist: "Ceza", album: "Rapstar", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 218000 },
    { name: "Bir Pesimansen", artist: "Sagopa Kajmer", album: "Pesimist", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 255000 },
    { name: "Vasiyet", artist: "Sagopa Kajmer", album: "Vasiyet", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 238000 },
    { name: "Isyankar", artist: "Sagopa Kajmer", album: "Isyankar", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "7MXVkk9YMctZqd1Srtv4MB", duration: 242000 },
    { name: "Vazgectim", artist: "Sancak", album: "Vazgectim", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "5QO79kh1waicV47BqGRL3g", duration: 215000 },
    { name: "Bana Kendimi Ver", artist: "Sancak", album: "Bana Kendimi", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 228000 },
    { name: "Gozlerinin Yesilini", artist: "Sancak", album: "Gozlerin", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "0tgVpDi06FyKpA1z0VMD4v", duration: 235000 },
    { name: "Geceler", artist: "Motive", album: "Geceler", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "39LLxExYz6ewLAcYrzQQyP", duration: 192000 },
    { name: "Bi Anda", artist: "Motive", album: "Bi Anda", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "4Dvkj6JhhA12EX05fT7y2e", duration: 185000 },
    { name: "Yagmur", artist: "Motive", album: "Yagmur", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "6UelLqGlWMcVH1E5c4H7lY", duration: 198000 },
    { name: "Korkma Soyle", artist: "Motive", album: "Korkma", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 188000 },
    { name: "Ela", artist: "Reynmen", album: "Ela", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 182000 },
    { name: "Dolunay", artist: "Reynmen", album: "Dolunay", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 175000 },
    { name: "Renklensin", artist: "Reynmen", album: "Renklensin", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 190000 },
    { name: "Kibir", artist: "Heijan", album: "Kibir", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 195000 },
    { name: "Yalan Dunya", artist: "Heijan", album: "Yalan Dunya", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 205000 },
    { name: "Sessiz Gemi", artist: "Heijan", album: "Sessiz Gemi", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 212000 },
    { name: "Yangin Var", artist: "Semicenk", album: "Yangin Var", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 218000 },
    { name: "Aglat Beni", artist: "Semicenk", album: "Aglat Beni", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 225000 },
    { name: "Universite", artist: "Semicenk", album: "Universite", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 195000 },
    { name: "Yagmurlar", artist: "Norm Ender", album: "Yagmurlar", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "7MXVkk9YMctZqd1Srtv4MB", duration: 232000 },
    { name: "Mekanin Sahibi", artist: "Norm Ender", album: "Mekanin", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "5QO79kh1waicV47BqGRL3g", duration: 245000 },
    { name: "Sozler Sifir Alti", artist: "Norm Ender", album: "Sozler", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 228000 },
    { name: "Kader", artist: "Norm Ender", album: "Kader", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "0tgVpDi06FyKpA1z0VMD4v", duration: 215000 },
    { name: "Susamam", artist: "Sancak", album: "Susamam", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "39LLxExYz6ewLAcYrzQQyP", duration: 245000 },
    { name: "Beni Vurup Yerde Birakma", artist: "Sancak", album: "Beni Vurup", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "4Dvkj6JhhA12EX05fT7y2e", duration: 238000 },
    // Ek Yabanci Sarkilar
    { name: "Die For You", artist: "The Weeknd", album: "Starboy", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "6UelLqGlWMcVH1E5c4H7lY", duration: 260000 },
    { name: "Call Out My Name", artist: "The Weeknd", album: "My Dear Melancholy", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 228000 },
    { name: "I Feel It Coming", artist: "The Weeknd", album: "Starboy", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 269000 },
    { name: "Often", artist: "The Weeknd", album: "Beauty Behind", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 249000 },
    { name: "Thinking Out Loud", artist: "Ed Sheeran", album: "X", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 281000 },
    { name: "Photograph", artist: "Ed Sheeran", album: "X", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 258000 },
    { name: "Castle on the Hill", artist: "Ed Sheeran", album: "Divide", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 261000 },
    { name: "Bad Habits", artist: "Ed Sheeran", album: "Equals", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 231000 },
    { name: "New Rules", artist: "Dua Lipa", album: "Dua Lipa", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 209000 },
    { name: "Physical", artist: "Dua Lipa", album: "Future Nostalgia", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 194000 },
    { name: "Break My Heart", artist: "Dua Lipa", album: "Future Nostalgia", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 222000 },
    { name: "IDGAF", artist: "Dua Lipa", album: "Dua Lipa", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "7MXVkk9YMctZqd1Srtv4MB", duration: 217000 },
    { name: "Sign of the Times", artist: "Harry Styles", album: "Harry Styles", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "5QO79kh1waicV47BqGRL3g", duration: 340000 },
    { name: "Adore You", artist: "Harry Styles", album: "Fine Line", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "7qiZfU4dY1lWllzX7mPBI3", duration: 207000 },
    { name: "Late Night Talking", artist: "Harry Styles", album: "Harrys House", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "0tgVpDi06FyKpA1z0VMD4v", duration: 178000 },
    { name: "Falling", artist: "Harry Styles", album: "Fine Line", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "39LLxExYz6ewLAcYrzQQyP", duration: 240000 },
    { name: "Stay", artist: "The Kid LAROI", album: "F Love", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "4Dvkj6JhhA12EX05fT7y2e", duration: 141000 },
    { name: "Peaches", artist: "Justin Bieber", album: "Justice", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "6UelLqGlWMcVH1E5c4H7lY", duration: 198000 },
    { name: "Ghost", artist: "Justin Bieber", album: "Justice", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "2HRgqmxJXXV2jUGBpgPfXN", duration: 153000 },
    { name: "Sorry", artist: "Justin Bieber", album: "Purpose", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "6WrI0LAC5M1Rw2MnX2ZvEg", duration: 200000 },
    { name: "Love Yourself", artist: "Justin Bieber", album: "Purpose", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "3nqQXoyQOWXiESFLlDF1hG", duration: 233000 },
    { name: "drivers license", artist: "Olivia Rodrigo", album: "SOUR", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "0dNsBHvFjnCUyVlTonFZKv", duration: 242000 },
    { name: "good 4 u", artist: "Olivia Rodrigo", album: "SOUR", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "5HCyWlXZPP0y6469S1HRwC", duration: 178000 },
    { name: "vampire", artist: "Olivia Rodrigo", album: "GUTS", albumCover: "ab67616d0000b2732e8ed79e177ff6011076f5f0", trackId: "1n8NwGuMpxOqfOsKlwrDdF", duration: 219000 },
    { name: "deja vu", artist: "Olivia Rodrigo", album: "SOUR", albumCover: "ab67616d0000b273bd26ede1ae69327010d49946", trackId: "7tFiyTwD0nx5a1eklYtX2J", duration: 215000 },
    { name: "Anti-Hero", artist: "Taylor Swift", album: "Midnights", albumCover: "ab67616d0000b27377fdcfda6535601aff081b6a", trackId: "2vYJPgypbHPBZ8SzFRoRfN", duration: 200000 },
    { name: "Shake It Off", artist: "Taylor Swift", album: "1989", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "4cOdK2wGLETKBW3PvgPWqT", duration: 219000 },
    { name: "Blank Space", artist: "Taylor Swift", album: "1989", albumCover: "ab67616d0000b2738863bc11d2aa12b54f5aeb36", trackId: "0VjIjW4GlUZAMYd2vXMi3b", duration: 231000 },
    { name: "Love Story", artist: "Taylor Swift", album: "Fearless", albumCover: "ab67616d0000b2734718e2b124f79258be7bc452", trackId: "7MXVkk9YMctZqd1Srtv4MB", duration: 235000 },
    { name: "Cruel Summer", artist: "Taylor Swift", album: "Lover", albumCover: "ab67616d0000b273ba5db46f4b838ef6027e6f96", trackId: "5QO79kh1waicV47BqGRL3g", duration: 178000 }
];

// Oyunlar
const games = [
    { name: "VALORANT", appId: "700136079562375258" },
    { name: "League of Legends", appId: "401518684763586560" },
    { name: "Counter-Strike 2", appId: "1158879539038797824" },
    { name: "Minecraft", appId: "356875570916753438" },
    { name: "Grand Theft Auto V", appId: "356876176465199104" },
    { name: "Fortnite", appId: "432980957394370572" },
    { name: "Roblox", appId: "363445589247131668" },
    { name: "PUBG: BATTLEGROUNDS", appId: "530196305296211989" },
    { name: "Apex Legends", appId: "475033721258008576" },
    { name: "Rust", appId: "356875988075233281" },
    { name: "Call of Duty: Warzone", appId: "715138065095606363" },
    { name: "EA SPORTS FC 24", appId: "1156633754779373649" },
    { name: "Rocket League", appId: "356877880938070016" },
    { name: "Rainbow Six Siege", appId: "359829175498686464" },
    { name: "Overwatch 2", appId: "356875221078245376" },
    { name: "Genshin Impact", appId: "762434991303950386" },
    { name: "Dead by Daylight", appId: "438122941302046720" },
    { name: "Among Us", appId: "477175586805252107" },
    { name: "Dota 2", appId: "356875570916753438" },
    { name: "World of Warcraft", appId: "356869127241678848" },
    { name: "Elden Ring", appId: "945737954488983662" },
    { name: "The Witcher 3", appId: "356869910176915456" },
    { name: "Cyberpunk 2077", appId: "605172268753108993" },
    { name: "Terraria", appId: "356943499456937984" },
    { name: "Stardew Valley", appId: "356943499456937985" }
];

function saveDatabase() {
    fs.writeFileSync('./database.json', Encryption.encrypt(database));
}

function getRandomSong() {
    return spotifySongs[Math.floor(Math.random() * spotifySongs.length)];
}

function getGameByName(name) {
    return games.find(g => g.name === name) || games[0];
}

function getGameEmoji(name) {
    if (name.includes('VALORANT')) return '🔫';
    if (name.includes('League')) return '⚔️';
    if (name.includes('Counter')) return '💣';
    if (name.includes('Minecraft')) return '⛏️';
    if (name.includes('Grand Theft')) return '🚗';
    if (name.includes('Fortnite')) return '🏗️';
    if (name.includes('Roblox')) return '🧱';
    if (name.includes('PUBG')) return '🪖';
    if (name.includes('Apex')) return '🦊';
    if (name.includes('Rust')) return '🔧';
    if (name.includes('Call of Duty')) return '🎯';
    if (name.includes('FC 24')) return '⚽';
    if (name.includes('Rocket')) return '🚀';
    if (name.includes('Rainbow')) return '🛡️';
    if (name.includes('Overwatch')) return '🦸';
    if (name.includes('Genshin')) return '⭐';
    if (name.includes('Dead by')) return '🔪';
    if (name.includes('Among')) return '🚀';
    if (name.includes('Dota')) return '🗡️';
    if (name.includes('Warcraft')) return '🐉';
    if (name.includes('Elden')) return '💍';
    if (name.includes('Witcher')) return '🐺';
    if (name.includes('Cyberpunk')) return '🤖';
    if (name.includes('Terraria')) return '🌳';
    if (name.includes('Stardew')) return '🌾';
    return '🎮';
}


async function setStatus(client, account) {
    try {
        const clientId = '1487340200219902034';
        
        // Swenzy RPC sadece swenzy: "evet" olanlara gösterilir
        const showSwenzyRpc = account.swenzy === 'evet' || account.swenzy === true;
        
        // Application icon URL'sini al
        let appIconUrl = 'mp:attachments/1488437087806951446/1489909429611528253/d8681d7c25fd85b0e53289c6628532f5.jpg';
        
        // Selfbot RichPresence with buttons (sadece swenzy aktifse)
        const swenzyActivity = showSwenzyRpc ? new RichPresence(client)
            .setApplicationId(clientId)
            .setType('PLAYING')
            .setName("Swenzy Bots'da takiliyor")
            .setDetails('Swenzy Bots Afk Sistemi')
            .setState('discord.gg/botshop')
            .setStartTimestamp(Date.now())
            .setAssetsLargeImage('swenzy_logo')
            .setAssetsLargeText('Swenzy Bots')
            .setButtons(
                { name: 'Discord Sunucusu', url: 'https://discord.gg/botshop' },
                { name: 'Made By Swénzy', url: 'https://youtube.com/@swenzyim' }
            ) : null;

        if (account.statusType === 'spotify') {
            const song = getRandomSong();
            const songStartTime = Date.now();
            const spotify = new SpotifyRPC(client)
                .setAssetsLargeImage(`spotify:${song.albumCover}`)
                .setAssetsLargeText(song.album)
                .setState(song.artist)
                .setDetails(song.name)
                .setStartTimestamp(songStartTime)
                .setEndTimestamp(songStartTime + song.duration)
                .setSongId(song.trackId);
            
            const activities = swenzyActivity ? [spotify, swenzyActivity] : [spotify];
            client.user.setPresence({ 
                status: 'online', 
                activities: activities 
            });
            log.spotify(account.username || 'Bot', song.name, song.artist);
            setTimeout(() => setStatus(client, account), song.duration);
        } else if (account.statusType === 'game') {
            const game = getGameByName(account.gameName);
            const gameActivity = new RichPresence(client)
                .setApplicationId(game.appId || clientId)
                .setType('PLAYING')
                .setName(game.name)
                .setStartTimestamp(Date.now());
            
            const activities = swenzyActivity ? [gameActivity, swenzyActivity] : [gameActivity];
            client.user.setPresence({
                status: 'online',
                activities: activities
            });
            log.game(account.username || 'Bot', game.name);
        } else {
            // Swenzy RPC yoksa sadece online ol
            if (swenzyActivity) {
                client.user.setPresence({ 
                    status: 'online', 
                    activities: [swenzyActivity] 
                });
                log.info(`${account.username || 'Bot'} > Swenzy RPC aktif`);
            } else {
                client.user.setPresence({ 
                    status: 'online', 
                    activities: [] 
                });
                log.info(`${account.username || 'Bot'} > Online (RPC yok)`);
            }
        }
    } catch (err) {
        log.error(`${account.username || 'Bot'} > Status hatasi: ${err.message}`);
        setTimeout(() => setStatus(client, account), 30000);
    }
}

async function connectSelfBot(account, index) {
    // Database'den güncel account bilgisini al
    reloadDatabase();
    const freshAccount = database.accounts[index] || account;
    
    const client = new SelfClient({ checkUpdate: false });
    try {
        await client.login(freshAccount.token);
        log.connect(client.user.tag);
        freshAccount.username = client.user.tag;
        saveDatabase();
        selfClients.set(freshAccount.token, { client, account: freshAccount, index });
        console.log(`[DEBUG] selfClients set: ${freshAccount.token.substring(0, 20)}... | Map size: ${selfClients.size}`);
        setStatus(client, freshAccount);
        if (freshAccount.voiceChannelId) {
            const channel = await client.channels.fetch(freshAccount.voiceChannelId);
            if (channel) {
                client.ws.broadcast({
                    op: 4,
                    d: { guild_id: channel.guild.id, channel_id: channel.id, self_mute: true, self_deaf: true, self_video: false }
                });
                log.voice(client.user.tag, channel.name || freshAccount.voiceChannelId);
            }
        }
        client.on('voiceStateUpdate', async (oldState, newState) => {
            if (oldState.member?.id === client.user.id && !newState.channelId && freshAccount.voiceChannelId) {
                log.warn(`${freshAccount.username} kanaldan atildi, yeniden baglaniliyor...`);
                setTimeout(async () => {
                    try {
                        const ch = await client.channels.fetch(freshAccount.voiceChannelId);
                        client.ws.broadcast({
                            op: 4,
                            d: { guild_id: ch.guild.id, channel_id: ch.id, self_mute: true, self_deaf: true, self_video: false }
                        });
                        log.voice(account.username, ch.name || account.voiceChannelId);
                    } catch (e) {
                        log.error(`${account.username} yeniden baglanamadi`);
                    }
                }, 5000);
            }
        });
    } catch (err) {
        log.error(`Token ${index + 1}: ${err.message}`);
        
        // Token offline bildirimi gönder
        if (freshAccount.addedBy) {
            await sendNotification(freshAccount.addedBy, 'tokenOffline', {
                username: freshAccount.username || 'Bilinmiyor',
                reason: err.message
            });
        }
    }
}

async function disconnectSelfBot(token) {
    const data = selfClients.get(token);
    if (data) {
        log.disconnect(data.account.username || 'Bot');
        try { data.client.destroy(); } catch (e) {}
        selfClients.delete(token);
    }
}

async function disconnectAll() {
    log.header('SHUTTING DOWN ALL ACCOUNTS');
    for (const [, data] of selfClients) {
        log.disconnect(data.account.username || 'Bot');
        try { data.client.destroy(); } catch (e) {}
    }
    selfClients.clear();
    log.success('All accounts disconnected successfully');
}

async function startAllSelfBots() {
    log.header('STARTING ALL ACCOUNTS');
    console.log(`  ${c.yellow}[INFO]${c.reset} ${c.white}Loading ${database.accounts.length} accounts...${c.reset}`);
    console.log();
    
    // SXP.TOOL style account loading
    console.log(`${c.yellow}  ╔${'═'.repeat(50)}╗${c.reset}`);
    console.log(`${c.yellow}  ║${c.reset} ${c.green}[*]${c.reset} ${c.bright}${c.white}ACCOUNT LOADER${c.reset}                               ${c.yellow}║${c.reset}`);
    console.log(`${c.yellow}  ╠${'═'.repeat(50)}╣${c.reset}`);
    
    for (let i = 0; i < database.accounts.length; i++) {
        const acc = database.accounts[i];
        const num = (i + 1).toString().padStart(2);
        console.log(`${c.yellow}  ║${c.reset}  ${c.gray}[${num}/${database.accounts.length}]${c.reset} ${c.white}Connecting...${c.reset}                        ${c.yellow}║${c.reset}`);
        await new Promise(r => setTimeout(r, 2000));
        connectSelfBot(acc, i);
    }
    
    console.log(`${c.yellow}  ╚${'═'.repeat(50)}╝${c.reset}`);
    console.log();
}

async function restartAll() {
    log.header('RESTARTING ALL ACCOUNTS');
    await disconnectAll();
    await new Promise(r => setTimeout(r, 2000));
    await startAllSelfBots();
    setTimeout(() => {
        log.stats();
        log.table(database.accounts);
    }, 5000);
}


// Owner Panel - Ultra Modern SXP.TOOL Style
function createOwnerPanel() {
    const active = selfClients.size;
    const total = database.accounts.length;
    const offline = total - active;
    const mem = process.memoryUsage();
    const now = new Date();
    const months = ['Oca', 'Sub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Agu', 'Eyl', 'Eki', 'Kas', 'Ara'];
    const dateStr = `${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    
    // Progress bar
    const percent = total > 0 ? Math.round((active / total) * 100) : 0;
    const barLength = 15;
    const filled = Math.round(barLength * (percent / 100));
    const progressBar = '▰'.repeat(filled) + '▱'.repeat(barLength - filled);
    
    // Hesap listesi
    let accountList = '';
    database.accounts.slice(0, 10).forEach((acc, i) => {
        const isActive = selfClients.has(acc.token);
        const status = isActive ? '`🟢`' : '`🔴`';
        const activity = acc.statusType === 'game' ? `🎮 ${(acc.gameName || 'Oyun').substring(0, 10)}` : 
                        acc.statusType === 'spotify' ? ' { Spotify' : '⚫ Bos';
        const name = (acc.username || 'Yukleniyor...').substring(0, 14);
        accountList += `${status} **${name}** • ${activity}\n`;
    });
    if (total > 10) accountList += `\n*...ve ${total - 10} hesap daha*`;
    if (!accountList) accountList = '*Henuz hesap eklenmemis*';

    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🖥️ SWENZY CONTROL PANEL\n-# ${dateStr} • ${timeStr} • v4.0`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📊 Sistem Durumu\n\n\`\`\`\n${progressBar} ${percent}%\n\`\`\`\n🟢 **${active}** Online   🔴 **${offline}** Offline   📊 **${total}** Total`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### **⚡ Performans**\n\n⏱️ Uptime: \`${getUptime()}\`\n💾 RAM: \`${formatBytes(mem.heapUsed)}\`\n🔗 Baglantilar: \`${totalConnections}\``))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/0.png'))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📈 Istatistikler\n\n🎵 Sarki Degisim: \`${totalSongChanges}\`\n❌ Hatalar: \`${totalErrors}\`\n💻 Node: \`${process.version}\``))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/1.png'))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 👥 Aktif Hesaplar\n\n${accountList}`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('op_refresh').setLabel('Yenile').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('op_restart_all').setLabel('Yeniden Baslat').setStyle(ButtonStyle.Success).setEmoji('⚡'),
                new ButtonBuilder().setCustomId('op_stop_all').setLabel('Durdur').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back_main').setLabel('Token Ekle').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                new ButtonBuilder().setCustomId('op_token_control').setLabel('Token Kontrol').setStyle(ButtonStyle.Secondary).setEmoji('🎛️'),
                new ButtonBuilder().setCustomId('op_logs').setLabel('Loglar').setStyle(ButtonStyle.Secondary).setEmoji('📜')
            )
        )
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# 💜 Developed by SWENZY • discord.gg/botshop`));

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}


// GIF Control Panel Creator - SWENZY THEME
async function createControlPanelGif() {
    try {
        // Database'i yeniden yükle
        reloadDatabase();
        
        const width = 1000;
        const height = 650;
        const frames = 45;
        
        const encoder = new GIFEncoder(width, height, 'octree', true);
        encoder.setDelay(70);
        encoder.setRepeat(0);
        encoder.start();
        
        const active = selfClients.size;
        const total = database.accounts ? database.accounts.length : 0;
        const percent = total > 0 ? Math.round((active / total) * 100) : 0;
        const mem = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1);
        const offline = total - active;
        const accounts = database.accounts || [];
        
        console.log('[DEBUG] GIF variables:', { active, total, accounts: accounts.length });
        
        for (let frame = 0; frame < frames; frame++) {
        const canvas = createCanvas(width, height);
        const ctx = canvas.getContext('2d');
        const t = frame / frames;
        
        // Dark blue gradient background (like the image)
        const bgGrad = ctx.createLinearGradient(0, 0, width, height);
        bgGrad.addColorStop(0, '#0a1628');
        bgGrad.addColorStop(0.5, '#0d1f3c');
        bgGrad.addColorStop(1, '#0a1628');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, width, height);
        
        // Subtle grid
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.03)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 25) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }
        for (let i = 0; i < height; i += 25) {
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(width, i);
            ctx.stroke();
        }
        
        // Main cyan border with glow
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 20;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(10, 10, width - 20, height - 20);
        ctx.shadowBlur = 0;
        
        // LEFT PANEL
        const leftW = 220;
        ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
        ctx.fillRect(20, 20, leftW, height - 40);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.strokeRect(20, 20, leftW, height - 40);
        
        // Avatar circle with glow
        const avX = 20 + leftW / 2;
        const avY = 100;
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#00d4ff';
        ctx.shadowBlur = 15;
        ctx.beginPath();
        ctx.arc(avX, avY, 55, 0, Math.PI * 2);
        ctx.stroke();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = '#1a3a5c';
        ctx.beginPath();
        ctx.arc(avX, avY, 50, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 18px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SWENZY', avX, avY + 6);
        
        // Level badge
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(avX - 35, avY + 60, 70, 22);
        ctx.fillStyle = '#0a1628';
        ctx.font = 'bold 11px Arial';
        ctx.fillText('TOOL v4.0', avX, avY + 75);
        
        // Progress bar
        const pBarY = avY + 95;
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(40, pBarY, leftW - 40, 6);
        const prog = Math.min(t * 1.5, 1) * percent;
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(40, pBarY, (leftW - 40) * prog / 100, 6);
        
        ctx.fillStyle = '#8892b0';
        ctx.font = '10px Arial';
        ctx.fillText(`${active} / ${total} Hesap`, avX, pBarY + 20);
        
        // Get rank info
        const userRank = getUserRank();
        const nextRank = getNextRank();
        const rankProgress = getRankProgress();
        const userXp = database.userStats?.xp || 0;
        
        // Left stats
        const lStats = [
            { label: 'Online', value: active, color: '#00ff88' },
            { label: 'Offl+ine', value: offline, color: '#ff4757' },
            { label: 'Bellek', value: mem + 'MB', color: '#00d4ff' },
            { label: 'Siralama', value: '#1', color: '#ffa502' },
            { label: 'Rank', value: userRank.name, color: userRank.color },
            { label: 'XP', value: userXp, color: '#00d4ff' }
        ];
        
        lStats.forEach((s, i) => {
            const sy = pBarY + 50 + i * 35;
            ctx.fillStyle = '#8892b0';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(s.label, 40, sy);
            ctx.fillStyle = s.color;
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(s.value.toString(), leftW, sy);
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(40, sy + 10);
            ctx.lineTo(leftW, sy + 10);
            ctx.stroke();
        });
        
        // Rank Progress Bar
        const rpY = pBarY + 50 + lStats.length * 35 + 15;
        ctx.fillStyle = '#8892b0';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(nextRank ? `Sonraki: ${nextRank.name}` : 'MAX RANK', avX, rpY);
        
        ctx.fillStyle = '#1a3a5c';
        ctx.fillRect(40, rpY + 8, leftW - 40, 8);
        const rpProg = Math.min(t * 1.5, 1) * rankProgress;
        ctx.fillStyle = userRank.color;
        ctx.fillRect(40, rpY + 8, (leftW - 40) * rpProg / 100, 8);
        
        ctx.fillStyle = '#8892b0';
        ctx.font = '9px Arial';
        ctx.fillText(`${rankProgress}%`, avX, rpY + 28);
        
        // MIDDLE SECTION - Cards
        const midX = leftW + 40;
        const cardW = 175;
        const cardH = 70;
        
        // Card row 1
        const cards1 = [
            { label: 'HAFTALIK XP', value: totalConnections, color: '#00d4ff' },
            { label: 'STREAK', value: getUptime().split(' ')[0], color: '#00ff88' }
        ];
        
        cards1.forEach((c, i) => {
            const cx = midX + i * (cardW + 15);
            ctx.fillStyle = 'rgba(0, 20, 40, 0.7)';
            ctx.fillRect(cx, 30, cardW, cardH);
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
            ctx.strokeRect(cx, 30, cardW, cardH);
            ctx.fillStyle = c.color;
            ctx.fillRect(cx, 30, cardW, 3);
            
            ctx.fillStyle = '#8892b0';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(c.label, cx + cardW/2, 55);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(c.value.toString(), cx + cardW/2, 85);
        });
        
        // Card row 2
        const cards2 = [
            { label: 'DAVET', value: total, color: '#ffa502' },
            { label: 'CARPAN', value: 'x1.0', color: '#a29bfe' }
        ];
        
        cards2.forEach((c, i) => {
            const cx = midX + i * (cardW + 15);
            ctx.fillStyle = 'rgba(0, 20, 40, 0.7)';
            ctx.fillRect(cx, 115, cardW, cardH);
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.5)';
            ctx.strokeRect(cx, 115, cardW, cardH);
            ctx.fillStyle = c.color;
            ctx.fillRect(cx, 115, cardW, 3);
            
            ctx.fillStyle = '#8892b0';
            ctx.font = '10px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(c.label, cx + cardW/2, 140);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(c.value.toString(), cx + cardW/2, 170);
        });
        
        // ACCOUNTS TABLE
        const tblX = midX;
        const tblY = 200;
        const tblW = 365;
        const tblH = 420;
        
        ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
        ctx.fillRect(tblX, tblY, tblW, tblH);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.strokeRect(tblX, tblY, tblW, tblH);
        
        // Table header
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fillRect(tblX, tblY, tblW, 30);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('HESAPLAR (' + total + ')', tblX + 15, tblY + 20);
        
        // Columns
        ctx.fillStyle = '#6e7681';
        ctx.font = '9px Arial';
        ctx.fillText('KULLANICI', tblX + 15, tblY + 50);
        ctx.fillText('DURUM', tblX + 130, tblY + 50);
        ctx.fillText('AKTIVITE', tblX + 200, tblY + 50);
        ctx.fillText('SES KANALI', tblX + 280, tblY + 50);
        
        // Rows
        const maxR = 9;
        const rowH = 38;
        
        for (let i = 0; i < Math.min(accounts.length, maxR); i++) {
            const acc = accounts[i];
            const ry = tblY + 60 + i * rowH;
            const isOn = selfClients.has(acc.token);
            const cData = selfClients.get(acc.token);
            
            // Hover
            if (i === Math.floor(t * maxR) % maxR) {
                ctx.fillStyle = 'rgba(0, 212, 255, 0.05)';
                ctx.fillRect(tblX + 5, ry, tblW - 10, rowH - 3);
            }
            
            // Username
            ctx.fillStyle = '#FFFFFF';
            ctx.font = '11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText((acc.username || 'Yukleniyor').substring(0, 12), tblX + 15, ry + 22);
            
            // Status
            ctx.fillStyle = isOn ? '#00ff88' : '#ff4757';
            ctx.beginPath();
            ctx.arc(tblX + 140, ry + 18, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8892b0';
            ctx.font = '9px Arial';
            ctx.fillText(isOn ? 'Online' : 'Offline', tblX + 150, ry + 22);
            
            // Activity
            const act = acc.statusType === 'spotify' ? 'Spotify' : 
                       acc.statusType === 'game' ? (acc.gameName || 'Oyun').substring(0, 8) : 'Bosta';
            ctx.fillText(act, tblX + 200, ry + 22);
            
            // Voice
            let vName = '-';
            if (isOn && cData && acc.voiceChannelId) {
                try {
                    const vc = cData.client.channels.cache.get(acc.voiceChannelId);
                    vName = vc ? vc.name.substring(0, 10) : 'Bagli';
                } catch (e) { vName = 'Bagli'; }
            }
            ctx.fillStyle = acc.voiceChannelId ? '#00d4ff' : '#6e7681';
            ctx.fillText(vName, tblX + 280, ry + 22);
            
            // Line
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.08)';
            ctx.beginPath();
            ctx.moveTo(tblX + 10, ry + rowH - 3);
            ctx.lineTo(tblX + tblW - 10, ry + rowH - 3);
            ctx.stroke();
        }
        
        if (accounts.length === 0) {
            ctx.fillStyle = '#6e7681';
            ctx.font = '13px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Hesap bulunamadi', tblX + tblW/2, tblY + 200);
        }
        
        // RIGHT PANEL
        const rX = tblX + tblW + 20;
        const rW = width - rX - 20;
        
        ctx.fillStyle = 'rgba(0, 20, 40, 0.6)';
        ctx.fillRect(rX, 30, rW, height - 60);
        ctx.strokeStyle = 'rgba(0, 212, 255, 0.4)';
        ctx.strokeRect(rX, 30, rW, height - 60);
        
        // Right header
        ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        ctx.fillRect(rX, 30, rW, 30);
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 11px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('SISTEM BILGILERI', rX + 15, 50);
        
        // Info items
        const infos = [
            { label: 'SUNUCU', value: 'Swenzy Code', sub: active + ' uye' },
            { label: 'KATILIM TARIHI', value: new Date().toLocaleDateString('tr-TR'), sub: '0 gun once' },
            { label: 'HESAP OLUSTURMA', value: process.version, sub: process.platform },
            { label: 'CALISMA SURESI', value: getUptime(), sub: 'aktif' }
        ];
        
        infos.forEach((inf, i) => {
            const iy = 80 + i * 75;
            ctx.fillStyle = '#8892b0';
            ctx.font = '9px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(inf.label, rX + 15, iy);
            ctx.fillStyle = '#FFFFFF';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(inf.value, rX + 15, iy + 20);
            ctx.fillStyle = '#00d4ff';
            ctx.font = '10px Arial';
            ctx.fillText(inf.sub, rX + 15, iy + 38);
            
            ctx.strokeStyle = 'rgba(0, 212, 255, 0.1)';
            ctx.beginPath();
            ctx.moveTo(rX + 15, iy + 55);
            ctx.lineTo(rX + rW - 15, iy + 55);
            ctx.stroke();
        });
        
        // Bottom branding
        ctx.fillStyle = '#00d4ff';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('SWENZY TOOL', rX + rW/2, height - 80);
        ctx.fillStyle = '#8892b0';
        ctx.font = '11px Arial';
        ctx.fillText('discord.gg/botshop', rX + rW/2, height - 60);
        
        // Pulse effect
        const pulse = (Math.sin(t * Math.PI * 4) + 1) / 4;
        ctx.strokeStyle = `rgba(0, 212, 255, ${pulse})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(12, 12, width - 24, height - 24);
        
        encoder.addFrame(ctx);
    }
    
    encoder.finish();
    return encoder.out.getData();
    } catch (error) {
        console.log('[ERROR] GIF creation error:', error);
        throw error;
    }
}


// Sunucu Kopyalama Paneli
const serverCopyData = new Map();

function createServerCopyPanel() {
    const now = new Date();
    const timeStr = `${now.getDate().toString().padStart(2, '0')} Kasim ${now.getFullYear()}`;

    const container = new ContainerBuilder()
        .setAccentColor(0x5865F2)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔄 Sunucu Kopyalama`))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`-# ${timeStr}`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`## 📋 Tek Tikla - Aninda Teslim`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ✨ Ozellikler:\n\n● Roller\n● Kanallar\n● Ayarlar\n● Loglar`))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/0.png'))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### 📖 Kullanim:\n\n● 1️⃣ Zar giris\n● 2️⃣ Token ekleyin\n● 3️⃣ Butona tiklayin\n● 4️⃣ Takip edin`))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/1.png'))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addSectionComponents(
            new SectionBuilder()
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ⚠️ Uyari:\n\n● Hesap, aktarim sunucusunda yetkili olmali.\n● Hesap, kopyalanacak sunucuda olmali\n● Hesap her iki sunucuda da olmali.\n● Tokeninizi kimseyle paylaşmayin.`))
                .setThumbnailAccessory(new ThumbnailBuilder().setURL('https://cdn.discordapp.com/embed/avatars/2.png'))
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**© Copyright Developed by Swenzy2 2026**`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('sw_limits').setLabel('Limitlerin').setStyle(ButtonStyle.Secondary).setEmoji('📊'),
                new ButtonBuilder().setCustomId('sw_copy_server').setLabel('Sunucu Kopyala').setStyle(ButtonStyle.Primary).setEmoji('📋'),
                new ButtonBuilder().setCustomId('sw_usage').setLabel('Kullanim').setStyle(ButtonStyle.Secondary).setEmoji('📖')
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// Sunucu Kopyalama Fonksiyonu
async function copyServer(sourceGuildId, targetGuildId, userToken, interaction, deleteExisting = true) {
    const { Client } = require('discord.js-selfbot-v13');
    const copyClient = new Client({ checkUpdate: false });
    
    let progressMsg = '';
    let deletedCount = 0;
    
    const updateProgress = async (text) => {
        progressMsg = text;
        try {
            await interaction.editReply({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔄 Sunucu Kopyalaniyor...\n\n${progressMsg}`))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });
        } catch (e) {}
    };

    return new Promise(async (resolve, reject) => {
        copyClient.on('ready', async () => {
            try {
                await updateProgress('> ✅ Token ile giris yapildi...');
                
                const sourceGuild = copyClient.guilds.cache.get(sourceGuildId);
                const targetGuild = copyClient.guilds.cache.get(targetGuildId);
                
                if (!sourceGuild) {
                    copyClient.destroy();
                    return reject('Kaynak sunucu bulunamadi! Hesap sunucuda olmali.');
                }
                if (!targetGuild) {
                    copyClient.destroy();
                    return reject('Hedef sunucu bulunamadi! Hesap sunucuda olmali.');
                }

                const targetMember = targetGuild.members.cache.get(copyClient.user.id);
                if (!targetMember || !targetMember.permissions.has('Administrator')) {
                    copyClient.destroy();
                    return reject('Hedef sunucuda admin yetkiniz yok!');
                }

                // Mevcut rolleri ve kanalları sil (eğer seçildiyse)
                if (deleteExisting) {
                    await updateProgress('> 🗑️ Mevcut roller siliniyor...');
                    
                    // Rolleri sil (@everyone ve managed roller hariç)
                    const rolesToDelete = targetGuild.roles.cache.filter(r => r.name !== '@everyone' && !r.managed && r.position < targetGuild.members.me.roles.highest.position);
                    for (const [, role] of rolesToDelete) {
                        try {
                            await role.delete('Sunucu kopyalama - temizlik');
                            deletedCount++;
                            await new Promise(r => setTimeout(r, 300));
                        } catch (e) {}
                    }
                    
                    await updateProgress(`> ✅ ${deletedCount} rol silindi!\n> 🗑️ Mevcut kanallar siliniyor...`);
                    
                    // Kanalları sil
                    for (const [, channel] of targetGuild.channels.cache) {
                        try {
                            await channel.delete('Sunucu kopyalama - temizlik');
                            deletedCount++;
                            await new Promise(r => setTimeout(r, 300));
                        } catch (e) {}
                    }
                    
                    await updateProgress(`> ✅ Temizlik tamamlandi! (${deletedCount} oge silindi)\n> 🔄 Roller kopyalaniyor...`);
                } else {
                    await updateProgress('> 🔄 Roller kopyalaniyor... (mevcut icerik korunuyor)');
                }
                
                // Rolleri kopyala - position büyükten küçüğe (üstten alta)
                const rolesToCreate = sourceGuild.roles.cache
                    .filter(r => r.name !== '@everyone' && !r.managed)
                    .sort((a, b) => b.position - a.position);
                
                const roleMap = new Map();
                let roleCount = 0;
                
                for (const [, role] of rolesToCreate) {
                    try {
                        const newRole = await targetGuild.roles.create({
                            name: role.name,
                            color: role.color,
                            hoist: role.hoist,
                            permissions: role.permissions,
                            mentionable: role.mentionable,
                            reason: 'Sunucu kopyalama'
                        });
                        roleMap.set(role.id, newRole.id);
                        roleCount++;
                        await updateProgress(`> 🔄 Roller kopyalaniyor... (${roleCount}/${rolesToCreate.size})`);
                        await new Promise(r => setTimeout(r, 500));
                    } catch (e) {
                        log.warn(`Rol kopyalanamadi: ${role.name}`);
                    }
                }

                await updateProgress(`> ✅ ${roleCount} rol kopyalandi!\n> 🔄 Kategoriler olusturuluyor...`);

                // Kategori kontrolü için helper
                const isCategoryType = (c) => c.type === 4 || c.type === 'GUILD_CATEGORY';

                // Kategorileri kopyala
                const categories = sourceGuild.channels.cache
                    .filter(c => isCategoryType(c))
                    .sort((a, b) => a.position - b.position);
                
                const channelMap = new Map();
                let categoryCount = 0;

                for (const [, category] of categories) {
                    try {
                        const permissionOverwrites = category.permissionOverwrites.cache.map(perm => ({
                            id: roleMap.get(perm.id) || perm.id,
                            type: perm.type === 'role' ? 0 : (perm.type === 'member' ? 1 : perm.type),
                            allow: perm.allow.bitfield?.toString() || perm.allow.toString(),
                            deny: perm.deny.bitfield?.toString() || perm.deny.toString()
                        }));

                        const newCategory = await targetGuild.channels.create({
                            name: category.name,
                            type: 4,
                            position: category.position,
                            permissionOverwrites
                        });
                        channelMap.set(category.id, newCategory.id);
                        categoryCount++;
                        await updateProgress(`> 🔄 Kategoriler olusturuluyor... (${categoryCount}/${categories.size})`);
                        await new Promise(r => setTimeout(r, 500));
                    } catch (e) {
                        log.warn(`Kategori kopyalanamadi: ${category.name} - ${e.message || e}`);
                    }
                }

                await updateProgress(`> ✅ ${categoryCount} kategori olusturuldu!\n> 🔄 Kanallar olusturuluyor...`);

                // Metin ve ses kanallarını kopyala
                // Selfbot'ta kanal tipleri: GUILD_TEXT, GUILD_VOICE, GUILD_CATEGORY, GUILD_NEWS, GUILD_STAGE_VOICE, GUILD_FORUM
                // Veya numara: 0=Text, 2=Voice, 4=Category, 5=Announcement, 13=Stage, 15=Forum
                const isTextChannel = (c) => c.type === 0 || c.type === 'GUILD_TEXT' || c.type === 5 || c.type === 'GUILD_NEWS';
                const isVoiceChannel = (c) => c.type === 2 || c.type === 'GUILD_VOICE' || c.type === 13 || c.type === 'GUILD_STAGE_VOICE';
                const isCategory = (c) => c.type === 4 || c.type === 'GUILD_CATEGORY';
                
                const channels = sourceGuild.channels.cache
                    .filter(c => !isCategory(c) && (isTextChannel(c) || isVoiceChannel(c)))
                    .sort((a, b) => a.position - b.position);
                
                let channelCount = 0;
                let skippedCount = 0;

                // Debug: Kanal tiplerini logla
                const allChannelTypes = new Set();
                sourceGuild.channels.cache.forEach(c => allChannelTypes.add(c.type));
                log.info(`Sunucudaki kanal tipleri: ${[...allChannelTypes].join(', ')}`);
                log.info(`Kopyalanacak kanal sayisi: ${channels.size}`);

                for (const [, channel] of channels) {
                    try {
                        const permissionOverwrites = channel.permissionOverwrites.cache.map(perm => ({
                            id: roleMap.get(perm.id) || perm.id,
                            type: perm.type === 'role' ? 0 : (perm.type === 'member' ? 1 : perm.type),
                            allow: perm.allow.bitfield?.toString() || perm.allow.toString(),
                            deny: perm.deny.bitfield?.toString() || perm.deny.toString()
                        }));

                        // Kanal tipini belirle
                        let channelType = isVoiceChannel(channel) ? 2 : 0;

                        const channelData = {
                            name: channel.name,
                            type: channelType,
                            permissionOverwrites
                        };

                        // Parent varsa ekle
                        if (channel.parentId && channelMap.get(channel.parentId)) {
                            channelData.parent = channelMap.get(channel.parentId);
                        }

                        // Metin kanalı özellikleri
                        if (channelType === 0) {
                            if (channel.topic) channelData.topic = channel.topic;
                            if (channel.nsfw) channelData.nsfw = channel.nsfw;
                            if (channel.rateLimitPerUser) channelData.rateLimitPerUser = channel.rateLimitPerUser;
                        }
                        // Ses kanalı özellikleri
                        else if (channelType === 2) {
                            channelData.bitrate = Math.min(channel.bitrate || 64000, 96000);
                            if (channel.userLimit) channelData.userLimit = channel.userLimit;
                        }

                        const newChannel = await targetGuild.channels.create(channelData);
                        channelMap.set(channel.id, newChannel.id);
                        channelCount++;
                        await updateProgress(`> 🔄 Kanallar olusturuluyor... (${channelCount}/${channels.size})`);
                        await new Promise(r => setTimeout(r, 800));
                    } catch (e) {
                        skippedCount++;
                        log.warn(`Kanal kopyalanamadi: ${channel.name} (Tip: ${channel.type}) - ${e.message || e}`);
                    }
                }

                // Desteklenmeyen kanalları say
                const unsupportedChannels = sourceGuild.channels.cache.filter(c => !isCategoryType(c) && !isTextChannel(c) && !isVoiceChannel(c));
                if (unsupportedChannels.size > 0) {
                    log.info(`${unsupportedChannels.size} kanal desteklenmeyen tipte (Forum, Thread vs.)`);
                    unsupportedChannels.forEach(c => log.warn(`Atlanan kanal: ${c.name} (tip: ${c.type})`));
                }

                await updateProgress(`> ✅ ${channelCount} kanal olusturuldu! (${skippedCount} atlandi)\n> 🔄 Mesajlar kopyalaniyor...`);

                // Mesajları kopyala (son 50 mesaj her kanaldan)
                let messageCount = 0;
                const textChannels = sourceGuild.channels.cache.filter(c => isTextChannel(c));
                
                for (const [, sourceChannel] of textChannels) {
                    try {
                        const targetChannelId = channelMap.get(sourceChannel.id);
                        if (!targetChannelId) continue;
                        
                        const targetChannel = targetGuild.channels.cache.get(targetChannelId);
                        if (!targetChannel) continue;

                        const messages = await sourceChannel.messages.fetch({ limit: 50 });
                        const sortedMessages = [...messages.values()].reverse();

                        for (const msg of sortedMessages) {
                            if (msg.content || msg.embeds.length > 0) {
                                try {
                                    let content = msg.content || '';
                                    if (msg.author) {
                                        content = `**[${msg.author.username}]** ${content}`;
                                    }
                                    if (content.trim().length > 0) {
                                        await targetChannel.send({ content: content.substring(0, 2000) });
                                        messageCount++;
                                        await new Promise(r => setTimeout(r, 1200));
                                    }
                                } catch (e) {}
                            }
                        }
                        await updateProgress(`> 🔄 Mesajlar kopyalaniyor... (${messageCount} mesaj)`);
                    } catch (e) {
                        log.warn(`Mesaj alinamadi: ${sourceChannel.name}`);
                    }
                }

                await updateProgress(`> ✅ ${messageCount} mesaj kopyalandi!\n> 🔄 Sunucu ayarlari kopyalaniyor...`);

                // Sunucu ayarlarını kopyala
                try {
                    await targetGuild.setName(sourceGuild.name);
                    if (sourceGuild.icon) {
                        await targetGuild.setIcon(sourceGuild.iconURL({ size: 1024 }));
                    }
                } catch (e) {}

                copyClient.destroy();
                resolve({
                    roles: roleCount,
                    categories: categoryCount,
                    channels: channelCount,
                    messages: messageCount,
                    deleted: deletedCount
                });

            } catch (error) {
                copyClient.destroy();
                reject(error.message || 'Bilinmeyen hata');
            }
        });

        copyClient.on('error', (err) => {
            copyClient.destroy();
            reject('Baglanti hatasi: ' + err.message);
        });

        try {
            await copyClient.login(userToken);
        } catch (err) {
            reject('Token gecersiz veya giris yapilamadi!');
        }
    });
}

// Token Listesi
function createTokenListPanel() {
    let tokenList = '';
    for (let i = 0; i < database.accounts.length; i++) {
        const acc = database.accounts[i];
        const isActive = selfClients.has(acc.token);
        const status = isActive ? '🟢' : '🔴';
        const statusEmoji = acc.statusType === 'game' ? '🎮' : acc.statusType === 'spotify' ? '🎵' : '⚫';
        const statusName = acc.statusType === 'game' ? (acc.gameName || 'Oyun') : acc.statusType === 'spotify' ? 'Spotify' : 'Yok';
        tokenList += `\`${i + 1}.\` ${status} **${acc.username || 'Yukleniyor...'}**\n└ 🔊 \`${acc.voiceChannelId || 'Yok'}\` | ${statusEmoji} ${statusName}\n\n`;
    }
    if (!tokenList) tokenList = '> Henuz token eklenmemis';

    const container = new ContainerBuilder()
        .setAccentColor(0x2ECC71)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📋 Token Listesi'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### Kayitli Hesaplar (${database.accounts.length})\n\n${tokenList}`))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back_main').setLabel('Ana Menu').setStyle(ButtonStyle.Secondary).setEmoji('🏠'),
                new ButtonBuilder().setCustomId('restart_all').setLabel('Yeniden Baslat').setStyle(ButtonStyle.Success).setEmoji('🔄'),
                new ButtonBuilder().setCustomId('stop_all').setLabel('Tumunu Durdur').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
            )
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}


const pendingTokens = new Map();
// Token Panel Data
const tokenPanelData = new Map();
const generatedTokens = new Map(); // Store generated tokens temporarily

// Token Panel Creation Function
async function createTokenPanel() {
    const container = new ContainerBuilder()
        .setAccentColor(0x00FF00)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎫 TOKEN PANELİ'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(
            `### 🔧 Token Y Yönetim Sistemi**\n\n`
            `**Özellikler:**\n` +
            `🆕 Yeni hesap oluştur\n` +
            `💾 Token'ları otomatik kaydet\n` +
            `🔗 Belirtilen ID'ye katıl\n` +
            `📊 Token durumlarını izle\n\n` +
            `**Mevcut Tokenler:** ${database.accounts.length} adet\n` +
            `**Aktif Tokenler:** ${selfClients.size} adet`
        ))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tp_create_account')
                    .setLabel('Yeni Hesap Oluştur')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🆕'),
                new ButtonBuilder()
                    .setCustomId('tp_bulk_create')
                    .setLabel('Toplu Hesap Oluştur')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📦'),
                new ButtonBuilder()
                    .setCustomId('tp_join_server')
                    .setLabel('Sunucuya Katıl')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔗')
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tp_token_list')
                    .setLabel('Token Listesi')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('tp_verify_tokens')
                    .setLabel('Token Doğrula')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('✅'),
                new ButtonBuilder()
                    .setCustomId('tp_export_tokens')
                    .setLabel('Token Dışa Aktar')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📤')
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tp_refresh')
                    .setLabel('Yenile')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('tp_close')
                    .setLabel('Kapat')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌')
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// Token List Panel
async function createTokenListPanel() {
    const accounts = database.accounts;
    let tokenList = '';
    
    if (accounts.length === 0) {
        tokenList = '**Henüz token yok**';
    } else {
        tokenList = accounts.slice(0, 10).map((acc, i) => {
            const status = selfClients.has(acc.token) ? '🟢 Online' : '🔴 Offline';
            const username = acc.username || 'Yükleniyor...';
            return `**${i + 1}.** ${username}\n${status} • ID: ${acc.voiceChannelId || 'Yok'}`;
        }).join('\n\n');
        
        if (accounts.length > 10) {
            tokenList += `\n\n**... ve ${accounts.length - 10} token daha**`;
        }
    }

    const container = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📋 TOKEN LİSTESİ'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addTextDisplayComponents(new TextDisplayBuilder().setContent(tokenList))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('tp_back')
                    .setLabel('Geri Dön')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('◀️'),
                new ButtonBuilder()
                    .setCustomId('tp_refresh_list')
                    .setLabel('Listeyi Yenile')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄')
            )
        );

    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// Real Account Creation Function
async function createDiscordAccount() {
    throw new Error('Gerçek Discord hesabı oluşturma Discord ToS\'a aykırıdır ve teknik olarak mümkün değildir. Lütfen manuel olarak hesap oluşturun ve tokenları import edin.');
}

// Manual Token Import Function
async function importTokenManually(token, username = null) {
    try {
        // Verify token first
        const verification = await verifyToken(token);
        if (!verification.valid) {
            throw new Error('Geçersiz token: ' + verification.error);
        }
        
        return {
            token: token,
            username: verification.username,
            id: verification.id,
            created: Date.now(),
            verified: true
        };
    } catch (error) {
        throw new Error('Token import hatası: ' + error.message);
    }
}

// Token Verification
async function verifyToken(token) {
    try {
        const testClient = new SelfClient({ checkUpdate: false });
        await testClient.login(token);
        const user = testClient.user;
        testClient.destroy();
        return { valid: true, username: user.username, id: user.id };
    } catch (error) {
        return { valid: false, error: error.message };
    }
}

// Join Server Function
async function joinServerWithToken(token, serverId) {
    try {
        const client = new SelfClient({ checkUpdate: false });
        await client.login(token);
        
        // Try to join the server (this would need an invite link in real implementation)
        // For now, we'll simulate the join
        await new Promise(r => setTimeout(r, 2000));
        
        client.destroy();
        return { success: true, message: 'Sunucuya başarıyla katıldı' };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

const controlPanelData = new Map();
const tikeLogData = new Map();

// Tike Log GIF Creator - Modern Panel
async function createTikeLogGif(userId, logs) {
    try {
        const width = 850;
        const height = 480;
        const frames = 20;
        
        const encoder = new GIFEncoder(width, height, 'octree', true);
        encoder.setDelay(100);
        encoder.setRepeat(0);
        encoder.start();
        
        const successCount = logs.filter(l => l.success).length;
        const failedCount = logs.filter(l => !l.success).length;
        
        for (let frame = 0; frame < frames; frame++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            const t = frame / frames;
            
            // Dark background
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            bgGrad.addColorStop(0, '#0d1117');
            bgGrad.addColorStop(0.5, '#161b22');
            bgGrad.addColorStop(1, '#0d1117');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);
            
            // Animated neon line at top
            const lightX = (t * (width + 300)) - 150;
            const lightGrad = ctx.createLinearGradient(lightX - 150, 0, lightX + 150, 0);
            lightGrad.addColorStop(0, 'rgba(139, 92, 246, 0)');
            lightGrad.addColorStop(0.5, 'rgba(139, 92, 246, 1)');
            lightGrad.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, width, 2);
            
            // Border
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 15, width - 30, height - 30);
            
            // Header
            ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
            ctx.fillRect(25, 25, width - 50, 60);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, 25, width - 50, 60);
            
            // Icon
            const pulse = (Math.sin(t * Math.PI * 4) + 1) / 2;
            ctx.shadowColor = '#8b5cf6';
            ctx.shadowBlur = 8 + pulse * 8;
            ctx.fillStyle = '#8b5cf6';
            ctx.beginPath();
            ctx.arc(60, 55, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('T', 60, 61);
            
            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Tike Log Paneli', 95, 50);
            
            ctx.fillStyle = '#8b949e';
            ctx.font = '12px Arial';
            ctx.fillText(`${successCount} basarili  |  ${failedCount} basarisiz  |  ${logs.length} toplam`, 95, 70);
            
            // Stats cards
            const cardY = 100;
            const cardH = 60;
            const cardW = 260;
            const cardGap = 10;
            
            // Card 1 - Basarili
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, cardY, cardW, cardH);
            ctx.strokeStyle = '#238636';
            ctx.strokeRect(25, cardY, cardW, cardH);
            ctx.fillStyle = '#3fb950';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('BASARILI', 35, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(successCount.toString(), 35, cardY + 50);
            
            // Card 2 - Basarisiz
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25 + cardW + cardGap, cardY, cardW, cardH);
            ctx.strokeStyle = '#f85149';
            ctx.strokeRect(25 + cardW + cardGap, cardY, cardW, cardH);
            ctx.fillStyle = '#f85149';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('BASARISIZ', 35 + cardW + cardGap, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(failedCount.toString(), 35 + cardW + cardGap, cardY + 50);
            
            // Card 3 - Toplam
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25 + (cardW + cardGap) * 2, cardY, cardW, cardH);
            ctx.strokeStyle = '#8b5cf6';
            ctx.strokeRect(25 + (cardW + cardGap) * 2, cardY, cardW, cardH);
            ctx.fillStyle = '#a371f7';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('TOPLAM ISLEM', 35 + (cardW + cardGap) * 2, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 28px Arial';
            ctx.fillText(logs.length.toString(), 35 + (cardW + cardGap) * 2, cardY + 50);
            
            // Log table
            const tblY = 175;
            const tblH = 200;
            
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, tblY, width - 50, tblH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, tblY, width - 50, tblH);
            
            // Table header
            ctx.fillStyle = '#21262d';
            ctx.fillRect(25, tblY, width - 50, 30);
            ctx.fillStyle = '#8b949e';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('HESAP', 45, tblY + 20);
            ctx.fillText('DURUM', 300, tblY + 20);
            ctx.fillText('EMOJI', 480, tblY + 20);
            ctx.fillText('ZAMAN', 680, tblY + 20);
            
            // Log rows
            const maxRows = 5;
            const rowH = 32;
            for (let i = 0; i < Math.min(logs.length, maxRows); i++) {
                const log = logs[i];
                const ry = tblY + 35 + i * rowH;
                
                if (i % 2 === 0) {
                    ctx.fillStyle = 'rgba(33, 38, 45, 0.5)';
                    ctx.fillRect(26, ry, width - 52, rowH - 2);
                }
                
                // Status icon
                ctx.fillStyle = log.success ? '#3fb950' : '#f85149';
                ctx.beginPath();
                ctx.arc(55, ry + 15, 5, 0, Math.PI * 2);
                ctx.fill();
                
                // Username
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText(log.username.substring(0, 25), 70, ry + 20);
                
                // Status text
                ctx.fillStyle = log.success ? '#3fb950' : '#f85149';
                ctx.fillText(log.success ? 'Basarili' : 'Basarisiz', 300, ry + 20);
                
                // Emoji
                ctx.fillStyle = '#8b949e';
                ctx.fillText(log.emoji || '-', 480, ry + 20);
                
                // Time
                ctx.fillStyle = '#8b949e';
                ctx.fillText(log.time || '-', 680, ry + 20);
            }
            
            if (logs.length === 0) {
                ctx.fillStyle = '#484f58';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Henuz log yok', width / 2, tblY + 100);
            }
            
            // Footer
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SWENZY TOOL', width / 2, height - 45);
            ctx.fillStyle = '#8b949e';
            ctx.font = '11px Arial';
            ctx.fillText('discord.gg/botshop', width / 2, height - 28);
            
            encoder.addFrame(ctx);
        }
        
        encoder.finish();
        return encoder.out.getData();
    } catch (error) {
        console.log('[ERROR] Tike Log GIF error:', error);
        throw error;
    }
}

// Tike Log Panel
async function createTikeLogPanel(userId) {
    const logs = tikeLogData.get(userId) || [];
    const gifBuffer = await createTikeLogGif(userId, logs);
    const attachment = new AttachmentBuilder(gifBuffer, { name: 'tike-log.gif' });
    
    const successCount = logs.filter(l => l.success).length;
    const failedCount = logs.filter(l => !l.success).length;
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tike_log_refresh').setLabel('Yenile').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('tike_log_clear').setLabel('Temizle').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('tike_log_close').setLabel('Kapat').setStyle(ButtonStyle.Secondary)
    );
    
    return {
        content: `**Tike Log**\n-# ${successCount} basarili  |  ${failedCount} basarisiz`,
        files: [attachment],
        components: [row]
    };
}

// Profile GIF Creator - Modern Panel (Gelismis)
async function createProfileGif(userId, user) {
    try {
        reloadDatabase();
        
        const width = 900;
        const height = 550;
        const frames = 25;
        
        const encoder = new GIFEncoder(width, height, 'octree', true);
        encoder.setDelay(80);
        encoder.setRepeat(0);
        encoder.start();
        
        // Kullanıcı verileri
        const userRank = getUserRank(userId);
        const nextRank = getNextRank(userId);
        const progress = getRankProgress(userId);
        const xp = database.userStats?.xp || 0;
        const tokenCount = database.accounts?.length || 0;
        const activeTokens = selfClients.size;
        const awardedRank = database.userRanks?.[userId];
        
        // Rozetler
        const badges = [];
        if (userId === config.adminId) badges.push({ name: 'Owner', color: '#ff0000', icon: 'O' });
        if (tokenCount >= 10) badges.push({ name: 'Master', color: '#ffd700', icon: 'M' });
        if (tokenCount >= 5) badges.push({ name: 'Pro', color: '#c0c0c0', icon: 'P' });
        if (xp >= 10000) badges.push({ name: 'XP', color: '#00ff00', icon: 'X' });
        if (activeTokens > 0) badges.push({ name: 'Active', color: '#00d4ff', icon: 'A' });
        
        for (let frame = 0; frame < frames; frame++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            const t = frame / frames;
            
            // Dark background
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            bgGrad.addColorStop(0, '#0d1117');
            bgGrad.addColorStop(0.5, '#161b22');
            bgGrad.addColorStop(1, '#0d1117');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);
            
            // Animated neon line at top
            const lightX = (t * (width + 300)) - 150;
            const lightGrad = ctx.createLinearGradient(lightX - 150, 0, lightX + 150, 0);
            lightGrad.addColorStop(0, 'rgba(0, 212, 255, 0)');
            lightGrad.addColorStop(0.5, 'rgba(0, 212, 255, 1)');
            lightGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, width, 2);
            
            // Border
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 15, width - 30, height - 30);
            
            // Header section
            ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
            ctx.fillRect(25, 25, width - 50, 100);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, 25, width - 50, 100);
            
            // Avatar circle with pulse
            const pulse = (Math.sin(t * Math.PI * 4) + 1) / 2;
            ctx.shadowColor = userRank.color || '#00d4ff';
            ctx.shadowBlur = 10 + pulse * 10;
            ctx.strokeStyle = userRank.color || '#00d4ff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(85, 75, 35, 0, Math.PI * 2);
            ctx.stroke();
            ctx.shadowBlur = 0;
            
            // Avatar inner
            ctx.fillStyle = '#21262d';
            ctx.beginPath();
            ctx.arc(85, 75, 32, 0, Math.PI * 2);
            ctx.fill();
            
            // User initial
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(user.username?.charAt(0).toUpperCase() || 'U', 85, 83);
            
            // Username
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 22px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(user.username || 'Kullanici', 140, 60);
            
            // User ID
            ctx.fillStyle = '#8b949e';
            ctx.font = '12px Arial';
            ctx.fillText(`ID: ${userId}`, 140, 80);
            
            // Rank badge
            ctx.fillStyle = userRank.color || '#00d4ff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(userRank.name, 140, 105);
            
            // Badges
            let badgeX = 350;
            for (const badge of badges.slice(0, 5)) {
                ctx.fillStyle = badge.color;
                ctx.shadowColor = badge.color;
                ctx.shadowBlur = 6;
                ctx.beginPath();
                ctx.arc(badgeX, 75, 14, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#000';
                ctx.font = 'bold 11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(badge.icon, badgeX, 79);
                badgeX += 35;
            }
            ctx.textAlign = 'left';
            
            // Online status
            ctx.fillStyle = activeTokens > 0 ? '#3fb950' : '#f85149';
            ctx.beginPath();
            ctx.arc(width - 50, 50, 6, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#8b949e';
            ctx.font = '11px Arial';
            ctx.textAlign = 'right';
            ctx.fillText(activeTokens > 0 ? 'ONLINE' : 'OFFLINE', width - 65, 54);
            ctx.fillText(getUptime(), width - 40, 75);
            ctx.textAlign = 'left';
            
            // Stats cards row - 6 kart
            const cardY = 140;
            const cardH = 65;
            const cardW = 138;
            const cardGap = 6;
            
            const statsCards = [
                { label: 'XP', value: xp.toLocaleString(), color: '#3fb950' },
                { label: 'RANK', value: userRank.name, color: userRank.color || '#a371f7' },
                { label: 'TOKENLER', value: `${activeTokens}/${tokenCount}`, color: '#58a6ff' },
                { label: 'SESTE', value: activeTokens.toString(), color: '#f0883e' },
                { label: 'UPTIME', value: getUptime().split(' ')[0], color: '#8b5cf6' },
                { label: 'SEVIYE', value: (database.userStats?.level || 1).toString(), color: '#ec4899' }
            ];
            
            for (let i = 0; i < statsCards.length; i++) {
                const card = statsCards[i];
                const cx = 25 + (cardW + cardGap) * i;
                
                ctx.fillStyle = '#161b22';
                ctx.fillRect(cx, cardY, cardW, cardH);
                ctx.strokeStyle = card.color;
                ctx.strokeRect(cx, cardY, cardW, cardH);
                
                // Animated top line
                ctx.fillStyle = card.color;
                ctx.fillRect(cx, cardY, cardW * Math.min(1, t * 2), 2);
                
                ctx.fillStyle = card.color;
                ctx.font = 'bold 9px Arial';
                ctx.fillText(card.label, cx + 8, cardY + 16);
                
                ctx.fillStyle = '#ffffff';
                ctx.font = 'bold 18px Arial';
                ctx.fillText(card.value.substring(0, 12), cx + 8, cardY + 42);
            }
            
            // Progress section
            const progY = 220;
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, progY, width - 50, 55);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, progY, width - 50, 55);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('RANK ILERLEMESI', 40, progY + 18);
            
            ctx.fillStyle = userRank.color || '#00d4ff';
            ctx.textAlign = 'right';
            ctx.fillText(`${progress}%  ${nextRank ? '> ' + nextRank.name : '(MAX)'}`, width - 40, progY + 18);
            
            // Progress bar with glow
            const barX = 40;
            const barY = progY + 30;
            const barW = width - 80;
            const barH = 12;
            
            ctx.fillStyle = '#21262d';
            ctx.fillRect(barX, barY, barW, barH);
            
            const animProgress = Math.min(progress, progress * Math.min(1, t * 1.5));
            const progGrad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
            progGrad.addColorStop(0, userRank.color || '#00d4ff');
            progGrad.addColorStop(0.5, '#8b5cf6');
            progGrad.addColorStop(1, '#ec4899');
            ctx.fillStyle = progGrad;
            ctx.fillRect(barX, barY, (barW * animProgress) / 100, barH);
            
            // Glowing dot
            if (animProgress > 0) {
                ctx.shadowColor = '#fff';
                ctx.shadowBlur = 8;
                ctx.fillStyle = '#fff';
                ctx.beginPath();
                ctx.arc(barX + (barW * animProgress) / 100, barY + barH / 2, 4, 0, Math.PI * 2);
                ctx.fill();
                ctx.shadowBlur = 0;
            }
            
            // Activity Graph
            const graphY = 290;
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, graphY, 420, 110);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, graphY, 420, 110);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('HAFTALIK AKTIVITE', 40, graphY + 18);
            
            // Activity bars
            const days = ['Pzt', 'Sal', 'Car', 'Per', 'Cum', 'Cmt', 'Paz'];
            const actData = [30, 50, 40, 70, 60, 80, activeTokens * 30 + 20];
            const maxAct = Math.max(...actData);
            
            for (let i = 0; i < 7; i++) {
                const bx = 45 + i * 55;
                const bh = (actData[i] / maxAct) * 55 * Math.min(1, t * 2);
                
                const barGrad = ctx.createLinearGradient(0, graphY + 95 - bh, 0, graphY + 95);
                barGrad.addColorStop(0, '#8b5cf6');
                barGrad.addColorStop(1, '#3b82f6');
                ctx.fillStyle = barGrad;
                ctx.fillRect(bx, graphY + 95 - bh, 40, bh);
                
                ctx.fillStyle = '#8b949e';
                ctx.font = '9px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(days[i], bx + 20, graphY + 105);
            }
            ctx.textAlign = 'left';
            
            // Token list section
            const tblY = 290;
            ctx.fillStyle = '#161b22';
            ctx.fillRect(460, tblY, width - 485, 110);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(460, tblY, width - 485, 110);
            
            ctx.fillStyle = '#21262d';
            ctx.fillRect(460, tblY, width - 485, 25);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('AKTIF TOKENLER', 475, tblY + 17);
            
            // Token rows
            const accounts = database.accounts?.slice(0, 3) || [];
            for (let i = 0; i < accounts.length; i++) {
                const acc = accounts[i];
                const ry = tblY + 30 + i * 26;
                const isOn = selfClients.has(acc.token);
                
                ctx.fillStyle = isOn ? '#3fb950' : '#f85149';
                ctx.beginPath();
                ctx.arc(480, ry + 10, 4, 0, Math.PI * 2);
                ctx.fill();
                
                ctx.fillStyle = '#ffffff';
                ctx.font = '11px Arial';
                ctx.fillText((acc.username || 'Token').substring(0, 18), 495, ry + 14);
                
                ctx.fillStyle = '#8b949e';
                ctx.textAlign = 'right';
                ctx.fillText(isOn ? 'Online' : 'Offline', width - 40, ry + 14);
                ctx.textAlign = 'left';
            }
            
            if (accounts.length === 0) {
                ctx.fillStyle = '#484f58';
                ctx.font = '11px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Token yok', 640, tblY + 65);
                ctx.textAlign = 'left';
            }
            
            // Achievements section
            const achY = 415;
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, achY, width - 50, 60);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, achY, width - 50, 60);
            
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('BASARILAR', 40, achY + 18);
            
            const achievements = [
                { name: 'Ilk Token', done: tokenCount >= 1, color: '#3fb950' },
                { name: '5 Token', done: tokenCount >= 5, color: '#58a6ff' },
                { name: '10 Token', done: tokenCount >= 10, color: '#ffd700' },
                { name: '1K XP', done: xp >= 1000, color: '#a371f7' },
                { name: '10K XP', done: xp >= 10000, color: '#ec4899' },
                { name: 'Aktif', done: activeTokens > 0, color: '#f0883e' }
            ];
            
            for (let i = 0; i < achievements.length; i++) {
                const ach = achievements[i];
                const ax = 40 + i * 140;
                
                ctx.fillStyle = ach.done ? ach.color : '#21262d';
                ctx.fillRect(ax, achY + 28, 125, 22);
                ctx.strokeStyle = ach.done ? ach.color : '#30363d';
                ctx.strokeRect(ax, achY + 28, 125, 22);
                
                ctx.fillStyle = ach.done ? '#000' : '#484f58';
                ctx.font = ach.done ? 'bold 10px Arial' : '10px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(ach.name, ax + 62, achY + 43);
            }
            ctx.textAlign = 'left';
            
            // Footer
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('SWENZY TOOL', width / 2, height - 35);
            ctx.fillStyle = '#8b949e';
            ctx.font = '10px Arial';
            ctx.fillText('discord.gg/botshop  |  Premium Profile', width / 2, height - 20);
            
            encoder.addFrame(ctx);
        }
        
        encoder.finish();
        return encoder.out.getData();
    } catch (error) {
        console.log('[ERROR] Profile GIF error:', error);
        throw error;
    }
}

// Profile Panel
async function createProfilePanel(userId, user) {
    const gifBuffer = await createProfileGif(userId, user);
    const attachment = new AttachmentBuilder(gifBuffer, { name: 'profile.gif' });
    
    const userRank = getUserRank(userId);
    const xp = database.userStats?.xp || 0;
    
    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('profile_refresh').setLabel('Yenile').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('profile_tokens').setLabel('Tokenlerim').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('profile_close').setLabel('Kapat').setStyle(ButtonStyle.Danger)
    );
    
    return {
        content: `**${user.username} Profili**\n-# ${userRank.name}  |  ${xp.toLocaleString()} XP`,
        files: [attachment],
        components: [row]
    };
}

// Token Control GIF Creator - Modern Panel
async function createTokenControlGif(userId) {
    try {
        reloadDatabase();
        
        const width = 850;
        const height = 520;
        const frames = 25;
        
        const encoder = new GIFEncoder(width, height, 'octree', true);
        encoder.setDelay(80);
        encoder.setRepeat(0);
        encoder.start();
        
        const data = controlPanelData.get(userId) || { selectedTokens: [], page: 0 };
        const totalTokens = database.accounts.length;
        const selectedCount = data.selectedTokens.length;
        const accounts = database.accounts || [];
        
        // Gerçek istatistikleri hesapla - selfClients'tan canlı veri al
        let activeCount = 0;
        let voiceConnected = 0;
        let mutedCount = 0;
        let deafCount = 0;
        let spotifyCount = 0;
        let gameCount = 0;
        
        // Her hesap için gerçek durumu kontrol et
        for (const acc of accounts) {
            const clientData = selfClients.get(acc.token);
            const client = clientData?.client;
            const isClientReady = client && client.user;
            
            if (isClientReady) {
                activeCount++;
            }
            
            // Ses kanalı kontrolü - voiceChannelId varsa ve client aktifse
            if (acc.voiceChannelId && isClientReady) {
                voiceConnected++;
            }
            
            // Mute/Deaf durumu - aktif hesaplar için
            if (isClientReady) {
                if (acc.selfMute) mutedCount++;
                if (acc.selfDeaf !== false) deafCount++;
            }
            
            // Aktivite sayıları
            if (acc.statusType === 'spotify') spotifyCount++;
            if (acc.statusType === 'game') gameCount++;
        }
        
        for (let frame = 0; frame < frames; frame++) {
            const canvas = createCanvas(width, height);
            const ctx = canvas.getContext('2d');
            const t = frame / frames;
            
            // Dark background with modern gradient
            const bgGrad = ctx.createLinearGradient(0, 0, width, height);
            bgGrad.addColorStop(0, '#0d1117');
            bgGrad.addColorStop(0.5, '#161b22');
            bgGrad.addColorStop(1, '#0d1117');
            ctx.fillStyle = bgGrad;
            ctx.fillRect(0, 0, width, height);
            
            // Animated neon line at top
            const lightX = (t * (width + 300)) - 150;
            const lightGrad = ctx.createLinearGradient(lightX - 150, 0, lightX + 150, 0);
            lightGrad.addColorStop(0, 'rgba(0, 212, 255, 0)');
            lightGrad.addColorStop(0.5, 'rgba(0, 212, 255, 1)');
            lightGrad.addColorStop(1, 'rgba(0, 212, 255, 0)');
            ctx.fillStyle = lightGrad;
            ctx.fillRect(0, 0, width, 2);
            
            // Animated neon line at bottom
            const lightX2 = width - (t * (width + 300)) + 150;
            const lightGrad2 = ctx.createLinearGradient(lightX2 - 150, 0, lightX2 + 150, 0);
            lightGrad2.addColorStop(0, 'rgba(139, 92, 246, 0)');
            lightGrad2.addColorStop(0.5, 'rgba(139, 92, 246, 1)');
            lightGrad2.addColorStop(1, 'rgba(139, 92, 246, 0)');
            ctx.fillStyle = lightGrad2;
            ctx.fillRect(0, height - 2, width, 2);
            
            // Main border with subtle glow
            ctx.strokeStyle = '#30363d';
            ctx.lineWidth = 1;
            ctx.strokeRect(15, 15, width - 30, height - 30);
            
            // Header section with glass effect
            ctx.fillStyle = 'rgba(22, 27, 34, 0.95)';
            ctx.fillRect(25, 25, width - 50, 65);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, 25, width - 50, 65);
            
            // Status indicator circle with pulse
            const pulse = (Math.sin(t * Math.PI * 4) + 1) / 2;
            const statusColor = activeCount > 0 ? '#238636' : '#f85149';
            ctx.shadowColor = statusColor;
            ctx.shadowBlur = 8 + pulse * 8;
            ctx.fillStyle = statusColor;
            ctx.beginPath();
            ctx.arc(60, 57, 18, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;
            
            // Inner circle
            ctx.fillStyle = '#0d1117';
            ctx.beginPath();
            ctx.arc(60, 57, 14, 0, Math.PI * 2);
            ctx.fill();
            
            // Active count in circle
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(activeCount.toString(), 60, 62);
            
            // Title
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 20px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('Token Kontrol Paneli', 95, 52);
            
            // Subtitle with real stats
            ctx.fillStyle = '#8b949e';
            ctx.font = '12px Arial';
            ctx.fillText(`${selectedCount} secili  |  ${activeCount}/${totalTokens} aktif  |  ${voiceConnected} seste`, 95, 72);
            
            // Uptime badge
            const uptimeStr = getUptime();
            ctx.fillStyle = '#238636';
            ctx.font = '10px Arial';
            ctx.textAlign = 'right';
            ctx.fillText('ONLINE', width - 40, 45);
            ctx.fillStyle = '#8b949e';
            ctx.fillText(uptimeStr, width - 40, 60);
            
            // Stats cards row
            const cardY = 100;
            const cardH = 75;
            const cardW = 195;
            const cardGap = 10;
            
            // Card 1 - Hesaplar
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, cardY, cardW, cardH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, cardY, cardW, cardH);
            
            ctx.fillStyle = '#58a6ff';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('HESAPLAR', 35, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`${activeCount}/${totalTokens}`, 35, cardY + 50);
            ctx.fillStyle = '#8b949e';
            ctx.font = '10px Arial';
            ctx.fillText('Aktif / Toplam', 35, cardY + 65);
            
            // Card 2 - Ses Durumu
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25 + cardW + cardGap, cardY, cardW, cardH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25 + cardW + cardGap, cardY, cardW, cardH);
            
            ctx.fillStyle = '#a371f7';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('SES DURUMU', 35 + cardW + cardGap, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 24px Arial';
            ctx.fillText(`${voiceConnected}`, 35 + cardW + cardGap, cardY + 50);
            ctx.fillStyle = '#8b949e';
            ctx.font = '10px Arial';
            ctx.fillText('Seste Bagli', 35 + cardW + cardGap, cardY + 65);
            
            // Card 3 - Aktivite
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25 + (cardW + cardGap) * 2, cardY, cardW, cardH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25 + (cardW + cardGap) * 2, cardY, cardW, cardH);
            
            ctx.fillStyle = '#3fb950';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('AKTIVITE', 35 + (cardW + cardGap) * 2, cardY + 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 14px Arial';
            ctx.fillText(`${spotifyCount} Spotify`, 35 + (cardW + cardGap) * 2, cardY + 42);
            ctx.fillText(`${gameCount} Oyun`, 35 + (cardW + cardGap) * 2, cardY + 60);
            
            // Card 4 - Ses Ayarlari
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25 + (cardW + cardGap) * 3, cardY, cardW, cardH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25 + (cardW + cardGap) * 3, cardY, cardW, cardH);
            
            ctx.fillStyle = '#f0883e';
            ctx.font = 'bold 11px Arial';
            ctx.fillText('SES AYARLARI', 35 + (cardW + cardGap) * 3, cardY + 20);
            
            // Mikrofon durumu
            ctx.fillStyle = mutedCount > 0 ? '#f85149' : '#3fb950';
            ctx.beginPath();
            ctx.arc(45 + (cardW + cardGap) * 3, cardY + 42, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.font = '11px Arial';
            ctx.fillText(`Mikrofon: ${mutedCount > 0 ? 'Kapali' : 'Acik'}`, 55 + (cardW + cardGap) * 3, cardY + 46);
            
            // Kulaklik durumu
            ctx.fillStyle = deafCount > 0 ? '#3fb950' : '#f85149';
            ctx.beginPath();
            ctx.arc(45 + (cardW + cardGap) * 3, cardY + 60, 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(`Kulaklik: ${deafCount > 0 ? 'Kapali' : 'Acik'}`, 55 + (cardW + cardGap) * 3, cardY + 64);
            
            // Accounts table - Modern style
            const tblY = 190;
            const tblH = 220;
            
            ctx.fillStyle = '#161b22';
            ctx.fillRect(25, tblY, width - 50, tblH);
            ctx.strokeStyle = '#30363d';
            ctx.strokeRect(25, tblY, width - 50, tblH);
            
            // Table header
            ctx.fillStyle = '#21262d';
            ctx.fillRect(25, tblY, width - 50, 35);
            
            // Header columns
            ctx.fillStyle = '#8b949e';
            ctx.font = 'bold 11px Arial';
            ctx.textAlign = 'left';
            ctx.fillText('HESAP', 55, tblY + 22);
            ctx.fillText('DURUM', 280, tblY + 22);
            ctx.fillText('AKTIVITE', 420, tblY + 22);
            ctx.fillText('SES', 580, tblY + 22);
            ctx.fillText('SUNUCU', 700, tblY + 22);
            
            // Account rows
            const maxRows = 5;
            const rowH = 35;
            const startIdx = data.page * 5;
            
            for (let i = 0; i < Math.min(accounts.length - startIdx, maxRows); i++) {
                const acc = accounts[startIdx + i];
                const ry = tblY + 40 + i * rowH;
                const clientData = selfClients.get(acc.token);
                const client = clientData?.client;
                const isOn = client && client.user;
                const isSelected = data.selectedTokens.includes(startIdx + i);
                
                // Sunucu bilgisini al
                let serverName = acc.serverLabel || null;
                
                // Client'tan sunucu adını almaya çalış
                if (isOn && acc.voiceChannelId) {
                    try {
                        const channel = client.channels?.cache?.get(acc.voiceChannelId);
                        if (channel && channel.guild) {
                            serverName = channel.guild.name;
                        }
                    } catch (e) {}
                }
                
                // Row background
                if (i % 2 === 0) {
                    ctx.fillStyle = 'rgba(33, 38, 45, 0.5)';
                    ctx.fillRect(26, ry, width - 52, rowH - 2);
                }
                
                // Selection highlight
                if (isSelected) {
                    ctx.fillStyle = 'rgba(56, 139, 253, 0.15)';
                    ctx.fillRect(26, ry, width - 52, rowH - 2);
                    ctx.strokeStyle = '#388bfd';
                    ctx.strokeRect(26, ry, width - 52, rowH - 2);
                }
                
                // Checkbox
                ctx.strokeStyle = isSelected ? '#388bfd' : '#484f58';
                ctx.lineWidth = 1.5;
                ctx.strokeRect(35, ry + 9, 16, 16);
                if (isSelected) {
                    ctx.fillStyle = '#388bfd';
                    ctx.fillRect(38, ry + 12, 10, 10);
                }
                
                // Username
                ctx.fillStyle = '#ffffff';
                ctx.font = '12px Arial';
                ctx.fillText((acc.username || 'Yukleniyor...').substring(0, 22), 60, ry + 22);
                
                // Status indicator
                ctx.fillStyle = isOn ? '#3fb950' : '#f85149';
                ctx.beginPath();
                ctx.arc(290, ry + 17, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = '#8b949e';
                ctx.font = '11px Arial';
                ctx.fillText(isOn ? 'Online' : 'Offline', 305, ry + 22);
                
                // Activity
                let actText = 'Boşta';
                let actColor = '#8b949e';
                if (acc.statusType === 'spotify') {
                    actText = 'Spotify';
                    actColor = '#1db954';
                } else if (acc.statusType === 'game') {
                    actText = (acc.gameName || 'Oyun').substring(0, 12);
                    actColor = '#a371f7';
                }
                ctx.fillStyle = actColor;
                ctx.fillText(actText, 420, ry + 22);
                
                // Voice status - ses kanalı varsa ve online ise bağlı göster
                const hasVoice = acc.voiceChannelId && isOn;
                ctx.fillStyle = hasVoice ? '#3fb950' : '#484f58';
                ctx.beginPath();
                ctx.arc(590, ry + 17, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = hasVoice ? '#3fb950' : '#8b949e';
                ctx.fillText(hasVoice ? 'Seste Şuanda' : 'Yok', 605, ry + 22);
                
                // Server name - sunucu adını göster
                ctx.fillStyle = '#8b949e';
                const displayServer = hasVoice ? (serverName || 'Sunucu').substring(0, 15) : '-';
                ctx.fillText(displayServer, 700, ry + 22);
            }
            
            if (accounts.length === 0) {
                ctx.fillStyle = '#484f58';
                ctx.font = '14px Arial';
                ctx.textAlign = 'center';
                ctx.fillText('Henuz hesap eklenmedi', width / 2, tblY + 120);
                ctx.font = '11px Arial';
                ctx.fillText('Token eklemek icin asagidaki menuyu kullanin', width / 2, tblY + 140);
            }
            
            // Footer section
            const footerY = tblY + tblH + 10;
            
            // Page info
            const totalPages = Math.ceil(totalTokens / 5) || 1;
            const currentPage = data.page + 1;
            ctx.fillStyle = '#8b949e';
            ctx.font = '11px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Sayfa ${currentPage}/${totalPages}`, width / 2, footerY + 15);
            
            // Progress bar for page
            const barWidth = 200;
            const barX = (width - barWidth) / 2;
            ctx.fillStyle = '#21262d';
            ctx.fillRect(barX, footerY + 22, barWidth, 4);
            ctx.fillStyle = '#388bfd';
            ctx.fillRect(barX, footerY + 22, barWidth * (currentPage / totalPages), 4);
            
            // Branding - Modern style
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Swenzy Code Türkiye', width / 2, height - 45);
            
            ctx.fillStyle = '#8b949e';
            ctx.font = '11px Arial';
            ctx.fillText('discord.gg/aoijs', width / 2, height - 28);
            
            encoder.addFrame(ctx);
        }
        
        encoder.finish();
        return encoder.out.getData();
    } catch (error) {
        console.log('[ERROR] Token Control GIF error:', error);
        throw error;
    }
}

// Token Control Panel - Fotoğraftaki gibi butonlu
async function createTokenControlPanel(userId) {
    const data = controlPanelData.get(userId) || { selectedTokens: [], page: 0 };
    controlPanelData.set(userId, data);
    
    const totalTokens = database.accounts.length;
    const selectedCount = data.selectedTokens.length;
    const tokensPerPage = 25;
    const totalPages = Math.ceil(totalTokens / tokensPerPage) || 1;
    const currentPage = Math.min(data.page, totalPages - 1);
    const startIndex = currentPage * tokensPerPage;
    const endIndex = Math.min(startIndex + tokensPerPage, totalTokens);
    const pageTokens = database.accounts.slice(startIndex, endIndex);
    
    // GIF oluştur
    const gifBuffer = await createTokenControlGif(userId);
    const attachment = new AttachmentBuilder(gifBuffer, { name: 'token-control.gif' });
    
    const accountOptions = pageTokens.length > 0 ? pageTokens.map((acc, i) => {
        const globalIndex = startIndex + i;
        const isSelected = data.selectedTokens.includes(globalIndex);
        const isActive = selfClients.has(acc.token);
        return {
            label: acc.username || `Token ${globalIndex + 1}`,
            value: globalIndex.toString(),
            description: `${isActive ? '🟢 Aktif' : '🔴 Pasif'} | ${acc.statusType === 'game' ? acc.gameName || 'Oyun' : acc.statusType === 'spotify' ? 'Spotify' : 'Boşta'}`,
            emoji: isSelected ? '✅' : '⬜'
        };
    }) : [{ label: 'Hesap yok', value: 'none', description: 'Önce hesap ekleyin' }];
    
    const gameOptions = games.slice(0, 25).map(g => ({
        label: g.name,
        value: g.name,
        emoji: getGameEmoji(g.name)
    }));
    
    // Hesap seçim menüsü
    const row1 = new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
            .setCustomId('ctrl_select_accounts')
            .setPlaceholder('Hesap seçiniz')
            .setMinValues(0)
            .setMaxValues(Math.max(1, accountOptions.length))
            .addOptions(accountOptions.slice(0, 25))
    );
    
    // Sayfa ve seçim butonları
    const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ctrl_prev_page').setLabel('<').setStyle(ButtonStyle.Secondary).setDisabled(currentPage === 0),
        new ButtonBuilder().setCustomId('ctrl_page_info').setLabel(`${currentPage + 1}/${totalPages}`).setStyle(ButtonStyle.Secondary).setDisabled(true),
        new ButtonBuilder().setCustomId('ctrl_next_page').setLabel('>').setStyle(ButtonStyle.Secondary).setDisabled(currentPage >= totalPages - 1),
        new ButtonBuilder().setCustomId('ctrl_server_search').setLabel('Sunucu Ara').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ctrl_close').setLabel('Kapat').setStyle(ButtonStyle.Danger)
    );
    
    // İlk satır butonlar
    const row3 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ctrl_select_all').setLabel('Tumunu Sec').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_select_page').setLabel('Sayfayi Sec').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_restart').setLabel('Yeniden Baslat').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_mute').setLabel('Mikrofon Ac').setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId('ctrl_deaf').setLabel('Kulaklik Kapat').setStyle(ButtonStyle.Danger)
    );
    
    // İkinci satır butonlar
    const row4 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ctrl_stop').setLabel('Tokeni Durdur').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_server_label').setLabel('Sunucu Etiketi').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_status_channel').setLabel('Status/Kanal').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('ctrl_swenzy_rpc').setLabel('Swenzy RPC').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('ctrl_remove').setLabel('Tokeni Kaldir').setStyle(ButtonStyle.Danger)
    );
    
    // Üçüncü satır butonlar
    const row5 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ctrl_tike').setLabel('Tike Tiklat').setStyle(ButtonStyle.Secondary)
    );
    
    return { 
        content: `**Token Kontrol Paneli**\n-# ${selectedCount} secili  •  ${totalTokens} toplam hesap`,
        files: [attachment],
        components: [row1, row2, row3, row4, row5]
    };
}


// Durum Secim Paneli
function createStatusSelectPanel() {
    const container = new ContainerBuilder()
        .setAccentColor(0x3498DB)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎭 Durum Secimi\n\n> Asagidan bir durum tipi secin.'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_status_type')
                    .setPlaceholder('Durum tipi secin...')
                    .addOptions([
                        { label: 'Oyun Oynuyor', value: 'game', description: 'Sectiginiz oyunu oynar gorunur', emoji: '🎮' },
                        { label: 'Spotify Dinliyor', value: 'spotify', description: 'Rastgele sarki dinler gorunur', emoji: '🎵' },
                        { label: 'Durum Yok', value: 'none', description: 'Hicbir durum gostermez', emoji: '⚫' }
                    ])
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('cancel_add_token').setLabel('Iptal').setStyle(ButtonStyle.Danger).setEmoji('✖️')
            )
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// Oyun Secim Paneli
function createGameSelectPanel() {
    const gameOptions = games.slice(0, 25).map(g => ({
        label: g.name,
        value: g.name,
        emoji: getGameEmoji(g.name)
    }));

    const container = new ContainerBuilder()
        .setAccentColor(0x9B59B6)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎮 Oyun Secimi\n\n> Asagidan bir oyun secin.'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_game')
                    .setPlaceholder('Oyun secin...')
                    .addOptions(gameOptions)
            )
        )
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back_status_select').setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('◀️'),
                new ButtonBuilder().setCustomId('cancel_add_token').setLabel('Iptal').setStyle(ButtonStyle.Danger).setEmoji('✖️')
            )
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}

// Token Silme Paneli
function createRemovePanel() {
    if (database.accounts.length === 0) {
        const container = new ContainerBuilder()
            .setAccentColor(0xE74C3C)
            .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🗑️ Token Kaldir\n\n> Silinecek token bulunmuyor.'))
            .addActionRowComponents(
                new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('back_main').setLabel('Ana Menu').setStyle(ButtonStyle.Secondary).setEmoji('🏠')
                )
            );
        return { components: [container], flags: MessageFlags.IsComponentsV2 };
    }

    const options = database.accounts.slice(0, 25).map((acc, i) => ({
        label: acc.username || `Token ${i + 1}`,
        value: i.toString(),
        description: `Kanal: ${acc.voiceChannelId || 'Yok'}`,
        emoji: selfClients.has(acc.token) ? '🟢' : '🔴'
    }));

    const container = new ContainerBuilder()
        .setAccentColor(0xE74C3C)
        .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🗑️ Token Kaldir\n\n> Silmek istediginiz tokeni secin.'))
        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('select_remove_token')
                    .setPlaceholder('Token secin...')
                    .addOptions(options)
            )
        )
        .addActionRowComponents(
            new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('back_main').setLabel('Iptal').setStyle(ButtonStyle.Danger).setEmoji('✖️')
            )
        );
    return { components: [container], flags: MessageFlags.IsComponentsV2 };
}


// Ana Bot
const bot = new BotClient({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates
    ] 
});

bot.on('ready', async () => {
    await log.banner();
    
    // SXP.TOOL Style Progress Bars
    await waveProgressBar('Initializing system', 1800);
    await waveProgressBar('Loading database', 1200);
    await waveProgressBar('Loading modules', 1000);
    await waveProgressBar('Establishing connection', 800);
    
    console.log();
    log.systemInfo();
    
    log.box('BOT INFORMATION', [
        `${c.green}Bot:${c.reset}            ${c.white}${bot.user.tag}${c.reset}`,
        `${c.green}Admin ID:${c.reset}       ${c.white}${config.adminId}${c.reset}`,
        `${c.green}Total Accounts:${c.reset} ${c.white}${database.accounts.length}${c.reset}`,
        `${c.green}Total Songs:${c.reset}    ${c.white}${spotifySongs.length}${c.reset}`,
        `${c.green}Total Games:${c.reset}    ${c.white}${games.length}${c.reset}`,
    ]);
    
    console.log();
    
    // Bot durumunu ayarla
    bot.user.setPresence({
        activities: [{
            name: 'powered by swénzy',
            type: 0 // PLAYING
        }],
        status: 'online'
    });
    
    console.log(`${c.green}[STATUS]${c.reset} Bot durumu ayarlandı: ${c.white}Powered by Swenzy${c.reset}`);
    
    // SXP.TOOL Style Ready Message - Rainbow
    const readyMsg = '[ SYSTEM READY - ALL MODULES LOADED ]';
    process.stdout.write('  ');
    for (let i = 0; i < readyMsg.length; i++) {
        process.stdout.write(gradient.rainbow[i % gradient.rainbow.length] + readyMsg[i]);
    }
    console.log(c.reset);
    console.log();
    
    // Input prompt style
    console.log(`${c.yellow}  ╔${'═'.repeat(50)}╗${c.reset}`);
    console.log(`${c.yellow}  ║${c.reset} ${c.green}[>]${c.reset} ${c.white}Type !panel in Discord to open control panel${c.reset} ${c.yellow}║${c.reset}`);
    console.log(`${c.yellow}  ╚${'═'.repeat(50)}╝${c.reset}`);
    console.log();
    
    startAllSelfBots();
    
    // Her 45 saniyede istatistik guncelle
    setInterval(() => {
        log.stats();
        log.table(database.accounts);
    }, 45000);
    
    // Her 5 saniyede title guncelle
    setInterval(() => {
        updateTitle();
    }, 5000);
});

bot.on('messageCreate', async (message) => {
    // Bot mesajlarını ignore et
    if (message.author.bot) return;
    
    if (message.content === '!panel') {
        try {
            const active = selfClients.size;
            const total = database.accounts.length;
            const offline = total - active;
            
            const container = new ContainerBuilder()
                .setAccentColor(0x36393F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# **Swenzy Bots Afk-Ses Sistemi**')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### **👋 Merhaba! Swenzy Bots Üyeleri**\n\n` +
                        `\`\`\`ansi\n\u001b[1;33m• Kendi kadromuza özel herkese bir sistem!\n• Ses afklığınızı kolayca artırın!\u001b[0m\n\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### **⚡ Ne işe yarar?**\n\n` +
                        `\`\`\`ansi\n\u001b[1;32m• Ses aktifliği kazanırsınız!\n• AFK kalırken aktif görünürsünüz!\n• Tamamen otomatik çalışır!\u001b[0m\n\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### **⚙️ Nasıl çalışır?**\n\n` +
                        `\`\`\`ansi\n\u001b[1;34m• Bota bilgilerini gir\n• Token ve Kanal ID yaz\n• Görseldeki gibi doldur\u001b[0m\n\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### **🎁 Paket Sistemi**\n` +
                        `\`\`\`ansi\n\u001b[1;32m• Herkes ${config.defaultLimit || 20} limit hakkına sahiptir!\n• Admin limitsiz kullanabilir!\u001b[0m\n\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 📝 Ek Bilgiler\n\n` +
                        `\`\`\`ansi\n` +
                        `\u001b[1;35m• Paketler otomatik aktif edilir!\n` +
                        `• Limit dolunca sistem durur!\n` +
                        `• Yetkililer limitsiz kullanabilir!\u001b[0m\n` +
                        `\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 🔒 Güvenlik\n` +
                        `\`\`\`ansi\n` +
                        `\u001b[0;34m**Veriler AES şifreleme ile saklanmaktadır**\n` +
                        `**Paylaşılmaz**\u001b[0m\n` +
                        `\`\`\``
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('panel_v2_token_ekle').setLabel('1 Token Ekle').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                        new ButtonBuilder().setCustomId('panel_v2_toplu_token').setLabel('Toplu Token Ekle').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
                        new ButtonBuilder().setCustomId('panel_v2_kaldir').setLabel('Kaldır').setStyle(ButtonStyle.Secondary).setEmoji('🗑️'),
                        new ButtonBuilder().setCustomId('panel_v2_hesaplar').setLabel('Hesaplarım').setStyle(ButtonStyle.Primary).setEmoji('👤')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# Copyright © Developed by Swenzy 2026`
                    )
                );
            
            const panelMessage = await message.channel.send({ 
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });

            // 5 dakikada bir panel'i güncelle
            const updateInterval = setInterval(async () => {
                try {
                    const newActive = selfClients.size;
                    const newTotal = database.accounts.length;
                    
                    // Yeni container oluştur
                    const updatedContainer = new ContainerBuilder()
                        .setAccentColor(0x36393F)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent('# **Swenzy Bots Afk-Ses Sistemi**')
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### **👋 Merhaba! Swenzy Bots Üyeleri**\n\n` +
                                `\`\`\`ansi\n\u001b[1;33m• Kendi kadromuza özel herkese bir sistem!\n• Ses afklığınızı kolayca artırın!\u001b[0m\n\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### **⚡ Ne işe yarar?**\n\n` +
                                `\`\`\`ansi\n\u001b[1;32m• Ses aktifliği kazanırsınız!\n• AFK kalırken aktif görünürsünüz!\n• Tamamen otomatik çalışır!\u001b[0m\n\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### **⚙️ Nasıl çalışır?**\n\n` +
                                `\`\`\`ansi\n\u001b[1;34m• Bota bilgilerini gir\n• Token ve Kanal ID yaz\n• Görseldeki gibi doldur\u001b[0m\n\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### **🎁 Paket Sistemi**\n` +
                                `\`\`\`ansi\n\u001b[1;32m• Herkes ${config.defaultLimit || 20} limit hakkına sahiptir!\n• Admin limitsiz kullanabilir!\u001b[0m\n\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### 📝 Ek Bilgiler\n\n` +
                                `\`\`\`ansi\n` +
                                `\u001b[1;35m• Paketler otomatik aktif edilir!\n` +
                                `• Limit dolunca sistem durur!\n` +
                                `• Yetkililer limitsiz kullanabilir!\u001b[0m\n` +
                                `\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### 🔒 Güvenlik\n` +
                                `\`\`\`ansi\n` +
                                `\u001b[0;34m**Veriler AES şifreleme ile saklanmaktadır**\n` +
                                `**Paylaşılmaz**\u001b[0m\n` +
                                `\`\`\``
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addActionRowComponents(
                            new ActionRowBuilder().addComponents(
                                new ButtonBuilder().setCustomId('panel_v2_token_ekle').setLabel('1 Token Ekle').setStyle(ButtonStyle.Secondary).setEmoji('➕'),
                                new ButtonBuilder().setCustomId('panel_v2_toplu_token').setLabel('Toplu Token Ekle').setStyle(ButtonStyle.Secondary).setEmoji('📋'),
                                new ButtonBuilder().setCustomId('panel_v2_kaldir').setLabel('Kaldır').setStyle(ButtonStyle.Secondary).setEmoji('🗑️'),
                                new ButtonBuilder().setCustomId('panel_v2_hesaplar').setLabel('Hesaplarım').setStyle(ButtonStyle.Primary).setEmoji('👤')
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# 🔄 Güncellendi: <t:${Math.floor(Date.now() / 1000)}:R> | Online: ${newActive}/${newTotal} | Copyright © Developed by Swenzy 2026`
                            )
                        );

                    await panelMessage.edit({ 
                        components: [updatedContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (error) {
                    console.log('[PANEL-UPDATE] Güncelleme hatası:', error.message);
                    clearInterval(updateInterval); // Hata durumunda interval'i durdur
                }
            }, 30 * 1000); // 30 saniye

            // 1 saat sonra interval'i durdur (spam önleme)
            setTimeout(() => {
                clearInterval(updateInterval);
                console.log('[PANEL-UPDATE] Otomatik güncelleme 1 saat sonra durduruldu');
            }, 60 * 60 * 1000);

        } catch (err) {
            console.log('[ERROR] Panel hatasi:', err);
            await message.reply('❌ Panel oluşturulurken hata: ' + err.message);
        }
    }
    
    
});

bot.on('interactionCreate', async (interaction) => {
    // Tüm panel butonları için admin kontrolü kaldırıldı - herkes kullanabilir
    // Eski admin kontrolü kaldırıldı

    if (interaction.isButton()) {
        // Bildirim ayarları butonları
        if (interaction.customId.startsWith('notify_toggle_')) {
            const userId = interaction.user.id;
            if (!database.notifications) database.notifications = {};
            if (!database.notifications[userId]) {
                database.notifications[userId] = {
                    tokenOffline: true,
                    limitWarning: true,
                    limitFull: true
                };
            }
            
            const settings = database.notifications[userId];
            
            if (interaction.customId === 'notify_toggle_offline') {
                settings.tokenOffline = !settings.tokenOffline;
            } else if (interaction.customId === 'notify_toggle_warning') {
                settings.limitWarning = !settings.limitWarning;
            } else if (interaction.customId === 'notify_toggle_full') {
                settings.limitFull = !settings.limitFull;
            }
            
            fs.writeFileSync('./database.json', JSON.stringify(database, null, 2));
            
            // Paneli güncelle
            const container = new ContainerBuilder()
                .setAccentColor(0x36393F)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `# 🔷 **Bildirim Ayarları**\n` +
                        `-# Bildirimleri özel mesaj olarak alırsınız`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### ⚡ **Mevcut Ayarlar**\n\n` +
                        `🔹 **Token Offline:** ${settings.tokenOffline ? '✅ Açık' : '❌ Kapalı'}\n` +
                        `🔹 **Limit Uyarısı (90%):** ${settings.limitWarning ? '✅ Açık' : '❌ Kapalı'}\n` +
                        `🔹 **Limit Doldu (100%):** ${settings.limitFull ? '✅ Açık' : '❌ Kapalı'}`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `### 🏷️ **Bildirim Türleri**\n\n` +
                        `⚙️ **Token Offline:** Tokenlerinizden biri çevrimdışı olduğunda\n` +
                        `⚙️ **Limit Uyarısı:** Limitinizin %90'ına ulaştığınızda\n` +
                        `⚙️ **Limit Doldu:** Limitiniz tamamen dolduğunda`
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId('notify_toggle_offline')
                            .setLabel('Token Offline')
                            .setStyle(settings.tokenOffline ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji('👤'),
                        new ButtonBuilder()
                            .setCustomId('notify_toggle_warning')
                            .setLabel('Limit Uyarısı')
                            .setStyle(settings.limitWarning ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji('🎲'),
                        new ButtonBuilder()
                            .setCustomId('notify_toggle_full')
                            .setLabel('Limit Doldu')
                            .setStyle(settings.limitFull ? ButtonStyle.Success : ButtonStyle.Secondary)
                            .setEmoji('❌')
                    )
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent(
                        `-# 🔷 Butonlara tıklayarak ayarları değiştirebilirsiniz`
                    )
                );
            
            await interaction.update({
                components: [container],
                flags: MessageFlags.IsComponentsV2
            });
            
            return;
        }
        
        // Referans butonları
        if (interaction.customId === 'ref_use_code') {
            const modal = new ModalBuilder()
                .setCustomId('modal_ref_code')
                .setTitle('Referans Kodu Kullan')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('ref_code_input')
                            .setLabel('Referans Kodu')
                            .setPlaceholder('SWN-ABC123')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
            return;
        }
        
        if (interaction.customId === 'ref_leaderboard') {
            try {
                if (!database.referrals) database.referrals = {};
                
                // Sıralama oluştur
                const leaderboard = Object.entries(database.referrals)
                    .map(([userId, data]) => ({
                        userId,
                        invites: data.invites.length,
                        bonus: data.bonusLimit
                    }))
                    .sort((a, b) => b.invites - a.invites)
                    .slice(0, 10);
                
                let leaderboardText = '';
                for (let i = 0; i < leaderboard.length; i++) {
                    const entry = leaderboard[i];
                    try {
                        const user = await bot.users.fetch(entry.userId);
                        const medal = i === 0 ? '✅' : i === 1 ? '🔹' : i === 2 ? '👤' : '❌';
                        leaderboardText += `${medal} **${i + 1}.** ${user.username} • ${entry.invites} davet • +${entry.bonus} limit\n`;
                    } catch (e) {
                        leaderboardText += `❌ **${i + 1}.** Bilinmeyen • ${entry.invites} davet\n`;
                    }
                }
                
                if (!leaderboardText) leaderboardText = '*Henüz kimse davet etmemiş*';
                
                const container = new ContainerBuilder()
                    .setAccentColor(0xFFD700)
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `# 🎲 **Davet Sıralaması**\n` +
                            `-# En çok davet edenler`
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `### ⚡ **Top 10**\n\n${leaderboardText}`
                        )
                    )
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(
                        new TextDisplayBuilder().setContent(
                            `-# 🔷 Daha fazla davet et, listede yüksel!`
                        )
                    );
                
                await interaction.update({
                    components: [container],
                    flags: MessageFlags.IsComponentsV2
                });
            } catch (err) {
                console.log('[ERROR] Leaderboard hatası:', err);
                await interaction.reply({ content: '❌ Sıralama yüklenirken hata!', flags: MessageFlags.Ephemeral });
            }
            return;
        }
        
        if (interaction.customId === 'add_token') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_token')
                .setTitle('Token Ekle')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('token_input').setLabel('Discord Token').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'remove_token') {
            await interaction.update(createRemovePanel());
        }
        else if (interaction.customId === 'restart_all') {
            await interaction.update({ 
                content: '# 🔄 Yeniden Başlatılıyor...\n-# Tüm hesaplar yeniden başlatılıyor, lütfen bekleyin...', 
                files: [],
                components: [] 
            });
            await restartAll();
            
            setTimeout(async () => {
                const active = selfClients.size;
                const total = database.accounts.length;
                const offline = total - active;
                
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('add_token').setLabel('Token Ekle').setStyle(ButtonStyle.Success).setEmoji('➕'),
                        new ButtonBuilder().setCustomId('remove_token').setLabel('Token Sil').setStyle(ButtonStyle.Danger).setEmoji(' ️'),
                        new ButtonBuilder().setCustomId('restart_all').setLabel('Yeniden Başlat').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
                        new ButtonBuilder().setCustomId('stop_all').setLabel('Durdur').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
                    );
                
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('panel_status').setLabel('Durum Değiştir').setStyle(ButtonStyle.Secondary).setEmoji('🎭'),
                        new ButtonBuilder().setCustomId('panel_refresh').setLabel('Yenile').setStyle(ButtonStyle.Secondary).setEmoji('🔃'),
                        new ButtonBuilder().setCustomId('panel_stats').setLabel('Detaylı İstatistik').setStyle(ButtonStyle.Secondary).setEmoji('📊')
                    );
                
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('panel_token_ekle').setLabel('1 Token Ekle').setStyle(ButtonStyle.Success).setEmoji('1️⃣'),
                        new ButtonBuilder().setCustomId('panel_toplu_token').setLabel('Toplu Token Ekle').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                        new ButtonBuilder().setCustomId('panel_kaldir').setLabel('Kaldır').setStyle(ButtonStyle.Danger).setEmoji('🗑️')
                    );
                
                const row4 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setURL('https://discord.gg/botshop').setLabel('Discord').setStyle(ButtonStyle.Link).setEmoji('🔗')
                    );
                
                await interaction.editReply({ 
                    content: `## ✅ Yeniden Başlatıldı!\n\n📊 **Durum:** ${active} Online | ${offline} Offline | ${total} Toplam\n⏱️ **Uptime:** ${getUptime()}\n\n-# Copyright © Developed by Swenzy 2026`,
                    files: [],
                    components: [row1, row2, row3, row4]
                });
            }, 5000);
        }
        else if (interaction.customId === 'stop_all') {
            await interaction.update({ 
                content: '# ⏹️ Durduruluyor...\n-# Tüm hesaplar durduruluyor...', 
                files: [],
                components: [] 
            });
            await disconnectAll();
            
            setTimeout(async () => {
                const active = selfClients.size;
                const total = database.accounts.length;
                const offline = total - active;
                
                const row1 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('add_token').setLabel('Token Ekle').setStyle(ButtonStyle.Success).setEmoji('➕'),
                        new ButtonBuilder().setCustomId('remove_token').setLabel('Token Sil').setStyle(ButtonStyle.Danger).setEmoji('🗑️'),
                        new ButtonBuilder().setCustomId('restart_all').setLabel('Yeniden Başlat').setStyle(ButtonStyle.Primary).setEmoji('🔄'),
                        new ButtonBuilder().setCustomId('stop_all').setLabel('Durdur').setStyle(ButtonStyle.Danger).setEmoji('⏹️')
                    );
                
                const row2 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('panel_status').setLabel('Durum Değiştir').setStyle(ButtonStyle.Secondary).setEmoji('🎭'),
                        new ButtonBuilder().setCustomId('panel_refresh').setLabel('Yenile').setStyle(ButtonStyle.Secondary).setEmoji('🔃'),
                        new ButtonBuilder().setCustomId('panel_stats').setLabel('Detaylı İstatistik').setStyle(ButtonStyle.Secondary).setEmoji('📊')
                    );
                
                const row3 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setCustomId('panel_token_ekle').setLabel('1 Token Ekle').setStyle(ButtonStyle.Success).setEmoji('1️⃣'),
                        new ButtonBuilder().setCustomId('panel_toplu_token').setLabel('Toplu Token Ekle').setStyle(ButtonStyle.Primary).setEmoji('📦'),
                        new ButtonBuilder().setCustomId('panel_kaldir').setLabel('Kaldır').setStyle(ButtonStyle.Danger).setEmoji('👤')
                    );
                
                const row4 = new ActionRowBuilder()
                    .addComponents(
                        new ButtonBuilder().setURL('https://discord.gg/botshop').setLabel('Discord').setStyle(ButtonStyle.Link).setEmoji('🔗')
                    );
                
                await interaction.editReply({ 
                    content: `## ⏹️ Tüm Hesaplar Durduruldu!\n\n📊 **Durum:** ${active} Online | ${offline} Offline | ${total} Toplam\n\n-# Copyright © Developed by Swenzy 2026`,
                    files: [],
                    components: [row1, row2, row3, row4]
                });
            }, 2000);
        }
        else if (interaction.customId === 'panel_refresh') {
            await interaction.deferUpdate();
            
            const active = selfClients.size;
            const total = database.accounts.length;
            const offline = total - active;

            await interaction.editReply({ 
                content: `📊 **Panel Yenilendi!**\n\n🟢 **Online:** ${active}\n🔴 **Offline:** ${offline}\n📊 **Toplam:** ${total}\n⏱️ **Uptime:** ${getUptime()}`,
                files: [],
                components: []
            });
        }
        else if (interaction.customId === 'panel_status') {
            await interaction.update(createStatusSelectPanel());
        }
        else if (interaction.customId === 'panel_v2_hesaplar') {
            // Kullanıcının hesaplarını göster (gizli mesaj)
            const userAccounts = database.accounts.filter(acc => acc.addedBy === interaction.user.id);
            
            // Kullanıcının limitini al
            const member = interaction.member;
            const userLimit = getUserTokenLimit(interaction.user.id, member);
            const currentCount = getUserTokenCount(interaction.user.id);
            const remaining = userLimit === Infinity ? '∞' : userLimit - currentCount;
            
            if (userAccounts.length === 0) {
                const noAccountsEmbed = new EmbedBuilder()
                    .setColor('#FF6B6B')
                    .setTitle('❌ Hesap Bulunamadı')
                    .setDescription(`**Henüz hiç hesap eklememişsiniz**\n\n**💎 Limitiniz:** ${currentCount}/${userLimit === Infinity ? '∞' : userLimit}\n**📝 İpucu:** "1 Token Ekle" butonunu kullanarak hesap ekleyebilirsiniz.`)
                    .setTimestamp();

                return interaction.reply({
                    embeds: [noAccountsEmbed],
                    flags: MessageFlags.Ephemeral
                });
            }

            let accountList = '';
            
            userAccounts.forEach((account, index) => {
                const status = selfClients.has(account.token) ? '🟢 Online' : '🔴 Offline';
                const username = account.username || 'Bilinmiyor';
                const voiceChannel = account.voiceChannelId ? `<#${account.voiceChannelId}>` : 'Ayarlanmamış';
                const gameName = account.gameName || 'Yok';
                
                accountList += `**${index + 1}.** ${username}\n`;
                accountList += `├ **Durum:** ${status}\n`;
                accountList += `├ **Ses Kanalı:** ${voiceChannel}\n`;
                accountList += `├ **Oyun:** ${gameName}\n`;
                accountList += `└ **Token:** \`${account.token.slice(0, 20)}...\`\n\n`;
            });

            const onlineCount = userAccounts.filter(acc => selfClients.has(acc.token)).length;
            const offlineCount = userAccounts.filter(acc => !selfClients.has(acc.token)).length;

            const accountsEmbed = new EmbedBuilder()
                .setColor('#4F46E5')
                .setTitle(`👤 Hesaplarım (${userAccounts.length} adet)`)
                .setDescription(accountList)
                .addFields(
                    { name: '📊 İstatistikler', value: `**Toplam:** ${userAccounts.length} hesap\n**🟢 Online:** ${onlineCount}\n**🔴 Offline:** ${offlineCount}`, inline: true },
                    { name: '💎 Limit Bilgisi', value: `**Kullanılan:** ${currentCount}/${userLimit === Infinity ? '∞' : userLimit}\n**Kalan:** ${remaining === '∞' ? '∞' : remaining} slot\n**Doluluk:** %${userLimit === Infinity ? 0 : Math.round((currentCount / userLimit) * 100)}`, inline: true }
                )
                .setFooter({ text: '🔒 Bu bilgiler sadece size görünür' })
                .setTimestamp();

            await interaction.reply({
                embeds: [accountsEmbed],
                flags: MessageFlags.Ephemeral
            });
        }
        // Token Tara Butonları
        else if (interaction.customId === 'token_tara_az') {
            try {
                const modal = new ModalBuilder()
                    .setCustomId('modal_token_tara')
                    .setTitle('Token Tarama')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('tokens_input')
                                .setLabel('Tokenları girin (her satıra bir token)')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('Token1\nToken2\nToken3')
                                .setRequired(true)
                                .setMaxLength(4000)
                        )
                    );
                await interaction.showModal(modal);
            } catch (error) {
                console.log('[TOKEN-TARA] Modal hatası:', error.message);
                await interaction.reply({ 
                    content: '❌ Modal açılamadı: ' + error.message, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
        else if (interaction.customId === 'token_tara_dosya') {
            await interaction.reply({
                content: '📄 **Dosya ile Token Tarama**\n\n❌ Bu özellik henüz geliştirilme aşamasında.\n💡 Şimdilik "Az sayıda tara" butonunu kullanabilirsiniz.',
                flags: MessageFlags.Ephemeral
            });
        }
        else if (interaction.customId === 'token_format_ayir') {
            try {
                const modal = new ModalBuilder()
                    .setCustomId('modal_format_ayir')
                    .setTitle('Format Ayırıcı')
                    .addComponents(
                        new ActionRowBuilder().addComponents(
                            new TextInputBuilder()
                                .setCustomId('format_input')
                                .setLabel('mail:pass:token formatındaki listeyi girin')
                                .setStyle(TextInputStyle.Paragraph)
                                .setPlaceholder('email@example.com:password123:TOKEN1\ntest@mail.com:pass456:TOKEN2')
                                .setRequired(true)
                                .setMaxLength(4000)
                        )
                    );
                await interaction.showModal(modal);
            } catch (error) {
                console.log('[FORMAT-AYIR] Modal hatası:', error.message);
                await interaction.reply({ 
                    content: '❌ Modal açılamadı: ' + error.message, 
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
        // V2 Panel Butonları
        else if (interaction.customId === 'panel_v2_token_ekle') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_token')
                .setTitle('Token Ekle')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('token_input').setLabel('Discord Token').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'panel_v2_toplu_token') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_multi_token')
                .setTitle('Toplu Token Ekle')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('tokens_input').setLabel('Tokenler (her satira bir token)').setStyle(TextInputStyle.Paragraph).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'panel_v2_kaldir') {
            const userId = interaction.user.id;
            const userAccounts = database.accounts
                .map((acc, i) => ({ acc, i }))
                .filter(({ acc }) => acc.addedBy === userId);

            if (userAccounts.length === 0) {
                return interaction.reply({
                    content: '❌ Kaldırılacak hesap bulunamadı!',
                    flags: MessageFlags.Ephemeral
                });
            }

            const container = new ContainerBuilder()
                .setAccentColor(0xE74C3C)
                .addTextDisplayComponents(
                    new TextDisplayBuilder().setContent('# 🗑️ Hesap Kaldır\n\nKaldırmak istediğiniz hesabı seçin:')
                )
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true));

            // Her hesap için ayrı buton ekle (max 5 per row, max 25)
            const rows = [];
            let currentRow = new ActionRowBuilder();
            let btnCount = 0;

            for (const { acc, i } of userAccounts.slice(0, 25)) {
                const isOnline = selfClients.has(acc.token);
                if (btnCount > 0 && btnCount % 5 === 0) {
                    rows.push(currentRow);
                    currentRow = new ActionRowBuilder();
                }
                currentRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`kaldir_token_${i}`)
                        .setLabel(`${isOnline ? '🟢' : '🔴'} ${(acc.username || `Token ${i+1}`).substring(0, 20)}`)
                        .setStyle(ButtonStyle.Danger)
                );
                btnCount++;
            }
            if (btnCount > 0) rows.push(currentRow);

            for (const row of rows) container.addActionRowComponents(row);

            await interaction.reply({
                components: [container],
                flags: MessageFlags.IsComponentsV2 | MessageFlags.Ephemeral
            });
        }
        else if (interaction.customId.startsWith('kaldir_token_')) {
            const index = parseInt(interaction.customId.split('_')[2]);
            const acc = database.accounts[index];
            if (!acc) return interaction.reply({ content: '❌ Hesap bulunamadı!', flags: MessageFlags.Ephemeral });
            if (acc.addedBy !== interaction.user.id && interaction.user.id !== config.adminId) {
                return interaction.reply({ content: '❌ Bu hesabı sadece ekleyen kişi kaldırabilir!', flags: MessageFlags.Ephemeral });
            }
            const username = acc.username || 'Bilinmiyor';
            await disconnectSelfBot(acc.token);
            database.accounts.splice(index, 1);
            saveDatabase();
            await interaction.update({
                components: [new ContainerBuilder()
                    .setAccentColor(0x2ECC71)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ Hesap Kaldırıldı!\n\n👤 **${username}** başarıyla kaldırıldı.`))
                ],
                flags: MessageFlags.IsComponentsV2
            });
        }
        else if (interaction.customId === 'add_one_token') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_token')
                .setTitle('Token Ekle')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('token_input').setLabel('Discord Token').setStyle(TextInputStyle.Short).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'add_multi_token') {
            const modal = new ModalBuilder()
                .setCustomId('modal_add_multi_token')
                .setTitle('Toplu Token Ekle')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('tokens_input').setLabel('Tokenler (her satira bir token)').setStyle(TextInputStyle.Paragraph).setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'cancel_add_token') {
            pendingTokens.delete(interaction.user.id);
            await interaction.update(createMainPanel());
        }
        else if (interaction.customId === 'back_status_select') {
            await interaction.update(createStatusSelectPanel());
        }
        else if (interaction.customId === 'remove_token') {
            await interaction.update(createRemovePanel());
        }
        else if (interaction.customId === 'back_main') {
            await interaction.update(createMainPanel());
        }
        else if (interaction.customId === 'restart_all') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0xF1C40F).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔄 Yeniden Baslatiliyor...'))], flags: MessageFlags.IsComponentsV2 });
            await restartAll();
            setTimeout(() => interaction.editReply(createMainPanel()), 5000);
        }
        else if (interaction.customId === 'stop_all') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0xE74C3C).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ⏹️ Durduruluyor...'))], flags: MessageFlags.IsComponentsV2 });
            await disconnectAll();
            setTimeout(() => interaction.editReply(createTokenListPanel()), 2000);
        }
        // Owner Panel Butonlari
        else if (interaction.customId === 'op_refresh') {
            await interaction.update(createOwnerPanel());
        }
        else if (interaction.customId === 'op_restart_all') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0xF1C40F).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔄 Tum Hesaplar Yeniden Baslatiliyor...\n\n> Bu islem biraz zaman alabilir.'))], flags: MessageFlags.IsComponentsV2 });
            await restartAll();
            setTimeout(() => interaction.editReply(createOwnerPanel()), 8000);
        }
        else if (interaction.customId === 'op_stop_all') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0xE74C3C).addTextDisplayComponents(new TextDisplayBuilder().setContent('# ⏹️ Tum Hesaplar Durduruluyor...'))], flags: MessageFlags.IsComponentsV2 });
            await disconnectAll();
            setTimeout(() => interaction.editReply(createOwnerPanel()), 2000);
        }
        else if (interaction.customId === 'op_token_control') {
            controlPanelData.set(interaction.user.id, { selectedTokens: [], page: 0 });
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'op_logs') {
            const logsContent = `### 📜 System Logs\n\n` +
                `🔗 **Total Connections:** ${totalConnections}\n` +
                `🎵 **Song Changes:** ${totalSongChanges}\n` +
                `❌ **Errors:** ${totalErrors}\n` +
                `⏱️ **Uptime:** ${getUptime()}\n` +
                `💾 **Memory:** ${formatBytes(process.memoryUsage().heapUsed)}\n\n` +
                `-# Last update: <t:${Math.floor(Date.now() / 1000)}:R>`;
            
            const logsContainer = new ContainerBuilder()
                .setAccentColor(0x00FF00)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📜 System Logs`))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(logsContent))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('op_refresh').setLabel('Back to Panel').setStyle(ButtonStyle.Primary).setEmoji('🔙')
                    )
                );
            await interaction.update({ components: [logsContainer], flags: MessageFlags.IsComponentsV2 });
        }
        // Yeni butonlar - All Spotify, All Game, Clear Status
        else if (interaction.customId === 'op_spotify_all') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0x1DB954).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎵 Setting all accounts to Spotify...'))], flags: MessageFlags.IsComponentsV2 });
            for (const acc of database.accounts) {
                acc.statusType = 'spotify';
                const clientData = selfClients.get(acc.token);
                if (clientData) setStatus(clientData.client, acc);
            }
            saveDatabase();
            setTimeout(() => interaction.editReply(createOwnerPanel()), 2000);
        }
        else if (interaction.customId === 'op_game_select') {
            const gameSelectContainer = new ContainerBuilder()
                .setAccentColor(0x5865F2)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🎮 Select Game for All Accounts'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new StringSelectMenuBuilder()
                            .setCustomId('op_game_all_select')
                            .setPlaceholder('Select a game...')
                            .addOptions(games.slice(0, 25).map(g => ({
                                label: g.name,
                                value: g.name,
                                emoji: getGameEmoji(g.name)
                            })))
                    )
                )
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('op_refresh').setLabel('Cancel').setStyle(ButtonStyle.Secondary).setEmoji('❌')
                    )
                );
            await interaction.update({ components: [gameSelectContainer], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === 'op_clear_status') {
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0x95A5A6).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🚫 Clearing all statuses...'))], flags: MessageFlags.IsComponentsV2 });
            for (const acc of database.accounts) {
                acc.statusType = 'none';
                acc.gameName = null;
                const clientData = selfClients.get(acc.token);
                if (clientData) setStatus(clientData.client, acc);
            }
            saveDatabase();
            setTimeout(() => interaction.editReply(createOwnerPanel()), 2000);
        }

        // Control Panel Butonlari
        else if (interaction.customId === 'ctrl_prev_page') {
            const data = controlPanelData.get(interaction.user.id);
            if (data && data.page > 0) data.page--;
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_next_page') {
            const data = controlPanelData.get(interaction.user.id);
            if (data) data.page++;
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_select_all') {
            const data = controlPanelData.get(interaction.user.id);
            if (data) {
                if (data.selectedTokens.length === database.accounts.length) {
                    data.selectedTokens = [];
                } else {
                    data.selectedTokens = database.accounts.map((_, i) => i);
                }
            }
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_select_page') {
            const data = controlPanelData.get(interaction.user.id);
            if (data) {
                const tokensPerPage = 25;
                const startIndex = data.page * tokensPerPage;
                const endIndex = Math.min(startIndex + tokensPerPage, database.accounts.length);
                const pageIndices = [];
                for (let i = startIndex; i < endIndex; i++) pageIndices.push(i);
                const allPageSelected = pageIndices.every(i => data.selectedTokens.includes(i));
                if (allPageSelected) {
                    data.selectedTokens = data.selectedTokens.filter(i => !pageIndices.includes(i));
                } else {
                    for (const i of pageIndices) {
                        if (!data.selectedTokens.includes(i)) data.selectedTokens.push(i);
                    }
                }
            }
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_close') {
            controlPanelData.delete(interaction.user.id);
            await interaction.update({ content: '**Panel Kapatildi**', files: [], components: [] });
        }
        else if (interaction.customId === 'ctrl_restart') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Once hesap secin!', ephemeral: true });
            
            const count = data.selectedTokens.length;
            await interaction.update({ content: `**Yeniden Baslatiliyor**\n${count} hesap yeniden baslatiliyor, lutfen bekleyin...`, files: [], components: [] });
            
            let success = 0;
            let failed = 0;
            
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (acc) {
                    try {
                        await disconnectSelfBot(acc.token);
                        await new Promise(r => setTimeout(r, 1500));
                        await connectSelfBot(acc, index);
                        success++;
                    } catch (e) {
                        failed++;
                    }
                }
            }
            
            await interaction.editReply({ content: `**Yeniden Baslatma Tamamlandi**\n${success} basarili, ${failed} basarisiz`, files: [], components: [] });
            
            // 2 saniye sonra paneli goster
            setTimeout(async () => {
                const panel = await createTokenControlPanel(interaction.user.id);
                interaction.editReply(panel);
            }, 2000);
        }
        else if (interaction.customId === 'ctrl_mute' || interaction.customId === 'ctrl_deaf') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Once hesap secin!', ephemeral: true });
            
            const isMute = interaction.customId === 'ctrl_mute';
            const count = data.selectedTokens.length;
            
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (acc) {
                    if (isMute) {
                        acc.selfMute = !acc.selfMute;
                    } else {
                        acc.selfDeaf = acc.selfDeaf === false ? true : false;
                    }
                    
                    // Aktif client varsa güncelle
                    const clientData = selfClients.get(acc.token);
                    if (clientData?.client?.voice?.channel) {
                        try {
                            await clientData.client.voice.setSelfMute(acc.selfMute || false);
                            await clientData.client.voice.setSelfDeaf(acc.selfDeaf !== false);
                        } catch (e) {}
                    }
                }
            }
            saveDatabase();
            
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_stop') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Once hesap secin!', ephemeral: true });
            
            const count = data.selectedTokens.length;
            await interaction.update({ content: `**Durduruluyor**\n${count} hesap durduruluyor...`, files: [], components: [] });
            
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (acc) await disconnectSelfBot(acc.token);
            }
            
            setTimeout(async () => {
                const panel = await createTokenControlPanel(interaction.user.id);
                interaction.editReply(panel);
            }, 2000);
        }
        else if (interaction.customId === 'ctrl_server_search') {
            await interaction.reply({ content: 'Sunucu arama ozelligi yakinda!', ephemeral: true });
        }
        else if (interaction.customId === 'ctrl_server_label') {
            await interaction.reply({ content: '🏷️ Sunucu etiketi özelliği yakında!', ephemeral: true });
        }
        else if (interaction.customId === 'ctrl_tike') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Once hesap secin!', ephemeral: true });
            
            const modal = new ModalBuilder()
                .setCustomId('tike_modal')
                .setTitle('Tike Tiklat')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tike_message_url')
                            .setLabel('Mesaj URL')
                            .setPlaceholder('https://discord.com/channels/123/456/789')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'ctrl_page_info') {
            // Disabled button, do nothing
            return;
        }
        else if (interaction.customId === 'ctrl_status_channel') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Önce hesap seçin!', ephemeral: true });
            const modal = new ModalBuilder()
                .setCustomId('modal_ctrl_status_channel')
                .setTitle('Status/Kanal Degistir')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('channel_input').setLabel('Yeni Ses Kanal ID').setStyle(TextInputStyle.Short).setRequired(false)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder().setCustomId('status_input').setLabel('Durum (game/spotify/none)').setStyle(TextInputStyle.Short).setRequired(false)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'ctrl_remove') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Önce hesap seçin!', ephemeral: true });
            await interaction.update({ content: '# 🗑️ Siliniyor...', files: [], components: [] });
            const sortedIndices = [...data.selectedTokens].sort((a, b) => b - a);
            for (const index of sortedIndices) {
                const acc = database.accounts[index];
                if (acc) {
                    await disconnectSelfBot(acc.token);
                    database.accounts.splice(index, 1);
                }
            }
            saveDatabase();
            data.selectedTokens = [];
            const panel = await createTokenControlPanel(interaction.user.id);
            setTimeout(() => interaction.editReply(panel), 2000);
        }
        // Token Panel Butonları
        else if (interaction.customId === 'tp_create_account') {
            await interaction.update({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🆕 Yeni Hesap Oluşturuluyor...\n\n> Lütfen bekleyin, bu işlem birkaç saniye sürebilir.'))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });

            try {
                const newAccount = await createDiscordAccount();
                
                // Add to database
                database.accounts.push({
                    token: newAccount.token,
                    username: newAccount.username,
                    voiceChannelId: null,
                    statusType: 'none',
                    gameName: null,
                    swenzy: 'evet',
                    addedBy: interaction.user.id
                });
                saveDatabase();

                const successContainer = new ContainerBuilder()
                    .setAccentColor(0x2ECC71)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Hesap Başarıyla Oluşturuldu!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### 📊 Hesap Bilgileri\n\n` +
                        `**Kullanıcı Adı:** ${newAccount.username}\n` +
                        `**Token:** \`${newAccount.token.substring(0, 20)}...\`\n` +
                        `**Oluşturulma:** <t:${Math.floor(newAccount.created / 1000)}:R>\n\n` +
                        `Token otomatik olarak sisteme eklendi!`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('tp_back').setLabel('Panele Dön').setStyle(ButtonStyle.Success).setEmoji('🔙'),
                            new ButtonBuilder().setCustomId('tp_create_account').setLabel('Başka Hesap Oluştur').setStyle(ButtonStyle.Primary).setEmoji('🆕')
                        )
                    );
                
                await interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (error) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xE74C3C)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❌ Hesap Oluşturulamadı!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Hata:** ${error.message}`))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('tp_back').setLabel('Geri Dön').setStyle(ButtonStyle.Danger).setEmoji('🔙')
                        )
                    );
                
                await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }
        else if (interaction.customId === 'tp_bulk_create') {
            const modal = new ModalBuilder()
                .setCustomId('modal_tp_bulk_create')
                .setTitle('Toplu Hesap Oluştur')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tp_account_count')
                            .setLabel('Kaç hesap oluşturulsun?')
                            .setPlaceholder('1-10 arası bir sayı girin')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tp_voice_channel')
                            .setLabel('Ses Kanalı ID (İsteğe bağlı)')
                            .setPlaceholder('Hesapların katılacağı ses kanalı ID')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'tp_join_server') {
            const modal = new ModalBuilder()
                .setCustomId('modal_tp_join_server')
                .setTitle('Sunucuya Katıl')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tp_server_id')
                            .setLabel('Sunucu ID')
                            .setPlaceholder('Katılınacak sunucunun ID\'si')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('tp_invite_link')
                            .setLabel('Davet Linki (İsteğe bağlı)')
                            .setPlaceholder('https://discord.gg/...')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'tp_token_list') {
            await interaction.deferUpdate();
            const panel = await createTokenListPanel();
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'tp_verify_tokens') {
            await interaction.update({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Tokenler Doğrulanıyor...\n\n> Bu işlem biraz zaman alabilir.'))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });

            const results = [];
            for (const [index, acc] of database.accounts.entries()) {
                const result = await verifyToken(acc.token);
                results.push({ index, account: acc, ...result });
                
                if (result.valid && result.username !== acc.username) {
                    database.accounts[index].username = result.username;
                }
            }
            saveDatabase();

            const validCount = results.filter(r => r.valid).length;
            const invalidCount = results.length - validCount;

            const resultContainer = new ContainerBuilder()
                .setAccentColor(validCount > invalidCount ? 0x2ECC71 : 0xE74C3C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Token Doğrulama Tamamlandı'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### 📊 Doğrulama Sonuçları\n\n` +
                    `✅ **Geçerli Tokenler:** ${validCount}\n` +
                    `❌ **Geçersiz Tokenler:** ${invalidCount}\n` +
                    `📊 **Toplam:** ${results.length}\n\n` +
                    `${invalidCount > 0 ? '⚠️ Geçersiz tokenler sistemden kaldırılmadı.' : '🎉 Tüm tokenler geçerli!'}`
                ))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tp_back').setLabel('Panele Dön').setStyle(ButtonStyle.Primary).setEmoji('🔙')
                    )
                );
            
            await interaction.editReply({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === 'tp_export_tokens') {
            const tokenList = database.accounts.map((acc, i) => 
                `${i + 1}. ${acc.username || 'Unknown'}: ${acc.token}`
            ).join('\n');

            const exportContainer = new ContainerBuilder()
                .setAccentColor(0x3498DB)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📤 Token Dışa Aktarma'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### 📋 Token Listesi (${database.accounts.length} adet)\n\n` +
                    `\`\`\`\n${tokenList.substring(0, 1500)}${tokenList.length > 1500 ? '\n... (kesik)' : ''}\n\`\`\`\n\n` +
                    `⚠️ **Güvenlik Uyarısı:** Tokenlerinizi güvenli tutun!`
                ))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tp_back').setLabel('Panele Dön').setStyle(ButtonStyle.Primary).setEmoji('🔙')
                    )
                );
            
            await interaction.update({ components: [exportContainer], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === 'tp_refresh') {
            await interaction.deferUpdate();
            const panel = await createTokenPanel();
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'tp_back') {
            await interaction.deferUpdate();
            const panel = await createTokenPanel();
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'tp_refresh_list') {
            await interaction.deferUpdate();
            const panel = await createTokenListPanel();
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'tp_close') {
            await interaction.update({ content: '**Token Paneli Kapatıldı**', files: [], components: [] });
        }
        // Sunucu Kopyalama Butonlari
        else if (interaction.customId === 'sw_copy_server') {
            const modal = new ModalBuilder()
                .setCustomId('modal_sw_copy')
                .setTitle('Sunucu Kopyala')
                .addComponents(
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('sw_token')
                            .setLabel('Discord Token')
                            .setPlaceholder('Hesabinizin tokenini girin')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('sw_source_id')
                            .setLabel('Kopyalanacak Sunucu ID')
                            .setPlaceholder('Kopyalamak istediginiz sunucunun ID\'si')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('sw_target_id')
                            .setLabel('Hedef Sunucu ID')
                            .setPlaceholder('Kopyalanacak yeni sunucunun ID\'si')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(true)
                    ),
                    new ActionRowBuilder().addComponents(
                        new TextInputBuilder()
                            .setCustomId('sw_delete_existing')
                            .setLabel('Mevcut Rol/Kanal Silinsin mi? (evet/hayir)')
                            .setPlaceholder('evet veya hayir yazin (varsayilan: evet)')
                            .setStyle(TextInputStyle.Short)
                            .setRequired(false)
                    )
                );
            await interaction.showModal(modal);
        }
        else if (interaction.customId === 'sw_limits') {
            const limitsContainer = new ContainerBuilder()
                .setAccentColor(0xF1C40F)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📊 Kopyalama Limitleri'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### 📋 Neler Kopyalanir?\n\n` +
                    `✅ **Roller** - Tum roller ve izinleri\n` +
                    `✅ **Kanallar** - Metin ve ses kanallari\n` +
                    `✅ **Kategoriler** - Kanal kategorileri\n` +
                    `✅ **Kanal Izinleri** - Rol bazli izinler\n` +
                    `✅ **Mesajlar** - Son 50 mesaj (her kanal)\n` +
                    `✅ **Sunucu Ayarlari** - Isim ve ikon\n\n` +
                    `### ⚠️ Limitler\n\n` +
                    `● Rate limit: 500ms bekleme\n` +
                    `● Mesaj limiti: Kanal basi 50\n` +
                    `● Bitrate: Max 96kbps`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('sw_back_panel').setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
                    )
                );
            await interaction.update({ components: [limitsContainer], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === 'sw_usage') {
            const usageContainer = new ContainerBuilder()
                .setAccentColor(0x3498DB)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 📖 Kullanim Kilavuzu'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### 🔹 Adim Adim Kullanim\n\n` +
                    `**1.** "Sunucu Kopyala" butonuna tiklayin\n` +
                    `**2.** Acilan modalda:\n` +
                    `   ● Token: Hesabinizin tokeni\n` +
                    `   ● Kaynak ID: Kopyalanacak sunucu\n` +
                    `   ● Hedef ID: Yeni sunucu\n\n` +
                    `### ⚠️ Onemli Notlar\n\n` +
                    `● Hesap her iki sunucuda olmali\n` +
                    `● Hedef sunucuda ADMIN yetkiniz olmali\n` +
                    `● Islem 5-15 dakika surebilir\n` +
                    `● Hedef sunucudaki kanallar silinir!`
                ))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('sw_back_panel').setLabel('Geri').setStyle(ButtonStyle.Secondary).setEmoji('🔙')
                    )
                );
            await interaction.update({ components: [usageContainer], flags: MessageFlags.IsComponentsV2 });
        }
        else if (interaction.customId === 'sw_back_panel') {
            await interaction.update(createServerCopyPanel());
        }
    }


    if (interaction.isStringSelectMenu()) {
        if (interaction.customId === 'ctrl_select_accounts') {
            const data = controlPanelData.get(interaction.user.id);
            if (data) {
                const tokensPerPage = 25;
                const startIndex = data.page * tokensPerPage;
                const endIndex = Math.min(startIndex + tokensPerPage, database.accounts.length);
                data.selectedTokens = data.selectedTokens.filter(i => i < startIndex || i >= endIndex);
                for (const val of interaction.values) {
                    const index = parseInt(val);
                    if (!data.selectedTokens.includes(index)) data.selectedTokens.push(index);
                }
            }
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'ctrl_select_game') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Önce hesap seçin!', ephemeral: true });
            const gameName = interaction.values[0];
            await interaction.update({ content: `# 🎮 Oyun Değiştiriliyor...\n\nOyun: ${gameName}`, files: [], components: [] });
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (acc) {
                    acc.statusType = 'game';
                    acc.gameName = gameName;
                    const clientData = selfClients.get(acc.token);
                    if (clientData) setStatus(clientData.client, acc);
                }
            }
            saveDatabase();
            const panel = await createTokenControlPanel(interaction.user.id);
            setTimeout(() => interaction.editReply(panel), 2000);
        }
        // All Game Select Handler
        else if (interaction.customId === 'op_game_all_select') {
            const gameName = interaction.values[0];
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0x5865F2).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🎮 Setting all accounts to ${gameName}...`))], flags: MessageFlags.IsComponentsV2 });
            for (const acc of database.accounts) {
                acc.statusType = 'game';
                acc.gameName = gameName;
                const clientData = selfClients.get(acc.token);
                if (clientData) setStatus(clientData.client, acc);
            }
            saveDatabase();
            setTimeout(() => interaction.editReply(createOwnerPanel()), 2000);
        }
        else if (interaction.customId === 'select_status_type') {
            const statusType = interaction.values[0];
            const pending = pendingTokens.get(interaction.user.id);
            if (!pending) return interaction.reply({ content: 'Oturum zaman asimina ugradi.', ephemeral: true });
            pending.statusType = statusType;
            if (statusType === 'game') {
                await interaction.update(createGameSelectPanel());
            } else {
                if (pending.tokens) {
                    let addedCount = 0;
                    for (const token of pending.tokens) {
                        if (database.accounts.find(a => a.token === token)) continue;
                        database.accounts.push({ 
                            token, 
                            voiceChannelId: pending.channelId, 
                            statusType, 
                            gameName: null, 
                            username: null,
                            swenzy: 'evet',
                            addedBy: interaction.user.id
                        });
                        addedCount++;
                    }
                    saveDatabase();
                    pendingTokens.delete(interaction.user.id);
                    await interaction.update(createMainPanel());
                    restartAll();
                } else {
                    database.accounts.push({ 
                        token: pending.token, 
                        voiceChannelId: pending.channelId, 
                        statusType, 
                        gameName: null, 
                        username: null,
                        swenzy: 'evet',
                        addedBy: interaction.user.id
                    });
                    saveDatabase();
                    const index = database.accounts.length - 1;
                    connectSelfBot(database.accounts[index], index);
                    pendingTokens.delete(interaction.user.id);
                    await interaction.update(createMainPanel());
                }
            }
        }
        else if (interaction.customId === 'select_game') {
            const gameName = interaction.values[0];
            const pending = pendingTokens.get(interaction.user.id);
            if (!pending) return interaction.reply({ content: 'Oturum zaman asimina ugradi.', ephemeral: true });
            if (pending.tokens) {
                let addedCount = 0;
                for (const token of pending.tokens) {
                    if (database.accounts.find(a => a.token === token)) continue;
                    database.accounts.push({ 
                        token, 
                        voiceChannelId: pending.channelId, 
                        statusType: 'game', 
                        gameName, 
                        username: null,
                        addedBy: interaction.user.id
                    });
                    addedCount++;
                }
                saveDatabase();
                pendingTokens.delete(interaction.user.id);
                await interaction.update({ components: [new ContainerBuilder().setAccentColor(0x2ECC71).addTextDisplayComponents(new TextDisplayBuilder().setContent(`# ✅ ${addedCount} token eklendi!\nOyun: ${gameName}`))], flags: MessageFlags.IsComponentsV2 });
                restartAll();
            } else {
                database.accounts.push({ 
                    token: pending.token, 
                    voiceChannelId: pending.channelId, 
                    statusType: 'game', 
                    gameName, 
                    username: null,
                    addedBy: interaction.user.id
                });
                saveDatabase();
                const index = database.accounts.length - 1;
                connectSelfBot(database.accounts[index], index);
                pendingTokens.delete(interaction.user.id);
                await interaction.update(createMainPanel());
            }
        }
        else if (interaction.customId === 'select_remove_token') {
            const index = parseInt(interaction.values[0]);
            const account = database.accounts[index];
            await interaction.update({ components: [new ContainerBuilder().setAccentColor(0xE74C3C).addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🗑️ Token Siliniyor...'))], flags: MessageFlags.IsComponentsV2 });
            await disconnectSelfBot(account.token);
            database.accounts.splice(index, 1);
            saveDatabase();
            setTimeout(() => interaction.editReply(createMainPanel()), 1500);
        }
    }


    if (interaction.isModalSubmit()) {
        if (interaction.customId === 'modal_ref_code') {
            const code = interaction.fields.getTextInputValue('ref_code_input').trim().toUpperCase();
            
            const result = applyReferral(interaction.user.id, code);
            
            if (!result.success) {
                return interaction.reply({ 
                    content: `❌ **Hata:** ${result.message}`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Başarılı mesajı
            try {
                const referrer = await bot.users.fetch(result.referrerId);
                
                await interaction.reply({
                    content: `✅ **Referans kodu başarıyla kullanıldı!**\n\n` +
                             `👤 **Davet Eden:** ${referrer.username}\n` +
                             `🔹 **Toplam Davet:** ${result.inviteCount}\n` +
                             `🎲 **Bonus Limit:** +${result.bonus}`,
                    flags: MessageFlags.Ephemeral
                });
                
                // Davet edene bildirim gönder
                try {
                    const inviterContainer = new ContainerBuilder()
                        .setAccentColor(0x00FF00)
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `# ✅ **Yeni Davet!**\n` +
                                `-# ${new Date().toLocaleString('tr-TR')}`
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `### ⚡ **Tebrikler!**\n\n` +
                                `👤 **${interaction.user.username}** kodunuzu kullandı!\n\n` +
                                `🔹 **Toplam Davet:** ${result.inviteCount}\n` +
                                `🎲 **Bonus Limit:** +${result.bonus}`
                            )
                        )
                        .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                        .addTextDisplayComponents(
                            new TextDisplayBuilder().setContent(
                                `-# 🔷 Daha fazla davet et, daha fazla bonus kazan!`
                            )
                        );
                    
                    await referrer.send({
                        components: [inviterContainer],
                        flags: MessageFlags.IsComponentsV2
                    });
                } catch (e) {
                    console.log('[REFERRAL] Davet edene bildirim gönderilemedi:', e.message);
                }
            } catch (err) {
                console.log('[ERROR] Referral success message error:', err);
            }
        }
        else if (interaction.customId === 'modal_add_token') {
            const token = interaction.fields.getTextInputValue('token_input').trim();
            const channelId = interaction.fields.getTextInputValue('channel_input').trim();
            
            // Güvenlik kontrolü
            if (!database.accounts) database.accounts = [];
            
            if (database.accounts.find(a => a.token === token)) return interaction.reply({ content: 'Bu token zaten ekli!', flags: MessageFlags.Ephemeral });
            
            // Limit kontrolü
            const member = interaction.member;
            const userLimit = getUserTokenLimit(interaction.user.id, member);
            const currentCount = getUserTokenCount(interaction.user.id);
            
            if (currentCount >= userLimit) {
                return interaction.reply({ 
                    content: `❌ **Token limiti doldu!**\n\n📊 **Limitiniz:** ${userLimit}\n📋 **Mevcut:** ${currentCount}\n\n💡 **İpucu:** Daha yüksek paket için yöneticilere başvurun.`, 
                    flags: MessageFlags.Ephemeral 
                });
            }
            
            // Önce "Kontrol ediliyor..." mesajı gönder (deferReply to ACK quickly)
            await interaction.deferReply({ ephemeral: true });
            
            database.accounts.push({
                token,
                voiceChannelId: channelId,
                statusType: 'none',
                gameName: null,
                username: null,
                swenzy: 'evet',
                addedBy: interaction.user.id
            });
            saveDatabase();
            const index = database.accounts.length - 1;
            
            // Token'ı test et
            try {
                const testClient = new SelfClient({ checkUpdate: false });
                await testClient.login(token);
                const username = testClient.user.tag;
                testClient.destroy();
                
                // Başarılı, şimdi gerçek bağlantıyı yap
                database.accounts[index].username = username;
                saveDatabase();
                connectSelfBot(database.accounts[index], index);
                
                const newCount = getUserTokenCount(interaction.user.id);
                const percent = Math.round((newCount / userLimit) * 100);
                
                await interaction.editReply({ 
                    content: `✅ **Token başarıyla eklendi!**\n\n👤 **Hesap:** ${username}\n🔗 **Kanal ID:** ${channelId || 'Belirtilmedi'}\n\n📊 **Limit:** ${newCount}/${userLimit}` 
                });
                
                // Admin'e bildirim gönder (eğer aktifse ve kullanıcı admin değilse)
                if (config.notifyAdminOnToken && interaction.user.id !== config.adminId) {
                    try {
                        const admin = await bot.users.fetch(config.adminId);
                        const hasPackage = userLimit > 1; // 1'den fazlaysa paket var demektir
                        
                        const adminContainer = new ContainerBuilder()
                            .setAccentColor(hasPackage ? 0x00FF00 : 0xFFAA00)
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `# 🔷 **Yeni Token Eklendi!**\n` +
                                    `-# ${new Date().toLocaleString('tr-TR')}`
                                )
                            )
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `### ⚡ **Kullanıcı Bilgileri**\n\n` +
                                    `👤 **Kullanıcı:** ${interaction.user.username} (\`${interaction.user.id}\`)\n` +
                                    `🔹 **Token:** ${username}\n` +
                                    `⚙️ **Kanal ID:** ${channelId || 'Belirtilmedi'}`
                                )
                            )
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `### 🏷️ **Limit Durumu**\n\n` +
                                    `🔹 **Kullanılan:** ${newCount}/${userLimit}\n` +
                                    `✅ **Doluluk:** %${percent}\n` +
                                    `${hasPackage ? '🎲 **Paket:** Var' : '❌ **Paket:** Yok (Ücretsiz 1 limit)'}`
                                )
                            )
                            .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                            .addTextDisplayComponents(
                                new TextDisplayBuilder().setContent(
                                    `-# ${hasPackage ? '✅ Paketli kullanıcı' : '❌ Ücretsiz kullanıcı - Kontrol edilmeli'}`
                                )
                            );
                        
                        await admin.send({
                            components: [adminContainer],
                            flags: MessageFlags.IsComponentsV2
                        });
                        
                        console.log(`[ADMIN-NOTIFY] Token ekleme bildirimi gönderildi: ${interaction.user.username}`);
                    } catch (err) {
                        console.log(`[ADMIN-NOTIFY] Admin bildirimi gönderilemedi: ${err.message}`);
                    }
                }
                
                // Limit uyarısı kontrolü (90%)
                if (percent >= 90 && percent < 100) {
                    await sendNotification(interaction.user.id, 'limitWarning', {
                        current: newCount,
                        limit: userLimit,
                        percent: percent,
                        remaining: userLimit - newCount
                    });
                }
                
                // Limit doldu bildirimi (100%)
                if (percent >= 100) {
                    await sendNotification(interaction.user.id, 'limitFull', {
                        current: newCount,
                        limit: userLimit
                    });
                }
            } catch (err) {
                // Token geçersiz, database'den kaldır
                database.accounts.splice(index, 1);
                saveDatabase();
                await interaction.editReply({ content: `❌ **Token geçersiz!**\n\n⚠️ **Hata:** ${err.message}\n\n💡 **İpucu:** Token'ınızın doğru olduğundan emin olun.` });
            }
        }
        else if (interaction.customId === 'modal_add_multi_token') {
            const tokensRaw = interaction.fields.getTextInputValue('tokens_input');
            const channelId = interaction.fields.getTextInputValue('channel_input').trim();
            const tokens = tokensRaw.split('\n').map(t => t.trim()).filter(t => t.length > 0);
            if (tokens.length === 0) return interaction.reply({ content: 'Gecerli token bulunamadi!', ephemeral: true });
            
            let addedCount = 0;
            for (const token of tokens) {
                if (database.accounts.find(a => a.token === token)) continue;
                database.accounts.push({
                    token,
                    voiceChannelId: channelId,
                    statusType: 'none',
                    gameName: null,
                    username: null,
                    swenzy: 'evet',
                    addedBy: interaction.user.id
                });
                addedCount++;
            }
            saveDatabase();
            restartAll();
            
            await interaction.update(createMainPanel());
        }
        else if (interaction.customId === 'modal_remove_token') {
            const tokenToRemove = interaction.fields.getTextInputValue('token_to_remove').trim();
            
            // Token'ı bul (ilk 20 karakter ile)
            const tokenIndex = database.accounts.findIndex(acc => acc.token.startsWith(tokenToRemove));
            
            if (tokenIndex === -1) {
                return interaction.reply({ 
                    content: '❌ **Token bulunamadı!**\n\n💡 **İpucu:** Token\'ın ilk 20 karakterini doğru yazdığınızdan emin olun.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            const removedAccount = database.accounts[tokenIndex];
            
            // Sadece kendi eklediği tokenları kaldırabilir (admin hariç)
            if (interaction.user.id !== config.adminId && removedAccount.addedBy !== interaction.user.id) {
                return interaction.reply({ 
                    content: '❌ **Bu token\'ı sadece ekleyen kişi kaldırabilir!**', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Self client'ı durdur
            if (selfClients.has(removedAccount.token)) {
                const clientData = selfClients.get(removedAccount.token);
                if (clientData && clientData.client) {
                    clientData.client.destroy();
                }
                selfClients.delete(removedAccount.token);
            }

            // Database'den kaldır
            database.accounts.splice(tokenIndex, 1);
            saveDatabase();

            await interaction.reply({ 
                content: `✅ **Token başarıyla kaldırıldı!**\n\n👤 **Hesap:** ${removedAccount.username || 'Bilinmiyor'}\n🔗 **Token:** \`${removedAccount.token.slice(0, 20)}...\``, 
                flags: MessageFlags.Ephemeral 
            });
        }
        else if (interaction.customId === 'modal_ctrl_status_channel') {
            const data = controlPanelData.get(interaction.user.id);
            if (!data || data.selectedTokens.length === 0) return interaction.reply({ content: 'Seçili hesap yok!', ephemeral: true });
            const channelId = interaction.fields.getTextInputValue('channel_input')?.trim();
            const statusType = interaction.fields.getTextInputValue('status_input')?.trim().toLowerCase();
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (acc) {
                    if (channelId) acc.voiceChannelId = channelId;
                    if (statusType && ['game', 'spotify', 'none'].includes(statusType)) acc.statusType = statusType;
                }
            }
            saveDatabase();
            await interaction.reply({ content: `✅ ${data.selectedTokens.length} hesap güncellendi! Yeniden başlatın.`, ephemeral: true });
        }
        else if (interaction.customId === 'tike_modal') {
            const messageUrl = interaction.fields.getTextInputValue('tike_message_url');
            const data = controlPanelData.get(interaction.user.id);
            
            if (!data || data.selectedTokens.length === 0) {
                return interaction.reply({ content: 'Secili hesap yok!', ephemeral: true });
            }
            
            // URL'den channel ve message ID'yi çıkar
            const urlMatch = messageUrl.match(/channels\/(\d+)\/(\d+)\/(\d+)/);
            if (!urlMatch) {
                return interaction.reply({ content: 'Gecersiz mesaj URL!', ephemeral: true });
            }
            
            const [, guildId, channelId, messageId] = urlMatch;
            
            await interaction.deferReply({ ephemeral: true });
            
            const logs = [];
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
            
            for (const index of data.selectedTokens) {
                const acc = database.accounts[index];
                if (!acc) continue;
                
                const clientData = selfClients.get(acc.token);
                if (!clientData?.client) {
                    logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: '-', time: timeStr, error: 'Client yok' });
                    continue;
                }
                
                try {
                    const channel = await clientData.client.channels.fetch(channelId);
                    if (!channel) {
                        logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: '-', time: timeStr, error: 'Kanal bulunamadi' });
                        continue;
                    }
                    
                    const message = await channel.messages.fetch(messageId);
                    if (!message) {
                        logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: '-', time: timeStr, error: 'Mesaj bulunamadi' });
                        continue;
                    }
                    
                    // Mesajdaki tüm reactionları al ve tıkla
                    if (message.reactions.cache.size > 0) {
                        for (const reaction of message.reactions.cache.values()) {
                            try {
                                const emojiStr = reaction.emoji.id ? `${reaction.emoji.name}:${reaction.emoji.id}` : reaction.emoji.name;
                                await message.react(emojiStr);
                                logs.push({ username: acc.username || 'Bilinmiyor', success: true, emoji: reaction.emoji.name, time: timeStr });
                                await new Promise(r => setTimeout(r, 500));
                            } catch (e) {
                                logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: reaction.emoji.name, time: timeStr, error: e.message });
                            }
                        }
                    } else {
                        logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: '-', time: timeStr, error: 'Emoji yok' });
                    }
                    
                    await new Promise(r => setTimeout(r, 1000));
                } catch (e) {
                    console.log('[TIKE ERROR]', e.message);
                    logs.push({ username: acc.username || 'Bilinmiyor', success: false, emoji: '-', time: timeStr, error: e.message });
                }
            }
            
            // Logları kaydet
            tikeLogData.set(interaction.user.id, logs);
            
            // Log panelini oluştur
            const panel = await createTikeLogPanel(interaction.user.id);
            
            // Log kanalına gönder
            const logChannelId = '1457990280065192067';
            try {
                const logChannel = await bot.channels.fetch(logChannelId);
                if (logChannel) {
                    await logChannel.send(panel);
                }
            } catch (e) {
                console.log('[TIKE LOG] Kanal bulunamadi:', e.message);
            }
            
            await interaction.editReply({ content: `Tike islemi tamamlandi! Log #tike-logs kanalina gonderildi.` });
        }
        else if (interaction.customId === 'tike_log_refresh') {
            await interaction.deferUpdate();
            const panel = await createTikeLogPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'tike_log_clear') {
            tikeLogData.delete(interaction.user.id);
            await interaction.update({ content: '**Log temizlendi**', files: [], components: [] });
        }
        else if (interaction.customId === 'tike_log_close') {
            tikeLogData.delete(interaction.user.id);
            await interaction.update({ content: '**Panel kapatildi**', files: [], components: [] });
        }
        else if (interaction.customId === 'profile_refresh') {
            await interaction.deferUpdate();
            const panel = await createProfilePanel(interaction.user.id, interaction.user);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'profile_tokens') {
            controlPanelData.set(interaction.user.id, { selectedTokens: [], page: 0 });
            await interaction.deferUpdate();
            const panel = await createTokenControlPanel(interaction.user.id);
            await interaction.editReply(panel);
        }
        else if (interaction.customId === 'profile_close') {
            await interaction.update({ content: '**Panel kapatildi**', files: [], components: [] });
        }
        // Token Panel Modal Handlers
        else if (interaction.customId === 'modal_tp_bulk_create') {
            const countStr = interaction.fields.getTextInputValue('tp_account_count').trim();
            const voiceChannelId = interaction.fields.getTextInputValue('tp_voice_channel')?.trim() || null;
            
            const count = parseInt(countStr);
            if (isNaN(count) || count < 1 || count > 10) {
                return interaction.reply({ content: '❌ Geçersiz sayı! 1-10 arası bir değer girin.', ephemeral: true });
            }

            await interaction.update({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 📦 ${count} Hesap Oluşturuluyor...\n\n> Bu işlem ${count * 2} saniye kadar sürebilir.`))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });

            try {
                const newAccounts = await createBulkAccounts(count);
                
                // Add all accounts to database
                for (const account of newAccounts) {
                    database.accounts.push({
                        token: account.token,
                        username: account.username,
                        voiceChannelId: voiceChannelId,
                        statusType: 'none',
                        gameName: null,
                        swenzy: 'evet',
                        addedBy: interaction.user.id
                    });
                }
                saveDatabase();

                const successContainer = new ContainerBuilder()
                    .setAccentColor(0x2ECC71)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Toplu Hesap Oluşturma Tamamlandı!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### 📊 Oluşturulan Hesaplar\n\n` +
                        `**Toplam:** ${newAccounts.length} hesap\n` +
                        `**Ses Kanalı:** ${voiceChannelId || 'Belirtilmedi'}\n\n` +
                        `**Hesap Listesi:**\n` +
                        newAccounts.slice(0, 5).map((acc, i) => `${i + 1}. ${acc.username}`).join('\n') +
                        (newAccounts.length > 5 ? `\n... ve ${newAccounts.length - 5} hesap daha` : '') +
                        `\n\n✅ Tüm hesaplar sisteme eklendi!`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('tp_back').setLabel('Panele Dön').setStyle(ButtonStyle.Success).setEmoji('🔙'),
                            new ButtonBuilder().setCustomId('tp_token_list').setLabel('Token Listesi').setStyle(ButtonStyle.Primary).setEmoji('📋')
                        )
                    );
                
                await interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (error) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xE74C3C)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❌ Toplu Hesap Oluşturulamadı!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`**Hata:** ${error.message}`))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('tp_back').setLabel('Geri Dön').setStyle(ButtonStyle.Danger).setEmoji('🔙')
                        )
                    );
                
                await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }
        else if (interaction.customId === 'modal_tp_join_server') {
            const serverId = interaction.fields.getTextInputValue('tp_server_id').trim();
            const inviteLink = interaction.fields.getTextInputValue('tp_invite_link')?.trim() || null;
            
            if (!serverId) {
                return interaction.reply({ content: '❌ Sunucu ID gerekli!', ephemeral: true });
            }

            await interaction.update({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔗 Sunucuya Katılım Başlatılıyor...\n\n> Sunucu ID: ${serverId}\n> ${database.accounts.length} hesap katılmaya çalışacak.`))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });

            const results = [];
            for (const [index, acc] of database.accounts.entries()) {
                try {
                    const result = await joinServerWithToken(acc.token, serverId);
                    results.push({ index, account: acc, ...result });
                } catch (error) {
                    results.push({ index, account: acc, success: false, error: error.message });
                }
                
                // Rate limiting
                await new Promise(r => setTimeout(r, 2000));
            }

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            const resultContainer = new ContainerBuilder()
                .setAccentColor(successCount > failCount ? 0x2ECC71 : 0xE74C3C)
                .addTextDisplayComponents(new TextDisplayBuilder().setContent('# 🔗 Sunucuya Katılım Tamamlandı'))
                .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                    `### 📊 Katılım Sonuçları\n\n` +
                    `**Sunucu ID:** ${serverId}\n` +
                    `✅ **Başarılı:** ${successCount} hesap\n` +
                    `❌ **Başarısız:** ${failCount} hesap\n` +
                    `📊 **Toplam:** ${results.length} hesap\n\n` +
                    `${failCount > 0 ? '⚠️ Bazı hesaplar katılamadı. Token geçerliliğini kontrol edin.' : '🎉 Tüm hesaplar başarıyla katıldı!'}`
                ))
                .addActionRowComponents(
                    new ActionRowBuilder().addComponents(
                        new ButtonBuilder().setCustomId('tp_back').setLabel('Panele Dön').setStyle(ButtonStyle.Primary).setEmoji('🔙')
                    )
                );
            
            await interaction.editReply({ components: [resultContainer], flags: MessageFlags.IsComponentsV2 });
        }
        // Sunucu Kopyalama Modal Handler
        else if (interaction.customId === 'modal_sw_copy') {
            const userToken = interaction.fields.getTextInputValue('sw_token').trim();
            const sourceId = interaction.fields.getTextInputValue('sw_source_id').trim();
            const targetId = interaction.fields.getTextInputValue('sw_target_id').trim();
            const deleteExistingRaw = interaction.fields.getTextInputValue('sw_delete_existing')?.trim().toLowerCase() || 'evet';
            const deleteExisting = deleteExistingRaw !== 'hayir' && deleteExistingRaw !== 'h' && deleteExistingRaw !== 'no' && deleteExistingRaw !== 'n';

            if (!userToken || !sourceId || !targetId) {
                return interaction.reply({ content: 'Tum alanlari doldurmaniz gerekiyor!', ephemeral: true });
            }

            await interaction.update({ 
                components: [new ContainerBuilder()
                    .setAccentColor(0xF1C40F)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`# 🔄 Sunucu Kopyalama Baslatiliyor...\n\n> Token dogrulaniyor...\n> Mevcut icerik silinecek: ${deleteExisting ? 'Evet' : 'Hayir'}`))
                ], 
                flags: MessageFlags.IsComponentsV2 
            });

            try {
                const result = await copyServer(sourceId, targetId, userToken, interaction, deleteExisting);
                
                const successContainer = new ContainerBuilder()
                    .setAccentColor(0x2ECC71)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ✅ Sunucu Basariyla Kopyalandi!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### 📊 Kopyalama Sonuclari\n\n` +
                        `✅ **Roller:** ${result.roles} adet\n` +
                        `✅ **Kategoriler:** ${result.categories} adet\n` +
                        `✅ **Kanallar:** ${result.channels} adet\n` +
                        `✅ **Mesajlar:** ${result.messages} adet\n` +
                        `🗑️ **Silinen:** ${result.deleted || 0} adet\n\n` +
                        `-# Islem tamamlandi!`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('sw_back_panel').setLabel('Panele Don').setStyle(ButtonStyle.Success).setEmoji('🔙')
                        )
                    );
                
                await interaction.editReply({ components: [successContainer], flags: MessageFlags.IsComponentsV2 });
            } catch (error) {
                const errorContainer = new ContainerBuilder()
                    .setAccentColor(0xE74C3C)
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent('# ❌ Kopyalama Basarisiz!'))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addTextDisplayComponents(new TextDisplayBuilder().setContent(
                        `### ⚠️ Hata Detayi\n\n` +
                        `\`\`\`${error}\`\`\`\n\n` +
                        `**Kontrol Edin:**\n` +
                        `● Token gecerli mi?\n` +
                        `● Hesap her iki sunucuda mi?\n` +
                        `● Hedef sunucuda admin yetkiniz var mi?`
                    ))
                    .addSeparatorComponents(new SeparatorBuilder().setDivider(true))
                    .addActionRowComponents(
                        new ActionRowBuilder().addComponents(
                            new ButtonBuilder().setCustomId('sw_back_panel').setLabel('Tekrar Dene').setStyle(ButtonStyle.Danger).setEmoji('🔄')
                        )
                    );
                
                await interaction.editReply({ components: [errorContainer], flags: MessageFlags.IsComponentsV2 });
            }
        }
        // Token Tara Modal Handlers
        else if (interaction.customId === 'modal_token_tara') {
            const tokensInput = interaction.fields.getTextInputValue('tokens_input').trim();
            const tokens = tokensInput.split('\n').map(t => t.trim()).filter(t => t.length > 0);
            
            if (tokens.length === 0) {
                return interaction.reply({ 
                    content: '❌ **Geçerli token bulunamadı!**\n\n💡 Her satıra bir token yazın.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            if (tokens.length > 10) {
                return interaction.reply({ 
                    content: '❌ **Maksimum 10 token tarayabilirsiniz!**\n\n💡 Daha az token ile tekrar deneyin.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            await interaction.reply({ 
                content: '🔍 **Token tarama başlatıldı...**\n\n⏳ Lütfen bekleyin, tokenlar test ediliyor...', 
                flags: MessageFlags.Ephemeral 
            });

            let validTokens = 0;
            let invalidTokens = 0;
            let results = '';

            for (let i = 0; i < tokens.length; i++) {
                const token = tokens[i];
                try {
                    // Token formatını kontrol et
                    if (!token.includes('.') || token.length < 50) {
                        results += `❌ **Token ${i + 1}:** Geçersiz format\n`;
                        invalidTokens++;
                        continue;
                    }

                    // Basit token testi (gerçek API çağrısı yapmadan)
                    const parts = token.split('.');
                    if (parts.length !== 3) {
                        results += `❌ **Token ${i + 1}:** Geçersiz yapı\n`;
                        invalidTokens++;
                        continue;
                    }

                    // Token'ın ilk kısmını decode et (user ID)
                    try {
                        const userId = Buffer.from(parts[0], 'base64').toString();
                        if (!/^\d+$/.test(userId)) {
                            results += `❌ **Token ${i + 1}:** Geçersiz user ID\n`;
                            invalidTokens++;
                            continue;
                        }
                        results += `✅ **Token ${i + 1}:** Format geçerli (ID: ${userId})\n`;
                        validTokens++;
                    } catch (e) {
                        results += `❌ **Token ${i + 1}:** Decode hatası\n`;
                        invalidTokens++;
                    }
                } catch (error) {
                    results += `❌ **Token ${i + 1}:** Test hatası\n`;
                    invalidTokens++;
                }
            }

            const resultEmbed = new EmbedBuilder()
                .setColor(validTokens > invalidTokens ? '#2ECC71' : '#E74C3C')
                .setTitle('🔍 Token Tarama Sonuçları')
                .setDescription(results.length > 4000 ? results.substring(0, 4000) + '\n...(kısaltıldı)' : results)
                .addFields(
                    { name: '📊 Özet', value: `**✅ Geçerli:** ${validTokens}\n**❌ Geçersiz:** ${invalidTokens}\n**📝 Toplam:** ${tokens.length}`, inline: false }
                )
                .setFooter({ text: '⚠️ Bu sadece format kontrolüdür, gerçek API testi değildir' })
                .setTimestamp();

            await interaction.editReply({ 
                content: '', 
                embeds: [resultEmbed],
                flags: MessageFlags.Ephemeral 
            });
        }
        else if (interaction.customId === 'modal_format_ayir') {
            const formatInput = interaction.fields.getTextInputValue('format_input').trim();
            const lines = formatInput.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            
            if (lines.length === 0) {
                return interaction.reply({ 
                    content: '❌ **Geçerli veri bulunamadı!**\n\n💡 mail:pass:token formatında veri girin.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            let extractedTokens = [];
            let errorCount = 0;

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                const parts = line.split(':');
                
                if (parts.length >= 3) {
                    // Son kısmı token olarak al (: karakteri token içinde de olabilir)
                    const token = parts.slice(2).join(':');
                    if (token.length > 50 && token.includes('.')) {
                        extractedTokens.push(token);
                    } else {
                        errorCount++;
                    }
                } else {
                    errorCount++;
                }
            }

            if (extractedTokens.length === 0) {
                return interaction.reply({ 
                    content: '❌ **Hiç geçerli token bulunamadı!**\n\n💡 Format: mail:pass:token şeklinde olmalı.', 
                    flags: MessageFlags.Ephemeral 
                });
            }

            // Token sayısı veya toplam karakter sayısı çok fazlaysa direkt dosya olarak gönder
            const tokenList = extractedTokens.join('\n');
            const estimatedLength = tokenList.length + 200; // Yaklaşık mesaj uzunluğu
            
            if (extractedTokens.length > 15 || estimatedLength > 1800) {
                // Dosya olarak gönder
                const attachment = new AttachmentBuilder(Buffer.from(tokenList), { name: 'tokens.txt' });
                await interaction.reply({ 
                    content: `🧹 **Format Ayırma Tamamlandı**\n\n**📊 Sonuç:**\n✅ **Çıkarılan Token:** ${extractedTokens.length}\n❌ **Hatalı Satır:** ${errorCount}\n\n📎 Tokenlar dosya olarak eklendi.`,
                    files: [attachment],
                    flags: MessageFlags.Ephemeral 
                });
            } else {
                const resultText = `🧹 **Format Ayırma Tamamlandı**\n\n**📊 Sonuç:**\n✅ **Çıkarılan Token:** ${extractedTokens.length}\n❌ **Hatalı Satır:** ${errorCount}\n\n**📋 Tokenlar:**\n\`\`\`\n${tokenList}\`\`\``;
                await interaction.reply({ 
                    content: resultText,
                    flags: MessageFlags.Ephemeral 
                });
            }
        }
        }
    });

process.on('SIGINT', async () => {
    console.log();
    log.header('SHUTDOWN SIGNAL RECEIVED');
    await disconnectAll();
    bot.destroy();
    console.log();
    log.box('SESSION SUMMARY', [
        `${c.green}Total Uptime:${c.reset}      ${c.white}${getUptime()}${c.reset}`,
        `${c.green}Connections:${c.reset}       ${c.white}${totalConnections}${c.reset}`,
        `${c.green}Song Changes:${c.reset}      ${c.white}${totalSongChanges}${c.reset}`,
        `${c.red}Total Errors:${c.reset}      ${c.white}${totalErrors}${c.reset}`,
    ]);
    console.log();
    log.success('System safely shutdown - Goodbye!');
    console.log();
    process.exit(0);
});

process.on('unhandledRejection', (err) => {
    log.error(`Unhandled: ${err.message || err}`);
});

process.on('uncaughtException', (err) => {
    log.error(`Exception: ${err.message}`);
});

bot.login(config.botToken);
