# Stack Debugger Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a project-level Cursor subagent that debugs Next.js, Prisma, and Supabase issues with a root-cause-first workflow and regression-test discipline.

**Architecture:** Create two artifacts in-repo. The design document records scope, triggers, output format, and behavioral guardrails. The subagent markdown file contains YAML frontmatter plus a focused system prompt that enforces evidence gathering, single-hypothesis debugging, similar-pattern checks, and regression-test expectations before code fixes when feasible.

**Tech Stack:** Cursor subagents, Markdown, Next.js App Router, Prisma, Supabase

---

### Task 1: Record Approved Design

**Files:**
- Create: `docs/plans/2026-03-09-stack-debugger-design.md`
- Test: `docs/plans/2026-03-09-stack-debugger-design.md`

**Step 1: Write the approved design**

Document the approved debugger-specialist approach with objective, scope, triggers, investigation flow, output format, and risk mitigations.

**Step 2: Verify the file exists**

Run: `test -f "docs/plans/2026-03-09-stack-debugger-design.md"`
Expected: exit `0`

**Step 3: Verify required sections exist**

Run: `rg "^## (Objetivo|Escopo|Abordagem aprovada|Gatilhos de uso|Fluxo de investigação|Formato de saída|Riscos e mitigação)$" "docs/plans/2026-03-09-stack-debugger-design.md"`
Expected: one match for each required section

### Task 2: Create The Stack Debugger Subagent

**Files:**
- Create: `.cursor/agents/stack-debugger.md`
- Test: `.cursor/agents/stack-debugger.md`

**Step 1: Write the frontmatter and prompt**

Include a specific `name`, a delegation-friendly `description`, a root-cause-first workflow, stack-specific investigation priorities, an evidence-based output format, and anti-guessing rules.

**Step 2: Verify the frontmatter**

Run: `rg "^(name: stack-debugger|description: .+)$" ".cursor/agents/stack-debugger.md"`
Expected: matches for both `name` and `description`

**Step 3: Verify debugging guardrails**

Run: `rg "(root cause|regression test|similar|Brazilian Portuguese)" ".cursor/agents/stack-debugger.md"`
Expected: matches for investigation and reporting rules

### Task 3: Verify Integration Artifacts

**Files:**
- Test: `.cursor/agents/stack-debugger.md`
- Test: `docs/plans/2026-03-09-stack-debugger-design.md`

**Step 1: Check whitespace-safe diff**

Run: `git diff --check -- ".cursor/agents/stack-debugger.md" "docs/plans/2026-03-09-stack-debugger-design.md" "docs/plans/2026-03-09-stack-debugger.md"`
Expected: exit `0`

**Step 2: Check repository status**

Run: `git status --short -- ".cursor/agents/stack-debugger.md" "docs/plans/2026-03-09-stack-debugger-design.md" "docs/plans/2026-03-09-stack-debugger.md"`
Expected: all three files listed as untracked

**Step 3: Read the files once more**

Confirm that the description is specific enough to trigger delegation and that the prompt avoids speculative fixes or broad refactors without evidence.
