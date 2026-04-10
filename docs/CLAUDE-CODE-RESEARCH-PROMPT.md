# Deep Research Prompt — Claude Code Memory, Context & Coding Effectiveness

Paste this into Claude.ai (online) with deep research enabled:

---

## Prompt:

I use Claude Code (Anthropic's CLI agent tool) as my primary coding environment. I'm a solo developer building a Next.js SaaS app. My biggest pain points are:

1. **Claude loses context between sessions** — it forgets what we worked on, makes the same mistakes, doesn't remember architectural decisions
2. **Claude loses context WITHIN sessions** — long conversations hit context limits, important details from early in the session get lost
3. **Claude doesn't remember my preferences** — I have to re-explain coding style, tool choices, and project rules every time
4. **Claude makes avoidable mistakes** — uses wrong libraries, wrong patterns, doesn't follow the project's established conventions

I need deep research on **every mechanism available in Claude Code (as of March 2026) to solve these problems**. I don't care about MCP servers for external services or IDE integrations — I care about **memory, context retention, coding effectiveness, and making Claude smarter about my specific project.**

### 1. Memory & Persistence Across Sessions

Research every way to make Claude Code remember things between conversations:

- **CLAUDE.md** — What goes in it? What's the ideal length? What makes one effective vs bloated? Show me real examples from popular open source repos that have great CLAUDE.md files. What's the difference between root `CLAUDE.md` and `.claude/CLAUDE.md`?
- **Auto memory system** — How does `~/.claude/projects/<hash>/memory/MEMORY.md` work exactly? What triggers Claude to write memories? What's the 200-line limit about? How do topic-specific memory files work (`debugging.md`, `patterns.md`, etc.)? Can I manually edit these? How do I make Claude remember specific things reliably?
- **`.claude/rules/` directory** — How do path-specific rules work with the `paths:` frontmatter? When should I use rules vs CLAUDE.md? Do rules load automatically when Claude opens matching files? How granular can I get?
- **AGENTS.md** — What is this file, how does it differ from CLAUDE.md, and when do I need both?
- **What's the hierarchy?** — If CLAUDE.md says one thing and a rule says another, which wins? What about user-level vs project-level?

**What I really want to know:** What is the optimal setup so that Claude NEVER forgets my project's conventions, tech stack decisions, and established patterns — even in a brand new session?

### 2. Context Management Within Sessions

Research every technique to prevent context loss during long coding sessions:

- **Context compaction** — What is `/compact`? When does auto-compaction happen? What gets preserved vs lost? How to write a `PreCompact` hook that saves critical context?
- **Subagents for context isolation** — How do subagents (Task tool) work? When should I delegate to a subagent vs do it myself? How does the `Explore` agent work for codebase research without polluting my main context?
- **Context window management** — How big is the context window? How do I monitor usage? What consumes the most tokens? How to keep context lean?
- **Session continuation** — What happens when a session runs out of context? How does the conversation summary/continuation work? How to make it preserve the right things?
- **Checkpointing** — Are there ways to save/restore conversation state? How to structure work so context loss is less painful?

**What I really want to know:** How do I run a 4-hour coding session without Claude forgetting what we decided in the first 30 minutes?

### 3. Making Claude Code Better at My Codebase

Research every way to make Claude deeply understand my specific project:

- **Rules directory** — show me advanced examples of `.claude/rules/` files with path-specific frontmatter. Can I have rules for specific file types? Specific directories? How detailed should they be?
- **Custom skills** — How to create project-specific skills (`.claude/skills/<name>/SKILL.md`) that encode my project's workflows? What frontmatter options exist (tools, model, context, hooks)? How do skills differ from rules?
- **Custom subagents** — How to create specialized agents (`.claude/agents/<name>/SKILL.md`) for my project? For example, a "generation pipeline expert" agent that knows my AI model stack. What frontmatter options exist?
- **Hooks for code quality** — How to set up `PostToolUse` hooks that auto-format code, run linters, or validate conventions after every edit? Show me exact `settings.json` examples.
- **Teaching Claude patterns** — What's the best way to establish coding patterns so Claude follows them? In CLAUDE.md? In rules? In memory? Through examples in the codebase?

**What I really want to know:** How do I make Claude Code act like a senior developer who's been on my project for 6 months — knows the codebase, follows conventions without being told, and never uses the wrong library?

### 4. Hooks That Improve Coding Effectiveness

Research practical hooks that make the coding workflow better:

- Full list of all hook events with descriptions
- **PostToolUse hooks** — auto-format with Prettier after edits, auto-lint, auto-type-check
- **PreToolUse hooks** — block edits to protected files, validate commands before execution
- **PreCompact hooks** — save critical context before compaction
- **SessionStart hooks** — inject dynamic context, run setup scripts
- **Notification hooks** — desktop alerts when Claude needs attention
- Show me exact JSON configs for each, not just descriptions

### 5. Effective Prompting Patterns for Claude Code

Research how to communicate with Claude Code more effectively:

- How to structure requests so Claude doesn't lose track of multi-step tasks
- How to use the todo/task system effectively
- How to give feedback that Claude actually incorporates (not just "ok I'll do that" then repeats the mistake)
- How to use `/compact` strategically vs letting it auto-compact
- When to start a new session vs continue an existing one
- How to recover when Claude goes off the rails mid-session

### 6. Settings That Matter

Research all settings in `settings.json` that affect coding quality and memory:

- `autoMemoryEnabled` — on or off? Tradeoffs?
- Permission settings that reduce friction without being dangerous
- Model selection — when to use opus vs sonnet vs haiku and how to configure per-task
- Any settings that affect context window management
- Any settings that affect how Claude reads/remembers files

### 7. What Are the Best Developers Doing?

Research real-world setups from power users:

- Search GitHub for popular/starred CLAUDE.md files and `.claude/` configurations
- Search for blog posts and tweets from developers who've optimized their Claude Code setup
- What patterns emerge from the best setups?
- Any open source "starter kits" or templates for Claude Code configuration?
- What does the Trail of Bits claude-code-config repo recommend?

---

**Output format:** For each section, give me:
1. The specific problem it solves
2. Exact file contents / configs I can copy-paste
3. Why it works (briefly)
4. Common mistakes to avoid

I'm building a Next.js 16 app with TypeScript, Tailwind, Prisma, Clerk auth, and Zustand. The project has custom CSS conventions (prototype-first), AI generation pipelines (Gemini API), and specific prompt engineering patterns. I need Claude to deeply understand all of this and never deviate.

**Do not waste space on:** MCP server catalogs, IDE integrations, CI/CD pipelines, team collaboration features, or pricing/billing. I only care about making Claude Code smarter, more consistent, and better at remembering context for solo development.

---

*Copy everything above and paste into Claude.ai with deep research mode enabled.*
