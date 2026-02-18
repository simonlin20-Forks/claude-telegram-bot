/**
 * Command handlers for Claude Telegram Bot.
 *
 * /start, /new, /stop, /status, /resume, /restart
 */

import type { Context } from "grammy";
import { session } from "../session";
import { WORKING_DIR, ALLOWED_USERS, RESTART_FILE, AVAILABLE_MODELS, DEFAULT_MODEL } from "../config";
import { isAuthorized } from "../security";

/**
 * /start - Show welcome message and status.
 */
export async function handleStart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const username = ctx.from?.username || "unknown";

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized. Contact the bot owner for access.");
    return;
  }

  const status = session.isActive ? "Active session" : "No active session";
  const workDir = WORKING_DIR;

  await ctx.reply(
    `🤖 <b>Claude Telegram Bot</b>\n\n` +
      `Status: ${status}\n` +
      `Working directory: <code>${workDir}</code>\n\n` +
      `<b>Commands:</b>\n` +
      `/new - Start fresh session\n` +
      `/stop - Stop current query\n` +
      `/status - Show detailed status\n` +
      `/context - Show model &amp; context info\n` +
      `/token - Show token usage stats\n` +
      `/usage - Show quota usage\n` +
      `/resume - Resume last session\n` +
      `/retry - Retry last message\n` +
      `/restart - Restart the bot\n` +
      `/model - Switch AI model\n\n` +
      `<b>Tips:</b>\n` +
      `• Prefix with <code>!</code> to interrupt current query\n` +
      `• Use "think" keyword for extended reasoning\n` +
      `• Send photos, voice, or documents`,
    { parse_mode: "HTML" }
  );
}

/**
 * /new - Start a fresh session.
 */
export async function handleNew(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Stop any running query
  if (session.isRunning) {
    const result = await session.stop();
    if (result) {
      await Bun.sleep(100);
      session.clearStopRequested();
    }
  }

  // Clear session
  await session.kill();

  await ctx.reply("🆕 Session cleared. Next message starts fresh.");
}

/**
 * /stop - Stop the current query (silently).
 */
export async function handleStop(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (session.isRunning) {
    const result = await session.stop();
    if (result) {
      // Wait for the abort to be processed, then clear stopRequested so next message can proceed
      await Bun.sleep(100);
      session.clearStopRequested();
    }
    // Silent stop - no message shown
  }
  // If nothing running, also stay silent
}

/**
 * /status - Show detailed status.
 */
export async function handleStatus(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const lines: string[] = ["📊 <b>Bot Status</b>\n"];

  // Session status
  if (session.isActive) {
    lines.push(`✅ Session: Active (${session.sessionId?.slice(0, 8)}...)`);
  } else {
    lines.push("⚪ Session: None");
  }

  // Query status
  if (session.isRunning) {
    const elapsed = session.queryStarted
      ? Math.floor((Date.now() - session.queryStarted.getTime()) / 1000)
      : 0;
    lines.push(`🔄 Query: Running (${elapsed}s)`);
    if (session.currentTool) {
      lines.push(`   └─ ${session.currentTool}`);
    }
  } else {
    lines.push("⚪ Query: Idle");
    if (session.lastTool) {
      lines.push(`   └─ Last: ${session.lastTool}`);
    }
  }

  // Last activity
  if (session.lastActivity) {
    const ago = Math.floor(
      (Date.now() - session.lastActivity.getTime()) / 1000
    );
    lines.push(`\n⏱️ Last activity: ${ago}s ago`);
  }

  // Usage stats
  if (session.lastUsage) {
    const usage = session.lastUsage;
    lines.push(
      `\n📈 Last query usage:`,
      `   Input: ${usage.input_tokens?.toLocaleString() || "?"} tokens`,
      `   Output: ${usage.output_tokens?.toLocaleString() || "?"} tokens`
    );
    if (usage.cache_read_input_tokens) {
      lines.push(
        `   Cache read: ${usage.cache_read_input_tokens.toLocaleString()}`
      );
    }
  }

  // Error status
  if (session.lastError) {
    const ago = session.lastErrorTime
      ? Math.floor((Date.now() - session.lastErrorTime.getTime()) / 1000)
      : "?";
    lines.push(`\n⚠️ Last error (${ago}s ago):`, `   ${session.lastError}`);
  }

  // Working directory
  lines.push(`\n📁 Working dir: <code>${WORKING_DIR}</code>`);

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /resume - Show list of sessions to resume with inline keyboard.
 */
export async function handleResume(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  if (session.isActive) {
    await ctx.reply("Sessione già attiva. Usa /new per iniziare da capo.");
    return;
  }

  // Get saved sessions
  const sessions = session.getSessionList();

  if (sessions.length === 0) {
    await ctx.reply("❌ Nessuna sessione salvata.");
    return;
  }

  // Build inline keyboard with session list
  const buttons = sessions.map((s) => {
    // Format date: "18/01 10:30"
    const date = new Date(s.saved_at);
    const dateStr = date.toLocaleDateString("it-IT", {
      day: "2-digit",
      month: "2-digit",
    });
    const timeStr = date.toLocaleTimeString("it-IT", {
      hour: "2-digit",
      minute: "2-digit",
    });

    // Truncate title for button (max ~40 chars to fit)
    const titlePreview =
      s.title.length > 35 ? s.title.slice(0, 32) + "..." : s.title;

    return [
      {
        text: `📅 ${dateStr} ${timeStr} - "${titlePreview}"`,
        callback_data: `resume:${s.session_id}`,
      },
    ];
  });

  await ctx.reply("📋 <b>Sessioni salvate</b>\n\nSeleziona una sessione da riprendere:", {
    parse_mode: "HTML",
    reply_markup: {
      inline_keyboard: buttons,
    },
  });
}

/**
 * /restart - Restart the bot process.
 */
export async function handleRestart(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;
  const chatId = ctx.chat?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const msg = await ctx.reply("🔄 Restarting bot...");

  // Save message info so we can update it after restart
  if (chatId && msg.message_id) {
    try {
      await Bun.write(
        RESTART_FILE,
        JSON.stringify({
          chat_id: chatId,
          message_id: msg.message_id,
          timestamp: Date.now(),
        })
      );
    } catch (e) {
      console.warn("Failed to save restart info:", e);
    }
  }

  // Give time for the message to send
  await Bun.sleep(500);

  // Exit - launchd will restart us
  process.exit(0);
}

/**
 * /model - Show current model or switch to a different one.
 * Usage:
 *   /model          → show current model + available options (inline buttons)
 *   /model <name>   → switch to specified model
 */
export async function handleModel(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const args = ctx.message?.text?.split(/\s+/).slice(1) ?? [];
  const requestedModel = args[0]?.trim();

  // If a model name was provided, switch to it
  if (requestedModel) {
    const [success, message] = session.setModel(requestedModel);
    if (success) {
      await ctx.reply(`✅ ${message}\n\n💡 New model will be used for <b>next query</b>.`, { parse_mode: "HTML" });
    } else {
      await ctx.reply(`❌ ${message}`, { parse_mode: "HTML" });
    }
    return;
  }

  // Otherwise show current model and inline buttons to switch
  const currentModel = session.currentModel;
  const defaultLabel = DEFAULT_MODEL === currentModel ? " (default)" : "";

  const buttons = AVAILABLE_MODELS.map((m) => {
    const isActive = m === currentModel;
    return [
      {
        text: isActive ? `✅ ${m}` : m,
        callback_data: `model:${m}`,
      },
    ];
  });

  await ctx.reply(
    `🤖 <b>Model Selection</b>\n\n` +
      `Current: <code>${currentModel}</code>${defaultLabel}\n` +
      `Default (.env): <code>${DEFAULT_MODEL}</code>\n\n` +
      `Select a model or use <code>/model &lt;name&gt;</code>:`,
    {
      parse_mode: "HTML",
      reply_markup: { inline_keyboard: buttons },
    }
  );
}

/**
 * /usage - Show cumulative token usage for the current session.
 */
export async function handleUsage(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // ── Helper: progress bar ──────────────────────────────────────────────
  function buildProgressBar(pct: number, width = 28): string {
    const filled = Math.round((Math.min(100, Math.max(0, pct)) / 100) * width);
    return "█".repeat(filled) + "░".repeat(width - filled);
  }

  // ── Helper: format resets_at timestamp ───────────────────────────────
  function formatResetTime(iso: string): string {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const now = new Date();
    const h = d.getUTCHours();
    const ampm = h === 0 ? "12am" : h < 12 ? `${h}am` : h === 12 ? "12pm" : `${h - 12}pm`;
    // Same calendar day?
    if (d.getUTCFullYear() === now.getUTCFullYear() &&
        d.getUTCMonth()    === now.getUTCMonth()    &&
        d.getUTCDate()     === now.getUTCDate()) {
      return `${ampm} (UTC)`;
    }
    return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${ampm} (UTC)`;
  }

  // ── Fetch real Pro/Max plan quota from Anthropic OAuth API ────────────
  interface UsageLimit { utilization: number | null; resets_at: string | null }
  interface ExtraUsage { is_enabled: boolean; monthly_limit: number | null; used_credits: number | null; utilization: number | null }
  interface UsageData {
    five_hour?:       UsageLimit | null;
    seven_day?:       UsageLimit | null;
    seven_day_sonnet?: UsageLimit | null;
    extra_usage?:     ExtraUsage | null;
  }

  let usageData: UsageData | null = null;
  let fetchError = "";

  // Helper: read access token from credentials file
  async function readAccessToken(): Promise<string> {
    const credsPath = `${process.env.HOME}/.claude/.credentials.json`;
    const credsRaw = await Bun.file(credsPath).text();
    const creds = JSON.parse(credsRaw);
    const token: string = creds?.claudeAiOauth?.accessToken ?? "";
    if (!token) throw new Error("No OAuth token found");
    return token;
  }

  // Helper: fetch usage with a given token
  async function fetchUsage(token: string): Promise<Response> {
    return fetch("https://api.anthropic.com/api/oauth/usage", {
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "anthropic-beta": "oauth-2025-04-20",
      },
      signal: AbortSignal.timeout(6000),
    });
  }

  try {
    let token = await readAccessToken();
    let resp = await fetchUsage(token);

    // If 401, try to refresh token by invoking claude CLI, then retry once
    if (resp.status === 401) {
      try {
        const proc = Bun.spawn(["claude", "--version"], { stderr: "ignore", stdout: "ignore" });
        await proc.exited;
      } catch {
        // ignore errors from claude CLI - it may still have refreshed the token
      }
      // Re-read credentials after potential refresh
      token = await readAccessToken();
      resp = await fetchUsage(token);
    }

    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    usageData = await resp.json() as UsageData;
  } catch (err) {
    fetchError = err instanceof Error ? err.message : String(err);
  }

  // ── Build output ──────────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push("<b>Usage</b>  (← /usage)");
  lines.push(`<i>Settings:  Status   Config   <b>Usage</b></i>`);
  lines.push("");

  if (fetchError || !usageData) {
    lines.push(`⚠️ Could not load quota data`);
    lines.push(`<code>${fetchError || "Unknown error"}</code>`);
  } else {
    // ── Section renderer ─────────────────────────────────────────────
    function renderSection(title: string, limit: UsageLimit | null | undefined, extraSubtext?: string) {
      if (!limit || limit.utilization === null) return;
      const pct = Math.floor(limit.utilization);
      const bar = buildProgressBar(pct);
      const resetStr = limit.resets_at ? `Resets ${formatResetTime(limit.resets_at)}` : "";
      const subtext = [extraSubtext, resetStr].filter(Boolean).join("  ·  ");
      lines.push(`<b>${title}</b>`);
      lines.push(`<code>${bar}</code>`);
      lines.push(`${pct}% used`);
      if (subtext) lines.push(`<i>${subtext}</i>`);
      lines.push("");
    }

    renderSection("Current session", usageData.five_hour);
    renderSection("Current week (all models)", usageData.seven_day);
    if (usageData.seven_day_sonnet?.utilization !== null && usageData.seven_day_sonnet) {
      renderSection("Current week (Sonnet only)", usageData.seven_day_sonnet);
    }

    // ── Extra usage ────────────────────────────────────────────────
    const ex = usageData.extra_usage;
    if (ex) {
      if (!ex.is_enabled) {
        lines.push("<b>Extra usage</b>");
        lines.push("Not enabled");
        lines.push("");
      } else if (ex.monthly_limit === null) {
        lines.push("<b>Extra usage</b>");
        lines.push("Unlimited");
        lines.push("");
      } else if (ex.utilization !== null && ex.used_credits !== null && ex.monthly_limit !== null) {
        const used  = (ex.used_credits  / 100).toFixed(2);
        const limit = (ex.monthly_limit / 100).toFixed(2);
        // Reset on 1st of next month
        const now = new Date();
        const nextMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        renderSection("Extra usage", { utilization: ex.utilization, resets_at: nextMonth.toISOString() }, `$${used} / $${limit} spent`);
      }
    }
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /context - Show current model and context window usage.
 */
export async function handleContext(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const model = session.currentModel;

  // Read settings.json to get effortLevel
  let effortLevel = "";
  try {
    const settingsPath = `${process.env.HOME}/.claude/settings.json`;
    const raw = await Bun.file(settingsPath).text();
    const settings = JSON.parse(raw);
    effortLevel = settings.effortLevel ?? "";
  } catch {
    // ignore
  }

  // Session info
  const lines: string[] = [];
  lines.push("🤖 <b>Context &amp; Model</b>\n");
  lines.push(`<b>Model:</b> <code>${model}</code>`);
  if (effortLevel) lines.push(`<b>Effort:</b> <code>${effortLevel}</code>`);

  // Session context info
  if (session.isActive) {
    const elapsed = Math.floor((Date.now() - session.sessionStartTime.getTime()) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    lines.push(`\n<b>Session:</b> Active (${session.sessionId?.slice(0, 8)}...)`);
    lines.push(`<b>Duration:</b> ${timeStr}`);
    lines.push(`<b>Queries:</b> ${session.totalQueries}`);
  } else {
    lines.push("\n<b>Session:</b> None");
  }

  // Calculate context % from session jsonl file
  try {
    const currentSessionId = session.sessionId ?? "";
    const proc = Bun.spawn(["python3", "-c", `
import json, glob, os
home = os.path.expanduser('~')
cwd = '${process.env.HOME}/repository'
project_key = cwd.replace('/', '-')
project_dir = f'{home}/.claude/projects/{project_key}'
session_id = '${currentSessionId}'

# Try to find the exact file for current session first
target_file = None
if session_id:
    exact = os.path.join(project_dir, f'{session_id}.jsonl')
    if os.path.exists(exact):
        target_file = exact

# Fallback: latest non-agent file
if not target_file:
    files = sorted(glob.glob(f'{project_dir}/*.jsonl'), key=os.path.getmtime, reverse=True)
    files = [f for f in files if not os.path.basename(f).startswith('agent-')]
    if files:
        target_file = files[0]

if not target_file:
    print('no_session')
else:
    for line in reversed(open(target_file).readlines()):
        try:
            d = json.loads(line.strip())
            u = d.get('message', {}).get('usage', {})
            if u and ('input_tokens' in u or 'cache_read_input_tokens' in u):
                used = (u.get('input_tokens', 0)
                      + u.get('cache_read_input_tokens', 0)
                      + u.get('cache_creation_input_tokens', 0))
                ctx_window = 200000
                remaining_pct = (ctx_window - used) / ctx_window * 100
                print(f'{remaining_pct:.1f}|{used}|{ctx_window}')
                break
        except:
            pass
`], { stdout: "pipe", stderr: "pipe" });
    const output = await new Response(proc.stdout).text();
    const trimmed = output.trim();
    if (trimmed && trimmed !== "no_session") {
      const [pct, used, total] = trimmed.split("|");
      const usedK = Math.round(Number(used) / 1000);
      const totalK = Math.round(Number(total) / 1000);
      lines.push(`\n📊 <b>Context:</b> ${pct}% remaining (~${usedK}k / ${totalK}k tokens used)`);
    } else {
      lines.push("\n📊 <b>Context:</b> 無法取得");
    }
  } catch {
    lines.push("\n<i>Context % shown in statusLine (CLI only)</i>");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /token - Show cumulative token usage for current session.
 */
export async function handleToken(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  const lines: string[] = [];
  lines.push("📊 <b>Token Usage</b>\n");

  // Session duration
  const elapsed = Math.floor((Date.now() - session.sessionStartTime.getTime()) / 1000);
  const hours = Math.floor(elapsed / 3600);
  const mins = Math.floor((elapsed % 3600) / 60);
  const secs = elapsed % 60;
  const timeStr = hours > 0
    ? `${hours}h ${mins}m ${secs}s`
    : mins > 0
    ? `${mins}m ${secs}s`
    : `${secs}s`;

  lines.push(`🕐 <b>Session duration:</b> ${timeStr}`);
  lines.push(`📨 <b>Total queries:</b> ${session.totalQueries}`);

  // Cumulative tokens
  lines.push(`\n<b>📈 Cumulative tokens:</b>`);
  lines.push(`   Input:        ${session.totalInputTokens.toLocaleString()}`);
  lines.push(`   Output:       ${session.totalOutputTokens.toLocaleString()}`);
  lines.push(`   Cache read:   ${session.totalCacheReadTokens.toLocaleString()}`);
  lines.push(`   Cache write:  ${session.totalCacheCreationTokens.toLocaleString()}`);

  // Last query
  if (session.lastUsage) {
    const u = session.lastUsage;
    lines.push(`\n<b>🔍 Last query:</b>`);
    if (u.input_tokens)              lines.push(`   Input:  ${u.input_tokens.toLocaleString()}`);
    if (u.output_tokens)             lines.push(`   Output: ${u.output_tokens.toLocaleString()}`);
    if (u.cache_read_input_tokens)   lines.push(`   Cache read: ${u.cache_read_input_tokens.toLocaleString()}`);
    if (u.cache_creation_input_tokens) lines.push(`   Cache write: ${u.cache_creation_input_tokens.toLocaleString()}`);
  } else {
    lines.push("\n<i>No queries yet in this session</i>");
  }

  await ctx.reply(lines.join("\n"), { parse_mode: "HTML" });
}

/**
 * /retry - Retry the last message (resume session and re-send).
 */
export async function handleRetry(ctx: Context): Promise<void> {
  const userId = ctx.from?.id;

  if (!isAuthorized(userId, ALLOWED_USERS)) {
    await ctx.reply("Unauthorized.");
    return;
  }

  // Check if there's a message to retry
  if (!session.lastMessage) {
    await ctx.reply("❌ No message to retry.");
    return;
  }

  // Check if something is already running
  if (session.isRunning) {
    await ctx.reply("⏳ A query is already running. Use /stop first.");
    return;
  }

  const message = session.lastMessage;
  await ctx.reply(`🔄 Retrying: "${message.slice(0, 50)}${message.length > 50 ? "..." : ""}"`);

  // Simulate sending the message again by emitting a fake text message event
  // We do this by directly calling the text handler logic
  const { handleText } = await import("./text");

  // Create a modified context with the last message
  const fakeCtx = {
    ...ctx,
    message: {
      ...ctx.message,
      text: message,
    },
  } as Context;

  await handleText(fakeCtx);
}
