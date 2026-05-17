import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';
import path from 'path';
import fs from 'fs';
import * as dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;
const EXTERNAL_API_URL = (process.env.EXTERNAL_API_URL || 'https://ob53-emote-api-jd1f.onrender.com').trim().replace(/\/$/, '');
const EXTERNAL_API_KEY = process.env.EXTERNAL_API_KEY || '';

// Initialize Telegram Bot
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken || botToken.trim() === "") {
  console.error('❌ CRITICAL: TELEGRAM_BOT_TOKEN is missing!');
  console.error('Please set TELEGRAM_BOT_TOKEN in your Environment Variables.');
} else {
  console.log('✅ TELEGRAM_BOT_TOKEN found.');
}

if (!process.env.EXTERNAL_API_URL) {
  console.warn('⚠️ EXTERNAL_API_URL is using default: https://ob53-emote-api-jd1f.onrender.com');
} else {
  console.log(`✅ EXTERNAL_API_URL set to: ${EXTERNAL_API_URL}`);
}

const bot = new Telegraf(botToken || 'DUMMY_TOKEN');

// Serve static files from Vite build (for the frontend if any)
const distPath = path.join(process.cwd(), 'dist');

// Emote Mapping
const emoteMap: Record<string, string> = {
  '1': '909042007', '2': '909000002', '3': '909000010', '4': '909000014', '5': '909000020',
  '6': '909000045', '7': '909000034', '8': '909000088', '9': '909049003', '10': '909046006',
  '11': '909049010', '12': '909051003', '13': '909033002', '14': '909041005', '15': '909038010',
  '16': '909039011', '17': '909040010', '18': '909000081', '19': '909000085', '20': '909000063',
  '21': '909000075', '22': '909033001', '23': '909000090', '24': '909000068', '25': '909000098',
  '26': '909035007', '27': '909037011', '28': '909038012', '29': '909035012', '30': '909042008'
};

const helpMessage = `
📌 Available Commands:
/e [team_code] [uid] [emote_id]  
Ex: /e 8026897 2560267210 1
/e 8026897 2560267210 909000001

Rear emote code: 1 se 10 tak
Evo emote code: 11 se 30 tak
ALL EMOTE CODE /emote_code
`;

const helpKeyboard = Markup.inlineKeyboard([
  [Markup.button.url('JOIN LIKE GROUP', 'https://t.me/ankitraj4444')]
]);

// Telegram commands
bot.catch((err: any, ctx: any) => {
  console.error(`[Bot Error] ${err.message}`);
  if (ctx) ctx.reply(`❌ Error: ${err.message}`, helpKeyboard).catch(() => {});
});

bot.use(async (ctx, next) => {
  if (ctx.message && 'text' in ctx.message) {
    const from = ctx.from?.username || ctx.from?.first_name || 'User';
    console.log(`[Bot Message] ${from}: ${ctx.message.text}`);
  }
  return next();
});

// Explicit registration
const registerCommands = () => {
  bot.command('start', (ctx) => {
    return ctx.reply(helpMessage, helpKeyboard);
  });
  
  bot.command('help', (ctx) => {
    return ctx.reply(helpMessage, helpKeyboard);
  });
  
  bot.command('test', (ctx) => {
    return ctx.reply('🤖 Bot online hai aur kaam kar raha hai!', helpKeyboard);
  });

  bot.command('emote_code', (ctx) => {
    return ctx.reply('📜 All Emote Codes are here: https://t.me/gtdealer/181', helpKeyboard);
  });

  bot.command('leave', async (ctx) => {
    try {
      await callJoinApi({ action: 'leave' });
      ctx.reply('👋 Leave command bhej diya gaya hai.', helpKeyboard);
    } catch (err: any) {
      ctx.reply(`❌ Error: ${err.message}`, helpKeyboard);
    }
  });

  bot.command('e', async (ctx) => {
    const parts = ctx.message.text.split(/\s+/);
    if (parts.length < 4) return ctx.reply('⚠️ Sahi tarika: /e <tc> <uid> <id_or_short_id>', helpKeyboard);
    const [_, tc, uid, raw_id] = parts;
    const emote_id = emoteMap[raw_id] || raw_id;
    try {
      await callJoinApi({ tc, uid1: uid, emote_id });
      ctx.reply(`✅ Emote ${emote_id} UID ${uid} ke liye bhej diya.`, helpKeyboard);
    } catch (err: any) {
      ctx.reply(`❌ Error: ${err.message}`, helpKeyboard);
    }
  });
};

registerCommands();

// Helper function to call the external API with robustness
async function callJoinApi(params: any) {
  // Normalize team code and emote id
  const tc = params.tc || params.t || params.teamcode || params.team_code;
  const emote = params.emote_id || params.emote || params.id;
  
  // Create a clean set of parameters
  const finalParams: any = { ...params };
  if (tc) {
    finalParams.tc = tc;
    finalParams.t = tc;
    finalParams.teamcode = tc;
    finalParams.team_code = tc;
  }
  if (emote) {
    finalParams.emote = emote;
    finalParams.emote_id = emote;
    finalParams.id = emote;
  }

  // Strategies to try in order
  const strategies = [
    { url: `${EXTERNAL_API_URL}/join`, method: 'get' as const },
    { url: `${EXTERNAL_API_URL}/join_squad`, method: 'get' as const },
    { url: EXTERNAL_API_URL, method: 'get' as const },
    { url: `${EXTERNAL_API_URL}/api/join`, method: 'get' as const },
    { url: `${EXTERNAL_API_URL}/join`, method: 'post' as const },
  ];

  let lastError: any = null;

  for (const strategy of strategies) {
    try {
      console.log(`[API] Attempting ${strategy.method.toUpperCase()}: ${strategy.url}`);
      console.log(`[API] Params:`, JSON.stringify(finalParams));
      
      const config = { 
        timeout: 12000,
        headers: EXTERNAL_API_KEY ? { 'Authorization': `Bearer ${EXTERNAL_API_KEY}` } : {}
      };
      const response = strategy.method === 'get' 
        ? await axios.get(strategy.url, { ...config, params: finalParams })
        : await axios.post(strategy.url, finalParams, config);
      
      console.log(`[API] Success (${strategy.url}):`, response.status, response.data);
      return response;
    } catch (error: any) {
      const status = error.response?.status;
      const data = error.response?.data;
      console.warn(`[API] Failed (${strategy.url}): ${status || error.message}`, data);
      lastError = error;
    }
  }
  
  throw lastError || new Error('All API strategies failed');
}

async function handleCommand(commandText: string): Promise<string> {
  const parts = commandText.trim().split(/\s+/);
  const cmd = parts[0].toLowerCase();
  const args = parts.slice(1);

  if (cmd === '/e') {
    if (args.length < 3) return 'Usage: /e <tc> <uid1> [uid2...] <id>';
    const tc = args.shift();
    const raw_id = args.pop();
    const uids = args;
    const emote_id = (raw_id && emoteMap[raw_id]) ? emoteMap[raw_id] : raw_id;
    if (!emote_id) return '❌ ID is required.';
    const params: any = { tc, emote_id };
    uids.forEach((uid, i) => params[`uid${i + 1}`] = uid);
    await callJoinApi(params);
    return `✅ Emote triggered: ${emote_id} in Squad ${tc}`;
  }

  if (cmd === '/leave') {
    await callJoinApi({ action: 'leave' });
    return '👋 Leave command sent';
  }

  if (cmd === '/emote_code') {
    return '📜 All Emote Codes are here: https://t.me/gtdealer/181';
  }

  if (cmd === '/help' || cmd === '/start') return helpMessage;
  return '❌ Unknown command';
}

bot.on('text', (ctx) => {
  const text = ctx.message.text;
  if (!text.startsWith('/')) {
    // If user sends normal text, reply with help and button
    return ctx.reply('⚠️ Use commands to interact with me!', helpKeyboard);
  }
});

// Routes for the web app (dashboard) are now handled inside main() to ensure correct order

// Start everything
async function main() {
  console.log('--- Server Startup ---');
  
  try {
    if (botToken && botToken.trim() !== "") {
      console.log('Launching bot...');
      bot.launch()
        .then(() => console.log('✅ Bot launched successfully'))
        .catch((err) => {
          console.error('❌ Bot failed to launch:', err.message);
          // Don't kill the server if only the bot fails
        });
    } else {
      console.log('⚠️ No valid TELEGRAM_BOT_TOKEN found, bot will not be active.');
    }
  } catch (err: any) {
    console.error('❌ Synchronous bot launch error:', err.message);
  }

  // Define API routes BEFORE Vite middleware
  app.use(express.json());

  app.get('/api/health', async (req, res) => {
    console.log('[API] Health check request received');
    let externalStatus = 'Unknown';
    try {
      const start = Date.now();
      await axios.get(EXTERNAL_API_URL, { timeout: 2000 });
      externalStatus = `Online (${Date.now() - start}ms)`;
    } catch (err: any) {
      externalStatus = err.response ? `Error ${err.response.status}` : 'Offline/Timeout';
    }

    res.json({ 
      status: 'ok', 
      botRunning: !!botToken && botToken !== 'YOUR_TELEGRAM_BOT_TOKEN_HERE',
      externalApi: EXTERNAL_API_URL,
      externalStatus
    });
  });

  app.post('/api/execute', async (req, res) => {
    const { command } = req.body;
    console.log(`[API] Execute request: ${command}`);
    if (!command) return res.status(400).json({ error: 'Command is required' });
    try {
      const result = await handleCommand(command);
      res.json({ result });
    } catch (error: any) {
      console.error(`[API] Execute error: ${error.message}`);
      res.status(500).json({ error: error.message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    console.log('🔧 Starting Vite in dev mode...');
    try {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('✅ Vite mounted');
    } catch (e: any) {
      console.error('❌ Vite failed to mount:', e.message);
    }
  } else {
    console.log('🚀 Production mode active');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    } else {
      console.warn('⚠️ Dist path not found, static serving might fail');
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`📡 Server listening on port ${PORT}`);
  });
}

main();
