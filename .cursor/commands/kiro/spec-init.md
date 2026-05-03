<meta>
description: Initialize a new specification with detailed project description and tier selection
argument-hint: <project-description> [--tier=trivial|light|full]
</meta>

# Spec Initialization

<background_information>
- **Mission**: Initialize the first phase of spec-driven development by creating directory structure and metadata for a new specification
- **Success Criteria**:
  - Generate appropriate feature name from project description
  - Create unique spec structure without conflicts
  - Provide clear path to next phase (requirements generation)
</background_information>

<instructions>
## Core Task
Generate a unique feature name from the project description ($ARGUMENTS) and initialize the specification structure for the appropriate tier.

**Tier detection**: If `--tier=` flag is present in $ARGUMENTS, use it directly. Otherwise, ask the user which tier applies (Trivial / Light / Full) or infer from the description using the criteria in `.kiro/TIERS.md`.

- **Trivial**: skip spec entirely — inform the user and stop.
- **Light**: create `spec.json` and `requirements.md` only. Skip design.md and tasks.md phases.
- **Full**: create `spec.json`, `requirements.md`, and `brainstorm.md` (from `.kiro/settings/templates/specs/brainstorm.md`). Inform user that Phase 0 brainstorm should be filled before proceeding.

## Execution Steps
1. **Determine Tier**: Extract `--tier` flag or ask user. If Trivial, abort with guidance.
2. **Check Uniqueness**: Verify `.kiro/specs/` for naming conflicts (append number suffix if needed)
3. **Create Directory**: `.kiro/specs/[feature-name]/`
4. **Initialize Files Using Templates**:
   - Read `.kiro/settings/templates/specs/init.json`
   - Read `.kiro/settings/templates/specs/requirements-init.md`
   - Replace placeholders:
     - `{{FEATURE_NAME}}` → generated feature name
     - `{{TIMESTAMP}}` → current ISO 8601 timestamp
     - `{{PROJECT_DESCRIPTION}}` → $ARGUMENTS (without --tier flag)
   - Write `spec.json` and `requirements.md` to spec directory
5. **Full tier only**: Also copy `.kiro/settings/templates/specs/brainstorm.md` → spec dir, replacing `{{FEATURE_NAME}}`.

## Important Constraints
- DO NOT generate requirements/design/tasks at this stage
- Follow stage-by-stage development principles
- Maintain strict phase separation
- Only initialization is performed in this phase
- Generate feature names that reflect the existing product domain (for example booking, loyalty, admin, barber, profile, notifications, content) instead of generic technical labels
- Tier Light: skip design.md and tasks.md in all subsequent phases
</instructions>

## Tool Guidance
- Use **Glob** to check existing spec directories for name uniqueness
- Use **Read** to fetch templates: `init.json` and `requirements-init.md`
- Use **Write** to create spec.json and requirements.md after placeholder replacement
- Perform validation before any file write operation

## Output Description
Provide output in the language specified in `spec.json` with the following structure:

1. **Tier**: which tier was selected and why
2. **Generated Feature Name**: `feature-name` format with 1-2 sentence rationale
3. **Project Summary**: Brief summary (1 sentence)
4. **Created Files**: Bullet list with full paths
5. **Next Step**: Command block — Full tier: fill `brainstorm.md` then `/kiro/spec-requirements <feature-name>`; Light tier: `/kiro/spec-requirements <feature-name>` directly
6. **Notes**: Explain why only initialization was performed (2-3 sentences on phase separation)

**Format Requirements**:
- Use Markdown headings (##, ###)
- Wrap commands in code blocks
- Keep total output concise (under 250 words)
- Use clear, professional language per `spec.json.language`

## Safety & Fallback
- **Ambiguous Feature Name**: If feature name generation is unclear, propose 2-3 options and ask user to select
- **Template Missing**: If template files don't exist in `.kiro/settings/templates/specs/`, report error with specific missing file path and suggest checking repository setup
- **Directory Conflict**: If feature name already exists, append numeric suffix (e.g., `feature-name-2`) and notify user of automatic conflict resolution
- **Write Failure**: Report error with specific path and suggest checking permissions or disk space

