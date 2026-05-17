/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import { Bot, CheckCircle2, XCircle, Terminal, MessageSquare, ExternalLink } from 'lucide-react';
import { motion } from 'motion/react';

function CommandExecutor() {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<{ text: string; type: 'success' | 'error' }[]>([]);
  const [executing, setExecuting] = useState(false);

  const handleExecute = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!command.trim() || executing) return;

    setExecuting(true);
    try {
      const res = await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      
      if (!res.ok) throw new Error(data.error || 'Execution failed');
      
      setOutput(prev => [{ text: data.result, type: 'success' }, ...prev].slice(0, 5));
      setCommand('');
    } catch (err: any) {
      setOutput(prev => [{ text: err.message, type: 'error' }, ...prev].slice(0, 5));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
      <form onSubmit={handleExecute} className="p-4 flex gap-2">
        <input 
          type="text" 
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command (e.g. /join 12345)"
          className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 font-mono text-sm focus:outline-none focus:border-emerald-500 transition-colors"
        />
        <button 
          disabled={executing}
          className="bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-neutral-950 px-6 py-2 rounded-xl font-bold text-sm transition-colors cursor-pointer"
        >
          {executing ? '...' : 'Execute'}
        </button>
      </form>
      
      {output.length > 0 && (
        <div className="border-t border-neutral-800 p-4 space-y-2 bg-neutral-950/50">
          {output.map((entry, i) => (
            <div 
              key={i} 
              className={`font-mono text-xs p-2 rounded border ${
                entry.type === 'success' 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                  : 'bg-rose-500/5 border-rose-500/20 text-rose-400'
              }`}
            >
              {entry.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        setStatus(data);
      } catch (err) {
        console.error('Failed to fetch status', err);
      } finally {
        setLoading(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 font-sans selection:bg-emerald-500 selection:text-white p-6 md:p-12">
      <div className="max-w-4xl mx-auto space-y-12">
        {/* Header */}
        <header className="space-y-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3 text-emerald-500"
          >
            <Bot size={32} />
            <h1 className="text-3xl font-bold tracking-tight uppercase">Telegram Emote Bot</h1>
          </motion.div>
          <p className="text-neutral-400 text-lg max-w-2xl leading-relaxed">
            Your bridge between Telegram and the Free Fire Emote Bot. 
            Automate game actions with simple commands via @BotFather.
          </p>
        </header>

        {/* Status Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">Bot Status</h2>
              {status?.botRunning ? (
                <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold uppercase py-1 px-2 bg-emerald-400/10 rounded-full border border-emerald-400/20">
                  <CheckCircle2 size={12} /> Online
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-rose-400 text-xs font-bold uppercase py-1 px-2 bg-rose-400/10 rounded-full border border-rose-400/20">
                  <XCircle size={12} /> Stopped
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-2xl font-mono">
                {status?.botRunning ? 'Connected' : 'Waiting for Token'}
              </p>
              <p className="text-neutral-500 text-sm italic">
                {status?.botRunning ? 'Ready to receive commands.' : 'Please add TELEGRAM_BOT_TOKEN to secrets.'}
              </p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-sm font-medium text-neutral-500 uppercase tracking-wider">External API</h2>
              <span className={`text-xs font-bold uppercase py-1 px-2 rounded-full border ${
                status?.externalStatus?.includes('Online') 
                  ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' 
                  : 'text-rose-400 bg-rose-400/10 border-rose-400/20'
              }`}>
                {status?.externalStatus || 'Checking...'}
              </span>
            </div>
            <div className="space-y-1 overflow-hidden">
              <p className="text-xl font-mono flex items-center gap-2 truncate">
                <ExternalLink size={20} className="text-emerald-500 shrink-0" /> 
                {status?.externalApi?.replace(/^https?:\/\//, '') || 'Not Configured'}
              </p>
              <p className="text-neutral-500 text-sm">
                Commands are forwarded to your Free Fire API.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Command Center */}
        <motion.section 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-2 text-neutral-200">
            <Terminal size={20} className="text-emerald-500" />
            <h2 className="text-xl font-semibold">Command Center</h2>
          </div>

          <CommandExecutor />
        </motion.section>

        {/* Documentation Section */}
        <motion.section 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          <div className="flex items-center gap-2 text-neutral-200">
            <MessageSquare size={20} className="text-emerald-500" />
            <h2 className="text-xl font-semibold">How to Use</h2>
          </div>
          
          <div className="bg-neutral-900/50 rounded-2xl overflow-hidden border border-neutral-800">
            <div className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <p className="text-neutral-300 font-medium font-mono text-sm mb-2">Join Squad:</p>
                  <code className="block bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-400 font-mono text-xs">
                    /join [TEAM_CODE]
                  </code>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium font-mono text-sm mb-2">Emote Action:</p>
                  <code className="block bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-400 font-mono text-xs text-wrap">
                    /d [TEAM_CODE] [UID1] [UID2...] [EMOTE_ID]
                  </code>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium font-mono text-sm mb-2">Fast Emote (Loop):</p>
                  <code className="block bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-400 font-mono text-xs text-wrap">
                    /f [TEAM_CODE] [UID1] [UID2...] [EMOTE_ID]
                  </code>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium font-mono text-sm mb-2">Short Emote (1-30):</p>
                  <code className="block bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-400 font-mono text-xs text-wrap">
                    /e [TEAM_CODE] [UID1] [UID2...] [SHORT_ID]
                  </code>
                </div>
                <div>
                  <p className="text-neutral-300 font-medium font-mono text-sm mb-2">Super Emote & Info:</p>
                  <code className="block bg-neutral-950 p-3 rounded-xl border border-neutral-800 text-emerald-400 font-mono text-xs text-wrap">
                    /s [TEAM_CODE] | /leave | /help | /dev
                  </code>
                </div>
              </div>
            </div>
            
            <div className="bg-neutral-800/20 p-4 border-t border-neutral-800 flex items-center justify-between transition-colors hover:bg-neutral-800/30">
              <span className="text-xs text-neutral-500 uppercase font-bold tracking-widest">Setup Guide</span>
              <a 
                href="https://t.me/BotFather" 
                target="_blank" 
                rel="noreferrer"
                className="text-emerald-500 hover:text-emerald-400 text-xs font-bold flex items-center gap-1 uppercase tracking-wider"
              >
                Go to @BotFather <ExternalLink size={14} />
              </a>
            </div>
          </div>
        </motion.section>

        {/* Warnings */}
        {!status?.botRunning && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm"
          >
            <strong>Action Required:</strong> The Telegram Bot token is missing. Please head to settings and add <code>TELEGRAM_BOT_TOKEN</code> to your secrets.
          </motion.div>
        )}
      </div>
    </div>
  );
}

