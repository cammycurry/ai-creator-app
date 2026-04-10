# The definitive guide to Claude Code mastery for solo SaaS developers

**Claude Code has evolved from a simple terminal tool into a programmable, multi-surface agent platform with deep memory, custom subagents, lifecycle hooks, and a full SDK** — but most developers use less than 20% of its capabilities. This guide covers every mechanism for memory persistence, context management, hooks, planning patterns, remote execution, and agent-friendly project design, with configurations tailored to a Next.js/TypeScript/Prisma/Clerk/Zustand stack. The research synthesizes official Anthropic documentation, GitHub configurations from 50+ repos, community wisdom from power users processing billions of tokens monthly, and academic research on agent memory architectures.

The single most important insight across all sources: **context management is the fundamental constraint**. Performance degrades as the context window fills, and every optimization — memory files, rules, skills, hooks, subagents — ultimately serves one goal: getting the right information into context at the right time while keeping everything else out.

---

## 1. Memory and persistence: making Claude never forget

Claude Code offers five distinct persistence mechanisms, each serving a different purpose. Understanding when to use each is the difference between a tool that forgets everything and one that feels like a permanent collaborator.

### CLAUDE.md files are your project's constitution

CLAUDE.md files are markdown documents loaded as a user message after the system prompt at the start of every session. They survive context compaction (reloaded fresh from disk) and represent the single most reliable way to persist instructions.

**The hierarchy works from general to specific.** Enterprise managed CLAUDE.md loads first (immutable), then user-level `~/.claude/CLAUDE.md` (personal global preferences), then project root `CLAUDE.md` or `.claude/CLAUDE.md` (team conventions), then subdirectory CLAUDE.md files (loaded on demand when Claude reads files in those directories). More specific locations take precedence over broader ones. Root `CLAUDE.md` is more visible to humans; `.claude/CLAUDE.md` keeps the root directory clean — both function identically at project scope.

**The ideal CLAUDE.md is under 80 lines.** Claude's system prompt already consumes roughly 50 of the ~150-200 instruction slots frontier LLMs can reliably follow. A project CLAUDE.md over 80 lines causes Claude to start ignoring parts. The Arize AI team demonstrated a **+10% SWE Bench improvement** through prompt optimization that focused on keeping CLAUDE.md concise. HumanLayer's production CLAUDE.md is only 60 lines.

**What belongs in CLAUDE.md:**
- Project overview in 1-2 lines ("Next.js 16 SaaS app with Prisma ORM, Clerk auth, Zustand state, Gemini AI pipelines")
- Key directory map (5-8 lines)
- Exact build/test/lint commands (Claude uses these verbatim)
- Critical conventions Claude gets wrong without guidance
- Common gotchas and architectural decisions

**What does NOT belong:** code formatting rules (use Prettier/ESLint instead — LLMs are expensive for formatting), full API documentation (link to it), task-specific instructions (those go in prompts), obvious advice ("write clean code"), sensitive credentials, or `@`-file references (these embed the entire referenced file into every session, bloating context).

Files can import other files using `@path/to/additional-context.md` syntax. The recommended pattern is keeping CLAUDE.md as a concise index that references detailed docs in an `agent_docs/` directory.

Here is a CLAUDE.md tailored to the user's stack:

```markdown
# Project: [Your SaaS Name]
Next.js 16 SaaS with TypeScript strict mode, Tailwind CSS, Prisma ORM (Postgres),
Clerk authentication, Zustand state management, Gemini API generation pipelines.

## Commands
- Dev: `pnpm dev`
- Build: `pnpm build`
- Test single: `pnpm test -- path/to/file.test.ts`
- Test all: `pnpm test`
- Lint: `pnpm lint --fix`
- Type check: `npx tsc --noEmit`
- Prisma migrate: `npx prisma migrate dev --name <name>`
- Prisma generate: `npx prisma generate`

## Key Directories
- `src/app/` — Next.js App Router pages and layouts
- `src/components/` — Reusable UI components (PascalCase files)
- `src/lib/` — Utilities, Prisma client, Clerk config, Zustand stores
- `src/lib/ai/` — Gemini API generation pipelines and prompt templates
- `prisma/` — Schema and migrations
- `src/styles/` — Custom CSS conventions (prototype-first approach)

## Architecture Rules
- IMPORTANT: Use Clerk's `auth()` server-side helper, NOT custom auth.
- IMPORTANT: All Zustand stores in `src/lib/stores/` with `create()` pattern.
- Prisma queries go in `src/lib/db/` action files, never in components.
- Server Actions for mutations; API routes only for webhooks/external calls.
- Gemini API calls wrapped in `src/lib/ai/` pipeline functions. Never call Gemini directly from components.
- CSS: Prototype-first approach — use inline Tailwind for prototyping, extract to custom CSS classes in `src/styles/` when patterns stabilize. Prefer Tailwind utilities over custom CSS until a pattern repeats 3+ times.

## Conventions
- Named exports, never default exports (except Next.js pages/layouts).
- Zod validation for all API inputs and form data.
- Error handling: wrap async operations in try/catch with typed errors.
- File naming: kebab-case for files, PascalCase for components.
- Commit format: conventional commits (feat:, fix:, refactor:).
```

### Auto memory accumulates knowledge across sessions

The auto memory system stores notes at `~/.claude/projects/<encoded-project-path>/memory/MEMORY.md`. The project path derives from the git repo root, so all subdirectories share one memory directory. **Only the first 200 lines of MEMORY.md load at session start** — this is a hard limit. If exceeded, Claude receives a warning and content beyond line 200 is ignored.

Claude creates topic-specific files alongside MEMORY.md (`debugging.md`, `patterns.md`, `api-conventions.md`). These load on-demand rather than at session start, providing a natural overflow mechanism. The system nudges toward a pattern where MEMORY.md serves as a concise index and details live in separate topic files.

**What triggers memory writes:** Claude selectively remembers build commands, debugging insights, architecture notes, code style corrections you make, and workflow habits. You can explicitly trigger saves: "Remember that we use pnpm, not npm" or "Save to memory that the staging environment uses port 3001." At the end of productive sessions, say "Update your memory files with what you learned about our codebase today."

These files are **fully editable** plain markdown. Run `/memory` to open the memory file selector, or browse directly at `~/.claude/projects/<project>/memory/`. After roughly 10 sessions, files typically contain ~30% redundant entries. Review periodically and prune after major refactors.

Auto memory is enabled by default (since v2.1.59). Set `autoMemoryEnabled: false` in project settings or `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` as an environment variable to disable. **Disable in CI environments** — automated pipelines don't need auto memory. For a solo developer, keep it on: the tradeoff of consuming some context tokens is worth the accumulated knowledge.

### The rules directory provides surgical context injection

The `.claude/rules/` directory holds modular markdown files that can be scoped to specific file paths using YAML frontmatter. Rules without `paths:` frontmatter load globally at session launch with the same priority as `.claude/CLAUDE.md`. Rules **with** `paths:` frontmatter load only when Claude reads files matching those patterns — this is the key context-saving mechanism.

```yaml
---
paths:
  - "src/lib/ai/**/*.ts"
---
# Gemini API Pipeline Rules
- All Gemini calls must use the pipeline wrapper in src/lib/ai/client.ts
- Include rate limiting: max 60 requests/minute per pipeline
- Always pass structured output schemas via Zod
- Log all API calls with request ID for debugging
- Handle SAFETY_BLOCKED responses gracefully with fallback content
- Temperature defaults: 0.7 for creative generation, 0.1 for extraction/classification
```

```yaml
---
paths:
  - "prisma/**"
  - "src/lib/db/**/*.ts"
---
# Database Rules
- Never use raw SQL — always Prisma client methods
- All queries must include proper error handling with PrismaClientKnownRequestError
- Use transactions for multi-table operations
- Always include `select` or `include` — never fetch entire records unnecessarily
- Migration names must be descriptive: user-add-subscription-fields, not migration-1
```

```yaml
---
paths:
  - "src/components/**/*.tsx"
---
# Component Rules
- Use named exports, never default exports
- Props interface named [ComponentName]Props
- Clerk auth checks via useAuth() hook in client components
- Server components for data fetching, client components only when interactivity needed
- Tailwind for styling (prototype-first); extract to custom CSS only when pattern repeats 3+ times
```

**Known limitations:** Path-based rules only load on `Read` operations, not on `Write`/file creation. This means rules for new files aren't in context when Claude creates them — a documented bug. Also, rules with `paths:` frontmatter in `~/.claude/rules/` (user-level) may be silently ignored; project-level works correctly.

### AGENTS.md provides cross-tool compatibility

AGENTS.md is a vendor-agnostic standard supported by Claude Code, Cursor, GitHub Copilot, Gemini CLI, Windsurf, Aider, and 20+ other tools. It's plain markdown with no required schema. Claude Code reads AGENTS.md as a fallback if no CLAUDE.md exists in a directory, but both can coexist.

The recommended approach for a project using Claude Code primarily: maintain a rich CLAUDE.md for Claude-specific context (hooks, skills), and a simpler AGENTS.md with universal project guidelines. In CLAUDE.md, reference it: `See @AGENTS.md for universal project guidelines.` For simpler setups, symlink: `ln -s AGENTS.md CLAUDE.md`.

Analysis of 2,500+ AGENTS.md files by GitHub found four patterns that matter most: put executable commands early, include real code examples showing good output, use three-tier boundaries ("always do," "ask first," "never do"), and pick one specific task per agent.

### The optimal setup for never forgetting

For a solo developer who wants Claude to never lose project context:

1. **`CLAUDE.md`** at project root: 60-80 lines covering stack, commands, directory map, critical conventions
2. **`.claude/rules/`** with path-scoped files: `ai-pipelines.md`, `database.md`, `components.md`, `auth.md`, `styles.md` — each loaded only when relevant files are touched
3. **Auto memory enabled**: Let Claude accumulate debugging insights and workflow patterns automatically
4. **Subdirectory CLAUDE.md** for distinct modules: `src/lib/ai/CLAUDE.md` for Gemini pipeline specifics
5. **AGENTS.md** at root for your collaborator's tools (if they use Cursor/Copilot)
6. **Self-improvement loop**: After every correction, say "Update CLAUDE.md so you don't make that mistake again" — this is the highest-leverage habit

---

## 2. Context management: the art of staying under budget

The context window for **Opus 4.6 and Sonnet 4.6 is now 1M tokens (GA as of March 13, 2026)**, up from the previous 200K default. However, performance still degrades as context fills, and auto-compaction introduces information loss. Every technique in this section serves to keep the right information in context and everything else out.

### Compaction preserves structure but loses detail

The `/compact` command summarizes the conversation, preserves key decisions and progress, then re-loads CLAUDE.md files fresh from disk. Auto-compaction triggers when context reaches approximately **75-95% capacity**. Since v2.0.64, compacting is instant.

**What survives compaction:** CLAUDE.md files (always reloaded from disk), auto-memory entries (loaded at session start), a summary of key decisions and progress, and the file system state. **What gets lost:** exact conversation messages, specific error messages, detailed code snippets discussed, nuanced architectural reasoning, tool outputs, file read contents, and subagent outputs not saved to files.

**The expert consensus is to avoid relying on auto-compaction.** Shrivu Shankar (Abnormal AI, billions of tokens/month of Claude Code usage) calls it "opaque, error-prone, and not well-optimized." The preferred alternatives are `/clear` + `/catchup` (clear state, then run a custom command making Claude read changed files), or the "Document & Clear" pattern: have Claude dump its plan/progress into a markdown file, `/clear`, then start a fresh session reading that file.

If you must compact, **do manual `/compact` at 50% context** — never wait for auto-compact. Provide specific focus instructions: `/compact Focus on the auth refactoring plan and the Prisma schema changes`. A `PreCompact` hook can automatically backup the full transcript before compaction occurs.

### Subagents are your context pressure valve

Each subagent runs in its **own fresh context window** — no parent conversation history. The only channel from parent to subagent is the Agent tool's prompt string, and the parent receives the subagent's final message as the tool result. This isolation is the key benefit: subagent work doesn't bloat main context.

**Use subagents for:** parallel independent tasks, codebase exploration/research, code review (fresh context = unbiased), and any work that can run independently. **Work directly when:** tasks are simple, sequential, need shared state across steps, or involve single-file edits.

The built-in `Explore` agent uses Haiku with read-only tools for cheap, fast codebase research. Custom subagents in `.claude/agents/` can be specialized: a "generation pipeline expert" that understands your Gemini API patterns, or a "database migration expert" for Prisma work.

**Important caveat from the Claude Code team:** Opus 4.6 has a tendency to overuse subagents. Add explicit guidance in CLAUDE.md about when subagents are warranted versus working directly.

### Monitoring context and what consumes tokens

Run **`/context`** mid-session to see what's consuming space — it gives actionable optimization tips. The biggest context consumers are: large file reads (read targeted line ranges with `Read file.ts:50-120` instead of whole files), MCP tool definitions (each MCP server adds definitions even when idle — "if you're using more than 20k tokens of MCPs, you're crippling Claude"), tool results from bash commands and searches, and CLAUDE.md files loaded at session start. A fresh session in a monorepo costs roughly **20K baseline tokens** (10% of 200K).

Context degradation thresholds observed in practice: **0-50% is free working space, 50-70% requires attention, 70-90% demands compaction, and 90%+ mandates /clear**. At 70% context, Claude starts losing precision. At 85%, hallucinations increase measurably.

### Session management and continuation

```bash
claude --continue     # Resume most recent session
claude --resume       # Select from session history
claude --resume <id>  # Resume specific session
claude --list-sessions # Browse recent sessions
```

The strongest community consensus: **use a conversation for one and only one task, then start a new one.** The pattern from experienced developers: write plans in markdown files → new session → implement a few things → update plans → new session. If you hit auto-compact during a session, it was already too long.

For long-running features, use the **three-file documentation pattern**:
```
plans/
├── feature-name-plan.md      # The accepted plan
├── feature-name-context.md   # Key files, decisions, current state
└── feature-name-tasks.md     # Checklist of remaining work
```

This gives any new session (or any agent) immediate full context on the feature's state.

---

## 3. Teaching Claude your codebase: rules, skills, and custom agents

### Advanced rules for a Next.js/Prisma/Clerk stack

The `.claude/rules/` directory supports recursive subdirectory organization. A recommended structure for the user's stack:

```
.claude/rules/
├── auth.md          # paths: "src/**/auth/**", "src/middleware.ts"
├── database.md      # paths: "prisma/**", "src/lib/db/**"
├── ai-pipelines.md  # paths: "src/lib/ai/**"
├── components.md    # paths: "src/components/**/*.tsx"
├── styles.md        # paths: "src/styles/**", "**/*.css"
├── api-routes.md    # paths: "src/app/api/**"
├── stores.md        # paths: "src/lib/stores/**"
└── testing.md       # paths: "**/*.test.ts", "**/*.test.tsx"
```

Each rule file should cover one topic with a descriptive filename, contain 20-40 lines of specific instructions, and use the `paths:` frontmatter to scope loading. This architecture means your Gemini pipeline rules never enter context when editing React components, saving hundreds of tokens per session.

### Custom skills for reusable workflows

Skills are stored at `.claude/skills/<skill-name>/SKILL.md` and provide on-demand instructions with tool access. Unlike rules (always-loaded context), skills activate only when relevant — either via `/skill-name` slash command or when Claude autonomously determines they're needed based on the description.

```markdown
---
name: gen-pipeline
description: Creating or modifying Gemini AI generation pipelines
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
context: inherit
---
# Generation Pipeline Skill

When creating or modifying Gemini AI generation pipelines:

1. All pipelines live in `src/lib/ai/pipelines/`
2. Each pipeline exports a typed function with Zod input/output schemas
3. Use the shared client from `src/lib/ai/client.ts`
4. Include rate limiting via the shared limiter
5. Structure: validate input → build prompt → call Gemini → validate output → return typed result
6. Always handle SAFETY_BLOCKED, RECITATION, and rate limit errors
7. Log with structured logging: pipeline name, request ID, latency, token count

## Template
```typescript
import { z } from 'zod';
import { geminiClient } from '../client';
import { rateLimiter } from '../rate-limiter';

const InputSchema = z.object({ /* ... */ });
const OutputSchema = z.object({ /* ... */ });

export async function generateX(input: z.infer<typeof InputSchema>) {
  const validated = InputSchema.parse(input);
  await rateLimiter.acquire();
  // ... pipeline logic
}
```
```

Skills can include `scripts/`, `references/`, and `assets/` subdirectories for executable scripts, documentation loaded on demand, and templates respectively. The key behavioral note: **manually invoked skills are ignored ~90% of the time** according to power users — hook-based auto-activation is far more reliable. The ChrisWiles/claude-code-showcase repo demonstrates a `UserPromptSubmit` hook that analyzes each prompt via keyword matching and auto-suggests relevant skills.

### Custom subagents for specialized tasks

Custom subagents live in `.claude/agents/<name>.md` with YAML frontmatter:

```markdown
---
name: gemini-expert
description: PROACTIVELY use when working with Gemini API, AI generation pipelines, or prompt engineering
tools: Read, Write, Edit, Bash, Glob, Grep
model: sonnet
memory: user
maxTurns: 15
---
You are a Gemini API and generation pipeline expert for this Next.js SaaS application.

Key context:
- All pipelines in src/lib/ai/pipelines/
- Shared client in src/lib/ai/client.ts
- Zod schemas for all inputs/outputs
- Rate limiting required on all API calls

When modifying pipelines:
1. Read the existing pipeline first
2. Understand the prompt template structure
3. Make changes preserving the error handling pattern
4. Run the pipeline's tests after changes
5. Update memory with any new patterns discovered
```

The `description` field is critical — including "PROACTIVELY" makes Claude more likely to auto-invoke the agent. Subagent memory scopes: `user` (persists across projects at `~/.claude/agent-memory/<name>/`), `project` (`.claude/agent-memory/<name>/`, can be committed to git), or `local` (gitignored). **Project-scoped subagent memory is the only memory mechanism that can be committed to git and shared with your collaborator** — main session memory is always local-only.

### Teaching Claude patterns: what goes where

The community consensus on where to teach patterns:

**CLAUDE.md** for universal rules Claude must always follow — stack choices, directory structure, naming conventions, critical architectural decisions. This is your constitution: short, authoritative, always in context.

**Rules** for context-specific patterns tied to file types or directories — component patterns, API conventions, database patterns. These save context by loading only when relevant.

**Skills** for procedural knowledge — how to create a new pipeline, how to add a new page, how to set up a new Zustand store. These are recipes activated on demand.

**Memory** for learned knowledge that evolves — debugging insights, discovered gotchas, performance findings. This accumulates over time.

**The self-improvement loop is the highest-leverage technique.** After any correction, say: "Update CLAUDE.md so you don't make that mistake again." This builds your project's institutional memory over weeks of use. Start with guardrails for what Claude gets wrong, not a comprehensive manual.

---

## 4. The hooks system: programmable agent behavior

Hooks are lifecycle callbacks that run shell commands, HTTP requests, prompt evaluations, or agent checks at specific points during Claude's operation. They're configured in `settings.json` and represent Claude Code's most powerful customization mechanism.

### Every hook event and when it fires

| Event | Trigger | Common Use |
|---|---|---|
| **SessionStart** | Session startup, resume, or clear | Inject dynamic context (git status, open issues) |
| **UserPromptSubmit** | User submits a prompt | Skill suggestion, prompt analysis |
| **PreToolUse** | Before tool execution | Block dangerous operations, protect files |
| **PostToolUse** | After successful tool completion | Auto-format, auto-lint, dependency install |
| **PostToolUseFailure** | After tool execution fails | Error logging, retry logic |
| **PreCompact** | Before compaction runs | Backup transcript, save state |
| **Stop** | Claude finishes responding | Verify task completion, run tests |
| **Notification** | Claude sends notifications | Desktop alerts, sound notifications |
| **SubagentStart/Stop** | Subagent lifecycle | Logging, coordination |
| **SessionEnd** | Session exits | Cleanup, final logging |
| **PermissionRequest** | Permission dialog about to show | Auto-approve patterns |
| **ConfigChange** | Configuration changes | Validation, sync |
| **WorktreeCreate/Remove** | Git worktree lifecycle | Setup/cleanup |
| **TaskCompleted** | Background task finishes | Notification, follow-up |

### Production-ready hook configurations

**Auto-format TypeScript files after every edit:**
```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if [ -n \"$FILE\" ] && echo \"$FILE\" | grep -qE '\\.(ts|tsx|js|jsx)$'; then npx prettier --write \"$FILE\" 2>/dev/null; fi"
          }
        ]
      }
    ]
  }
}
```

**Block edits on main branch and protect sensitive files:**
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "[ \"$(git branch --show-current)\" != \"main\" ] || { echo 'Cannot edit on main branch' >&2; exit 2; }"
          },
          {
            "type": "command",
            "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if echo \"$FILE\" | grep -qE '(\\.env|\\.env\\..+|secrets/|package-lock\\.json)'; then echo \"Protected file: $FILE\" >&2; exit 2; fi"
          }
        ]
      }
    ]
  }
}
```

**Backup transcript before compaction:**
```json
{
  "hooks": {
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "INPUT=$(cat); TRANSCRIPT=$(echo \"$INPUT\" | jq -r '.transcript_path'); mkdir -p ~/.claude/backups && cp \"$TRANSCRIPT\" ~/.claude/backups/session-$(date +%s).jsonl"
          }
        ]
      }
    ]
  }
}
```

**Desktop notification when Claude needs attention (macOS):**
```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "osascript -e 'display notification \"Claude needs your attention\" with title \"Claude Code\"'"
          }
        ]
      }
    ]
  }
}
```

**Inject git context at session start:**
```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "echo '{\"hookSpecificOutput\":{\"hookEventName\":\"SessionStart\",\"additionalContext\":\"Current branch: '$(git branch --show-current)'. Recent commits: '$(git log --oneline -5 | tr '\\n' '; ')'. Modified files: '$(git diff --name-only | tr '\\n' ', ')'\"}}'"
          }
        ]
      }
    ]
  }
}
```

**Verify task completion before stopping (prompt hook):**
```json
{
  "hooks": {
    "Stop": [
      {
        "hooks": [
          {
            "type": "prompt",
            "prompt": "Are all requested tasks complete? Did the agent run tests and verify the changes work?",
            "model": "haiku"
          }
        ]
      }
    ]
  }
}
```

Hook exit codes control behavior: **exit 0** proceeds normally (stdout may contain structured JSON), **exit 2** blocks the action (stderr becomes Claude's feedback), any other exit code proceeds with stderr logged. All matching hooks run in parallel, and the default timeout is 10 minutes per hook.

For autonomous operation, four hooks are essential (from a developer with 200+ hours of autonomous use): a context monitor that warns at usage thresholds, a "no-ask-human" hook that blocks `AskUserQuestion` tool calls (forces Claude to make decisions instead of waiting), a syntax check that catches errors immediately, and a decision warning hook that flags dangerous operations before execution.

---

## 5. Prompting patterns and task planning that actually work

### The plan-first principle is non-negotiable

The strongest consensus across all sources: **never let Claude jump straight to coding.** Boris Cherny (Claude Code team member) states that "Plan mode easily 2-3x's results for harder tasks. Give the model a way to check its work — this is another 2-3x." Combined, that's a potential 4-9x improvement.

The workflow: press **Shift+Tab twice** to enter Plan Mode. Let Claude research the codebase, then produce a detailed plan. Review the plan thoroughly (press Ctrl+G to edit it in your text editor). Only then switch to Normal Mode for implementation. Implement in stages — 1-2 sections at a time — reviewing between stages.

For complex features, create a plan file that persists across sessions:

```markdown
# Feature: AI Content Generation Dashboard

## Status: Phase 2 of 4

## Architecture Decisions
- Server Component for data fetching, Client Component for interactive generation UI
- Zustand store for generation state (pending, streaming, complete, error)
- Gemini pipeline: src/lib/ai/pipelines/content-generation.ts
- Results stored via Prisma: ContentGeneration model with userId (Clerk), prompt, output, metadata

## Phase 1: Database & Pipeline ✅
- [x] Prisma schema: ContentGeneration model
- [x] Migration: add-content-generation-table
- [x] Gemini pipeline with Zod schemas
- [x] Rate limiter integration

## Phase 2: API & Server Actions (CURRENT)
- [x] Server action: generateContent in src/lib/db/content-actions.ts
- [ ] Server action: listUserGenerations with pagination
- [ ] Server action: deleteGeneration with auth check

## Phase 3: UI Components
- [ ] GenerationForm client component with streaming display
- [ ] GenerationHistory server component
- [ ] GenerationCard with copy/delete actions

## Phase 4: Polish
- [ ] Error boundary for generation failures
- [ ] Loading skeletons
- [ ] Optimistic updates via Zustand
```

This file survives any context compaction or session restart. A new session can read it and immediately know the feature's state, architecture, and remaining work.

### Structuring requests for maximum adherence

Be specific and reference concrete files: "Create a new Zustand store at `src/lib/stores/generation-store.ts` following the pattern in `src/lib/stores/user-store.ts`, with states for pending, streaming, complete, and error" dramatically outperforms "Add state management for the generation feature."

**Use thinking depth keywords** when tasks require deep reasoning. Claude Code has built-in triggers: "ultrathink" or "think really hard" activates **32K thinking tokens**, while "think deeply" or "think more" activates 10K tokens. Use `ultrathink` for complex architectural decisions and debugging.

**Separate prompts into distinct modes: Build, Learn, Critique, Debug.** Never mix modes in one prompt — asking Claude to simultaneously implement a feature and explain the architectural tradeoffs creates noise. Use "switching to Debug mode now" to reset expectations.

The `/btw` command is underutilized: it appears as a dismissible overlay that **never enters conversation history**, perfect for quick questions that shouldn't consume context.

### Recovering from derailment

Four recovery tools in order of preference: (1) **Press Escape** to interrupt mid-generation, (2) **Double-tap Escape** or `/rewind` to undo and restore a checkpoint, (3) Ask Claude to undo with explicit instructions, (4) **`/clear`** and start fresh with a better prompt. If you've corrected Claude more than twice on the same issue, a clean session with a more specific prompt almost always outperforms continued correction in the same context.

### Task planning patterns for autonomous execution

The **plan-then-execute pattern** works best for well-defined multi-step tasks: generate a complete plan upfront, then execute steps sequentially with optional replanning on failure. This reduces LLM calls compared to ReAct (planning once rather than reasoning per step) and is more predictable.

For autonomous task execution, structure work as a markdown task file with clear phases, explicit success criteria, and dependencies between steps. Claude reads the file, works through tasks in order, updates the checklist as it goes, and can resume from any point if context is lost. The key: every task must be independently verifiable ("run `pnpm test` and confirm all pass" rather than "make sure it works").

The **writer/reviewer pattern** uses two sessions: one Claude writes code, another reviews it in fresh context (unbiased). The **test-first pattern** has one session write tests, then another session writes code to pass them — this produces the most reliable results for complex features.

---

## 6. Remote and headless execution

### Running Claude Code without a terminal

The `-p` (or `--print`) flag runs Claude Code non-interactively, transforming it into an API-callable agent:

```bash
# Basic headless execution
claude -p "Fix the failing test in src/lib/ai/__tests__/pipeline.test.ts" \
  --allowedTools "Read,Edit,Bash" \
  --permission-mode acceptEdits

# JSON output for programmatic parsing
claude -p "Analyze the codebase for security issues" \
  --output-format json \
  --allowedTools "Read,Grep,Glob" \
  --max-turns 20

# Multi-turn with session persistence
claude -p "Set up the new ContentGeneration model" --session-id feature-gen-001
claude -p "Now write the server actions for it" --session-id feature-gen-001

# Pipe input
cat error-log.txt | claude -p "Diagnose this error and suggest a fix"

# Parallel execution with git worktrees
claude -p "Refactor auth module" --worktree feature-auth &
claude -p "Write API tests" --worktree test-api &
wait
```

Each `--worktree` creates an isolated git worktree at `.claude/worktrees/<name>/` with its own branch, enabling truly parallel independent work.

### GitHub Actions integration

Run `/install-github-app` inside Claude Code for quick setup, or configure manually:

```yaml
name: Claude Code Review
on: [pull_request]
jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Claude Review
        uses: anthropics/claude-code-action@v1
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          claude_args: "--model claude-sonnet-4-6 --max-turns 10"
```

This enables `@claude` mentions in PRs and issues for automated review, implementation suggestions, and even autonomous issue resolution. The Claude Code team's own "Code Review for Claude Code" system catches bugs in **54% of PRs** (up from 16% without it).

### The Claude Agent SDK for custom tooling

The SDK (renamed from Claude Code SDK in September 2025) provides programmatic access in both TypeScript and Python:

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "Run the test suite and fix any failures in the Gemini pipeline",
  options: {
    allowedTools: ["Read", "Edit", "Bash"],
    maxTurns: 15,
    settingSources: ['project'],  // Loads .claude/ settings
    agents: [{
      description: "Gemini pipeline specialist",
      prompt: "You specialize in Gemini API integration...",
      tools: ["Read", "Write", "Edit", "Bash"],
      model: "sonnet"
    }]
  }
})) {
  if (message.type === "result" && message.subtype === "success") {
    console.log(message.result);
  }
}
```

This enables building custom automation: nightly test runs that fix failures, automated PR preparation, batch processing of issues, or integration into broader CI/CD workflows. The SDK supports all Claude Code features including subagents, MCP servers, hooks, and file checkpointing.

### Running multiple parallel instances

You can run multiple Claude Code instances simultaneously in different terminals. Each operates independently with its own context and session. For isolation, use git worktrees:

```bash
git worktree add ../project-auth feature-auth
git worktree add ../project-tests test-coverage
# Terminal 1: cd ../project-auth && claude
# Terminal 2: cd ../project-tests && claude
```

The experimental **Agent Teams** feature enables automated coordination between multiple sessions with shared tasks, messaging, and a team lead agent. Boris Cherny keeps **5-10 active sessions** open simultaneously, occasionally spinning up more from his phone.

---

## 7. Settings that reduce friction and improve results

### The recommended settings.json

```json
{
  "$schema": "https://json.schemastore.org/claude-code-settings.json",
  "model": "sonnet",
  "effortLevel": "high",
  "autoMemoryEnabled": true,
  "permissions": {
    "allow": [
      "Bash(pnpm *)",
      "Bash(npx prisma *)",
      "Bash(npx tsc --noEmit)",
      "Bash(git *)",
      "Bash(npx prettier --write *)",
      "Read",
      "Glob",
      "Grep"
    ],
    "deny": [
      "Read(./.env)",
      "Read(./.env.*)",
      "Read(./secrets/**)",
      "Write(./package-lock.json)",
      "Bash(rm -rf *)",
      "Bash(git push --force*)",
      "Bash(npx prisma migrate deploy*)"
    ],
    "defaultMode": "acceptEdits"
  },
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "INPUT=$(cat); FILE=$(echo \"$INPUT\" | jq -r '.tool_input.file_path // empty'); if [ -n \"$FILE\" ] && echo \"$FILE\" | grep -qE '\\.(ts|tsx)$'; then npx prettier --write \"$FILE\" 2>/dev/null; fi"
        }]
      }
    ],
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [{
          "type": "command",
          "command": "[ \"$(git branch --show-current)\" != \"main\" ] || { echo 'Cannot edit on main branch' >&2; exit 2; }"
        }]
      }
    ],
    "Notification": [
      {
        "hooks": [{
          "type": "command",
          "command": "osascript -e 'display notification \"Claude needs attention\" with title \"Claude Code\"' 2>/dev/null || notify-send 'Claude Code' 'Awaiting input' 2>/dev/null || true"
        }]
      }
    ]
  }
}
```

### Model selection strategy

**Sonnet 4.6** is the best default for most coding work — fast, capable, and cost-effective. **Opus 4.6** is reserved for complex architectural decisions, difficult debugging, and tasks requiring deep multi-step reasoning; it's 5x the cost but significantly more capable for hard problems. **Haiku 4.5** is ideal for subagents doing simple exploration, code review, and file reading tasks.

Switch models mid-session with `/model`. Configure per-subagent in frontmatter: `model: haiku` for cheap research agents, `model: opus` for critical review agents. The `/effort` command (or `effortLevel` setting) controls thinking depth: "low" for quick tasks, "medium" for standard work, "high" for complex reasoning.

### Permission settings to reduce friction

The `defaultMode: "acceptEdits"` setting auto-approves file edits while still prompting for bash commands not in the allow list. This eliminates the most common permission interruption (file writes) while maintaining safety for command execution. The allow list should include your exact build, test, lint, and version control commands. Deny rules always take precedence and are evaluated first.

**A critical warning about `--dangerously-skip-permissions`:** Only use this in sandboxed environments (containers, CI). Trail of Bits provides a `claude-code-devcontainer` for exactly this purpose — the container itself is the sandbox, so bypass mode is safe.

---

## 8. What the best developers are actually doing

### Trail of Bits: the security-first gold standard

The `trailofbits/claude-code-config` repo (**792 stars**) is the most recommended configuration baseline. Their philosophy: "No speculative features — don't add features unless users actively need them. No premature abstraction — don't create utilities until you've written the same code three times. Clarity over cleverness. Justify new dependencies — each dependency is attack surface and maintenance burden. Replace, don't deprecate. Code should be self-documenting. No commented-out code — delete it. Test behavior, not implementation. Mock boundaries, not logic."

Their PR review command runs **5 parallel review agents** (3 internal plus Codex and Gemini), deduplicating findings across all sources. Their fix-issue command is fully autonomous: research → plan → implement → test → create PR → self-review → comment on issue. They also maintain `trailofbits/skills` (**37.5K stars**) for security-focused Claude Code skills.

### ChrisWiles/claude-code-showcase: the feature-complete reference

With **3,800 stars**, this repo demonstrates every Claude Code feature: settings.json with hooks, skills with SKILL.md, custom agents, slash commands, GitHub Actions workflows, and a novel skill evaluation system. Their `UserPromptSubmit` hook analyzes every prompt via keyword matching, regex patterns, and file path extraction to auto-suggest relevant skills — solving the problem of skills being ignored when manually invoked.

### The self-improvement loop pattern

Multiple top developers converge on this workflow: after every correction, say "Update CLAUDE.md so you don't make that mistake again." This compounds over weeks into a highly tuned instruction set. Start with a minimal CLAUDE.md and let it grow organically based on actual errors rather than front-loading hypothetical rules.

### The document-and-restart workflow

The highest-performing developers don't fight context decay — they work with it. Each task gets its own session. Before ending a session, Claude dumps progress into markdown files. New sessions start by reading those files. This produces fresher, more accurate results than long sessions with accumulated drift.

### Key community resources worth bookmarking

The **rosmur.github.io/claudecode-best-practices** synthesis cross-references 12 detailed sources into a comprehensive guide. Shrivu Shankar's post at **blog.sshh.io** is the most authoritative non-official source, from a developer processing billions of tokens monthly. The **hesreallyhim/awesome-claude-code** GitHub repo is the canonical awesome-list, curating CLAUDE.md examples, skills, hooks, agents, and guides. The **FlorianBruniaux/claude-code-ultimate-guide** contains 22K+ lines across 204 templates.

---

## 9. Agent memory and planning: the science behind the practice

### The cognitive architecture behind Claude Code's design

Research on LLM agent memory has converged on a taxonomy from the CoALA framework mapping to human cognitive science. **Working memory** is the context window itself — active, finite, degrading with overload. **Episodic memory** stores time-stamped experiences (Claude Code's auto-memory system). **Semantic memory** captures factual knowledge and learned rules (CLAUDE.md files, rules). **Procedural memory** encodes how-to knowledge (skills, slash commands, prompt templates).

Claude Code's architecture maps directly to this taxonomy: CLAUDE.md is procedural + semantic memory, auto-memory is episodic, rules are semantic with context-dependent activation, skills are procedural with on-demand loading, and the context window is working memory with compaction as its overflow mechanism.

The key finding from the **A-MEM paper (NeurIPS 2025)** is that interconnected memory networks using Zettelkasten-style dynamic indexing and linking **doubled performance on complex multi-hop reasoning tasks**. This validates the practice of cross-referencing between CLAUDE.md, rules, and memory files rather than treating them as isolated documents.

### Planning patterns ranked by effectiveness

**Plan-and-Execute** is best for well-defined coding tasks: generate a complete plan upfront, execute sequentially, replan on failure. This is what Claude Code's Plan Mode implements and what the community recommends for production work.

**ReAct (Reason + Act)** is better for exploration and debugging: interleaved thinking → action → observation loops. This is Claude Code's default mode in normal operation — good for unknown tasks but costlier in LLM calls.

**Tree of Thoughts** explores multiple approaches simultaneously with backtracking. This maps to using multiple subagents or worktrees to try different implementation approaches in parallel.

**ADaPT (As-Needed Decomposition)** only decomposes tasks when direct execution fails — demand-driven complexity. This is the most efficient for tasks of uncertain difficulty and represents an emerging best practice: start simple, escalate to detailed planning only when needed.

A critical finding from the PEAR framework: **equipping only the planner with memory yields 10-30 percentage point improvement**, while executor-only memory has negligible impact. This validates the practice of investing heavily in CLAUDE.md and planning docs (planner context) rather than trying to make every subagent smart (executor memory).

### Multi-agent patterns for a solo developer

The **orchestrator-worker pattern** maps most naturally to a solo developer's workflow: you are the orchestrator (defining tasks, reviewing output), Claude Code is the primary worker, and subagents handle specialized subtasks. Your shared memory is the repository + CLAUDE.md + planning docs + git history.

When your collaborator joins, they become another orchestrator with shared context via repository conventions, AGENTS.md, and committed `.claude/` configuration. **Project-scoped subagent memory** (`.claude/agent-memory/<name>/`) can be committed to git, enabling both developers to benefit from agents' accumulated knowledge.

### Making your codebase agent-friendly

Research from Marmelab (January 2026) identifies 40+ practices for agent-friendly codebases. The highest-impact practices for a Next.js/TypeScript project:

**Use domain names, not technical names.** `ContentGenerator` instead of `GeneratorServiceFactory`. Agents search for concepts, not implementation patterns.

**Avoid duplicate file names.** Multiple `index.ts` files waste context as agents read the wrong one. Use descriptive names: `content-actions.ts` instead of `index.ts` in the actions directory.

**Split large files into focused modules.** Agents work better with 100-300 line files than 1000+ line monoliths. Each file should have a single clear purpose.

**Write tests that cover edge cases.** Agents discover constraints when they break tests. Comprehensive tests serve as executable documentation of expected behavior — this is more reliable than comments.

**Use TypeScript strict mode.** Strongly typed languages give models clearer constraints. TypeScript adoption grew 66% year-over-year partly due to AI compatibility benefits.

**Include README.md in each important folder.** Agents use these for navigation. A 5-line README explaining a directory's purpose saves hundreds of tokens of exploration.

---

## 10. Future-proofing: autonomous execution and SDK integration

### The autonomous task execution pattern

The most advanced pattern combining all Claude Code features for autonomous work:

1. Create a detailed plan file with phases, tasks, success criteria, and dependencies
2. Configure hooks: `PreToolUse` for safety guards, `Stop` with a prompt hook verifying completion, `Notification` for alerts
3. Set `--permission-mode acceptEdits` or `acceptAll` (in sandboxed environment)
4. Run headless: `claude -p "Execute the plan in plans/content-dashboard.md, working through each unchecked task. After each task, run tests and update the checklist." --max-turns 50`
5. Claude reads the plan, works through tasks, updates the checklist, runs tests, and stops when complete (or when the Stop hook's verification prompt confirms completion)

For overnight autonomous work, add a "no-ask-human" hook that blocks `AskUserQuestion` tool calls, forcing Claude to make decisions rather than waiting indefinitely.

### Building custom tooling with the Agent SDK

The Claude Agent SDK enables building workflows beyond what the CLI offers. Pattern examples: a nightly job that runs `claude -p "Check for new GitHub issues labeled 'bug', reproduce them, and create fix PRs"`, a deployment pipeline where Claude reviews the diff, runs security checks, and approves or flags, or a custom dashboard that orchestrates multiple Claude instances on different parts of your codebase simultaneously.

The SDK supports ephemeral containers (per-task, disposable), persistent containers (long-running agents), resumable containers (with session state for interruption recovery), and multi-agent containers (collaborative).

### Structuring projects for maximum agent leverage

The core principle: **agent-friendly is developer-friendly.** Every practice that helps AI agents — clear documentation, consistent conventions, comprehensive tests, typed interfaces, small focused files, descriptive naming — also helps human developers, your future self, and your occasional collaborator.

For your Next.js SaaS specifically: maintain the three-file documentation pattern for active features (plan, context, tasks), invest in Zod schemas everywhere (they serve as self-documenting contracts agents can read), keep Prisma schemas well-commented with field descriptions, document your Gemini pipeline prompt templates with expected inputs/outputs, and use conventional commits so agents can read git history as a changelog.

The AGENTS.md standard is gaining cross-tool adoption rapidly — maintaining one alongside your CLAUDE.md ensures your project works well with any agent tool your collaborator might prefer, and future-proofs against tool switches.

---

## Conclusion: the complete configuration for your stack

The optimal setup requires surprisingly little configuration — the key is placing the right information in the right mechanism. A concise **60-80 line CLAUDE.md** covering your stack, commands, and critical conventions forms the foundation. **Path-scoped rules** for your Gemini pipelines, Prisma database, Clerk auth, and component patterns keep specialized context out of unrelated work. **Auto-memory enabled** lets Claude accumulate debugging insights and workflow patterns. **Custom skills** for your generation pipeline workflow and a **custom subagent** for Gemini expertise provide on-demand specialized knowledge. **Hooks** for auto-formatting, branch protection, and desktop notifications make the agent self-correcting. And **plan files in markdown** provide the persistence layer that survives any context loss.

The practices that matter most are behavioral, not configurational: plan before coding (4-9x improvement), use one session per task, compact early or restart fresh, scope file reads narrowly, and run the self-improvement loop on every correction. These habits compound over weeks into an agent that feels like it truly knows your codebase — because through its accumulated memory, rules, and skills, it genuinely does.