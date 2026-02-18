# README Update: Model Switching & New Commands Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Update README.md to document the four new bot commands (`/model`, `/context`, `/token`, `/usage`), the new `CLAUDE_MODEL` env var, and add a dedicated "Model Switching" section.

**Architecture:** Pure documentation update — no code changes. All edits are in `README.md` only. Five targeted sections to update in order: Bot Features, Bot Commands table, BotFather setcommands block, Configuration env vars, and a new Model Switching section after Bot Commands.

**Tech Stack:** Markdown, git, GitHub (simonlin20 remote)

---

### Task 1: Update Bot Features bullet list

**Files:**
- Modify: `README.md` (lines 24–34, Bot Features section)

**Step 1: Add model switching bullet**

Find the existing features list and add after the `🔘 Interactive buttons` line:

```markdown
- 🤖 **Model switching**: Switch AI models on-the-fly via `/model` — choose between Opus, Sonnet, and Haiku
```

**Step 2: Verify the section looks correct**

Read README.md lines 24–36 and confirm the new bullet appears after `Interactive buttons`.

**Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add model switching to Bot Features list"
```

---

### Task 2: Update Bot Commands table

**Files:**
- Modify: `README.md` (Bot Commands table, currently lines 134–142)

**Step 1: Replace the commands table**

Find the existing table:

```markdown
| Command    | Description                       |
| ---------- | --------------------------------- |
| `/start`   | Show status and your user ID      |
| `/new`     | Start a fresh session             |
| `/resume`  | Pick from last 5 sessions to resume (with recap) |
| `/stop`    | Interrupt current query           |
| `/status`  | Check what Claude is doing        |
| `/restart` | Restart the bot                   |
```

Replace with:

```markdown
| Command      | Description                                          |
| ------------ | ---------------------------------------------------- |
| `/start`     | Show status and your user ID                         |
| `/new`       | Start a fresh session                                |
| `/resume`    | Pick from last 5 sessions to resume (with recap)     |
| `/stop`      | Interrupt current query                              |
| `/status`    | Check what Claude is doing                           |
| `/restart`   | Restart the bot                                      |
| `/model`     | Switch AI model (inline buttons or `/model <name>`)  |
| `/context`   | Show current model, context window & session info    |
| `/token`     | Show token usage stats for current session           |
| `/usage`     | Show Claude quota usage with progress bar            |
| `/retry`     | Retry the last message                               |
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add new commands to Bot Commands table"
```

---

### Task 3: Update BotFather /setcommands block

**Files:**
- Modify: `README.md` (BotFather setcommands code block, currently lines 84–91)

**Step 1: Replace the setcommands block**

Find:

```
start - Show status and user ID
new - Start a fresh session
resume - Pick from recent sessions to resume
stop - Interrupt current query
status - Check what Claude is doing
restart - Restart the bot
```

Replace with:

```
start - Show status and user ID
new - Start a fresh session
resume - Pick from recent sessions to resume
stop - Interrupt current query
status - Check what Claude is doing
restart - Restart the bot
model - Switch AI model
context - Show model and context info
token - Show token usage stats
usage - Show quota usage
retry - Retry last message
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: update BotFather setcommands with new commands"
```

---

### Task 4: Add CLAUDE_MODEL to Configuration env vars

**Files:**
- Modify: `README.md` (Configuration section env block, currently lines 97–105)

**Step 1: Add CLAUDE_MODEL line**

Find the env block:

```bash
# Required
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF...   # From @BotFather
TELEGRAM_ALLOWED_USERS=123456789           # Your Telegram user ID

# Recommended
CLAUDE_WORKING_DIR=/path/to/your/folder    # Where Claude runs (loads CLAUDE.md, skills, MCP)
OPENAI_API_KEY=sk-...                      # For voice transcription
```

Replace with:

```bash
# Required
TELEGRAM_BOT_TOKEN=1234567890:ABC-DEF...   # From @BotFather
TELEGRAM_ALLOWED_USERS=123456789           # Your Telegram user ID

# Recommended
CLAUDE_WORKING_DIR=/path/to/your/folder    # Where Claude runs (loads CLAUDE.md, skills, MCP)
OPENAI_API_KEY=sk-...                      # For voice transcription
# CLAUDE_MODEL=claude-sonnet-4-5           # Default model (changeable at runtime via /model)
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add CLAUDE_MODEL env var to configuration section"
```

---

### Task 5: Add "Model Switching" section after Bot Commands

**Files:**
- Modify: `README.md` (insert new section after Bot Commands table)

**Step 1: Insert new section**

After the Bot Commands table (after the `/retry` row and before `## Running as a Service`), insert:

```markdown
## Model Switching

Switch between Claude models at any time without restarting the bot:

```
/model                        → Show current model + select via inline buttons
/model claude-opus-4-5        → Switch directly by name
/model claude-haiku-4-5       → Switch to fastest model
```

**Available models:**

| Model                  | Best For                                  |
| ---------------------- | ----------------------------------------- |
| `claude-sonnet-4-5`   | Balanced speed & quality **(default)**    |
| `claude-opus-4-5`     | Most capable, best for complex reasoning  |
| `claude-haiku-4-5`    | Fastest responses, lightweight tasks      |

Set a persistent default in `.env`:

```bash
CLAUDE_MODEL=claude-opus-4-5
```

The model switches immediately for the **next query**. Your session history is preserved.
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Model Switching section to README"
```

---

### Task 6: Push all commits to GitHub fork

**Step 1: Push to simonlin20 remote**

```bash
git push simonlin20 main
```

Expected output:
```
To https://github.com/simonlin20-Forks/claude-telegram-bot.git
   bf416cb..xxxxxxx  main -> main
```

**Step 2: Verify on GitHub**

Confirm the README renders correctly at:
https://github.com/simonlin20-Forks/claude-telegram-bot
