# Claude Code Configuration Upgrade

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Set up project settings.json with hooks (auto-format, notifications, PreCompact backup), create user-level CLAUDE.md, and clean up settings.local.json.

**Architecture:** Configuration-only changes — no app code modified. Project settings.json gets structured permissions + hooks. User-level CLAUDE.md applies global preferences across all projects.

**Tech Stack:** Claude Code settings, Prettier, macOS osascript, jq

---

### Task 1: Create project settings.json with permissions

**Files:**
- Create: `.claude/settings.json`

**Step 1: Create settings.json with structured permissions**

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "permissions": {
    "allow": [
      "Read",
      "Glob",
      "Grep",
      "Bash(pnpm *)",
      "Bash(pnpx prisma *)",
      "Bash(npx prettier *)",
      "Bash(npx tsc *)",
      "Bash(git *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(python3 *)",
      "Bash(npx tsx *)",
      "Bash(npx next *)",
      "Bash(npm ls *)",
      "Bash(curl *)",
      "mcp__context7__resolve-library-id",
      "mcp__context7__query-docs",
      "mcp__shadcn__get_project_registries",
      "WebSearch"
    ],
    "deny": [
      "Bash(rm -rf *)",
      "Bash(git push --force *)"
    ]
  }
}
```

**Step 2: Verify it loads**

Run: `cat .claude/settings.json | jq .`
Expected: valid JSON with permissions object

---

### Task 2: Add hooks to settings.json

**Files:**
- Modify: `.claude/settings.json`

**Step 1: Add hooks object with all 3 hooks**

Add to the settings.json after permissions:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if [ -n \"$FILE\" ] && echo \"$FILE\" | grep -qE '\\.(ts|tsx|js|jsx|css|json)$'; then npx prettier --write \"$FILE\" 2>/dev/null; fi"
          }
        ]
      }
    ],
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); TRANSCRIPT=$(echo \"$INPUT\" | jq -r '.transcript_path // empty'); if [ -n \"$TRANSCRIPT\" ] && [ -f \"$TRANSCRIPT\" ]; then mkdir -p ~/.claude/backups && cp \"$TRANSCRIPT\" ~/.claude/backups/session-$(date +%s).jsonl; fi"
          }
        ]
      }
    ]
  }
}
```

**Step 2: Validate final settings.json**

Run: `cat .claude/settings.json | jq .`
Expected: valid JSON with both permissions and hooks

---

### Task 3: Create user-level ~/.claude/CLAUDE.md

**Files:**
- Create: `~/.claude/CLAUDE.md`

**Step 1: Create personal global CLAUDE.md**

```markdown
# Personal Claude Code Preferences

## Who I Am
Solo developer building SaaS products. Prefer shipping fast over perfect code.

## Package Manager
Always use `pnpm` — never npm or yarn.

## Code Style
- Keep it simple — no premature abstractions
- Don't over-design or over-engineer
- Don't add features/improvements I didn't ask for
- Don't add docstrings, comments, or type annotations to code you didn't change
- Terse responses — no trailing summaries of what you just did

## Be Thorough
- Actually read files before modifying — don't guess from summaries
- Read docs/specs before implementing — decisions are already documented
- Don't delegate to sub-agents without reading files yourself first
```

---

### Task 4: Clean up settings.local.json

**Files:**
- Modify: `.claude/settings.local.json`

**Step 1: Reset settings.local.json**

The current file is full of ad-hoc "allow" entries that accumulated from clicking approve. The real permissions are now in `settings.json`. Reset to empty:

```json
{
  "permissions": {
    "allow": []
  }
}
```

**Step 2: Verify both settings files**

Run: `cat .claude/settings.json | jq . && echo "---" && cat .claude/settings.local.json | jq .`
Expected: clean settings.json with permissions + hooks, clean local with empty allow

---

### Task 5: Commit

```bash
git add .claude/settings.json .claude/settings.local.json
git commit -m "feat: add Claude Code hooks and structured permissions"
```

Note: ~/.claude/CLAUDE.md is outside the repo — not committed.
