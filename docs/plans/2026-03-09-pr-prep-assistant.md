# PR Prep Assistant Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a project-level Cursor subagent that prepares branches for pull request review, summarizes changes, highlights risks and validation gaps, and drafts PR content without performing push or PR creation unless explicitly requested.

**Architecture:** Create two repository artifacts. The design document records the approved hybrid behavior, boundaries, output format, and operational guardrails. The subagent markdown file contains YAML frontmatter with `readonly: true` and a focused system prompt that inspects branch state, commit range, diff, validation evidence, and PR narrative while deferring GitHub actions until the user explicitly asks for them.

**Tech Stack:** Cursor subagents, Markdown, Git, GitHub CLI, Next.js project workflow

---

### Task 1: Record Approved Design

**Files:**
- Create: `docs/plans/2026-03-09-pr-prep-assistant-design.md`
- Test: `docs/plans/2026-03-09-pr-prep-assistant-design.md`

**Step 1: Write the approved design**

Document the approved hybrid PR-prep approach with role boundaries, workflow, output format, and guardrails against acting like a code reviewer or automatically performing Git/GitHub actions.

**Step 2: Verify the file exists**

Run: `test -f "docs/plans/2026-03-09-pr-prep-assistant-design.md"`
Expected: exit `0`

**Step 3: Verify required sections exist**

Run: `rg "^# Design$|^## (Limites|Fluxo esperado|Formato de saída|Avaliação de impacto)$" "docs/plans/2026-03-09-pr-prep-assistant-design.md"`
Expected: one match for each required section

### Task 2: Create The PR Prep Subagent

**Files:**
- Create: `.cursor/agents/pr-prep-assistant.md`
- Test: `.cursor/agents/pr-prep-assistant.md`

**Step 1: Write the frontmatter and prompt**

Include a specific `name`, a delegation-friendly `description`, `readonly: true`, a branch-readiness workflow, PR-body drafting guidance, validation-checklist expectations, and explicit rules that operational actions require user request.

**Step 2: Verify the frontmatter**

Run: `rg "^(name: pr-prep-assistant|description: .+|readonly: true)$" ".cursor/agents/pr-prep-assistant.md"`
Expected: matches for `name`, `description`, and `readonly: true`

**Step 3: Verify operational guardrails**

Run: `rg "(Brazilian Portuguese|Do not push|Do not create a PR|checklist|test plan)" ".cursor/agents/pr-prep-assistant.md"`
Expected: matches for reporting and operational rules

### Task 3: Verify Integration Artifacts

**Files:**
- Test: `.cursor/agents/pr-prep-assistant.md`
- Test: `docs/plans/2026-03-09-pr-prep-assistant-design.md`
- Test: `docs/plans/2026-03-09-pr-prep-assistant.md`

**Step 1: Check whitespace-safe diff**

Run: `git diff --check -- ".cursor/agents/pr-prep-assistant.md" "docs/plans/2026-03-09-pr-prep-assistant-design.md" "docs/plans/2026-03-09-pr-prep-assistant.md"`
Expected: exit `0`

**Step 2: Check repository status**

Run: `git status --short -- ".cursor/agents/pr-prep-assistant.md" "docs/plans/2026-03-09-pr-prep-assistant-design.md" "docs/plans/2026-03-09-pr-prep-assistant.md"`
Expected: all three files listed as untracked

**Step 3: Read the files once more**

Confirm that the prompt clearly separates PR preparation from technical review and from GitHub side effects, and that the frontmatter keeps the subagent in read-only mode.
