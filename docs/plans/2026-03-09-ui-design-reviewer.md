# UI Design Reviewer Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a project-level Cursor subagent that reviews UI changes for brand consistency, responsiveness, visual hierarchy, states, and accessibility basics in the Gold Mustache project.

**Architecture:** Create two repository artifacts. The design document records the approved role, brand-review criteria, boundaries, and output format. The subagent markdown file contains YAML frontmatter with `readonly: true` and a focused system prompt that checks the Brand Book, design tokens, and affected UI code to produce evidence-based findings without drifting into generic aesthetic opinions or deep technical review.

**Tech Stack:** Cursor subagents, Markdown, Next.js UI workflow, Brand Book, CSS design tokens

---

### Task 1: Record Approved Design

**Files:**
- Create: `docs/plans/2026-03-09-ui-design-reviewer-design.md`
- Test: `docs/plans/2026-03-09-ui-design-reviewer-design.md`

**Step 1: Write the approved design**

Document the approved UI-reviewer approach with role boundaries, brand criteria, workflow, output format, and mitigation for subjectivity.

**Step 2: Verify the file exists**

Run: `test -f "docs/plans/2026-03-09-ui-design-reviewer-design.md"`
Expected: exit `0`

**Step 3: Verify required sections exist**

Run: `rg "^# Design$|^## (Limites|Critérios de revisão|Fluxo esperado|Formato de saída|Avaliação de impacto)$" "docs/plans/2026-03-09-ui-design-reviewer-design.md"`
Expected: one match for each required section

### Task 2: Create The UI Design Reviewer Subagent

**Files:**
- Create: `.cursor/agents/ui-design-reviewer.md`
- Test: `.cursor/agents/ui-design-reviewer.md`

**Step 1: Write the frontmatter and prompt**

Include a specific `name`, a delegation-friendly `description`, `readonly: true`, explicit references to the Brand Book and design tokens, UI review priorities, evidence-based output format, and rules that avoid subjective redesign comments.

**Step 2: Verify the frontmatter**

Run: `rg "^(name: ui-design-reviewer|description: .+|readonly: true)$" ".cursor/agents/ui-design-reviewer.md"`
Expected: matches for `name`, `description`, and `readonly: true`

**Step 3: Verify UI review guardrails**

Run: `rg "(Brand_Book_Gold_Mustache|globals.css|Brazilian Portuguese|responsiveness|accessibility|Do not)" ".cursor/agents/ui-design-reviewer.md"`
Expected: matches for brand, reporting, and guardrail rules

### Task 3: Verify Integration Artifacts

**Files:**
- Test: `.cursor/agents/ui-design-reviewer.md`
- Test: `docs/plans/2026-03-09-ui-design-reviewer-design.md`
- Test: `docs/plans/2026-03-09-ui-design-reviewer.md`

**Step 1: Check whitespace-safe diff**

Run: `git diff --check -- ".cursor/agents/ui-design-reviewer.md" "docs/plans/2026-03-09-ui-design-reviewer-design.md" "docs/plans/2026-03-09-ui-design-reviewer.md"`
Expected: exit `0`

**Step 2: Check repository status**

Run: `git status --short -- ".cursor/agents/ui-design-reviewer.md" "docs/plans/2026-03-09-ui-design-reviewer-design.md" "docs/plans/2026-03-09-ui-design-reviewer.md"`
Expected: all three files listed as untracked

**Step 3: Read the files once more**

Confirm that the prompt clearly separates visual and UX review from technical review, debugging, and PR operations, and that the frontmatter keeps the subagent in read-only mode.
