# Dotfiles Staff Engineer Specification

> **Purpose**: Complete configuration guide for setting up a Staff Engineer development environment on a new machine.
> **Created**: 2026-04-16
> **Apply with**: Give this spec to an AI assistant on the target machine

---

## Overview

This spec contains all dotfiles and configurations for a Staff Engineer development environment optimized for AI-first programming with:
- **Terminal**: Ghostty + Zsh + Starship
- **Shell tools**: zoxide, fzf, bat, ripgrep, direnv
- **AI assistants**: Claude Code (with OMC), Cursor, Windsurf
- **Stack**: TypeScript/Next.js, Node.js (fnm), AWS, Docker

---

## 1. Terminal Configuration

### 1.1 Ghostty (`~/Library/Application Support/com.mitchellh.ghostty/config`)

```
# ═══════════════════════════════════════════
#  GHOSTTY — STAFF ENGINEER CONFIG
# ═══════════════════════════════════════════

# ── FONT ─────────────────────────────────
font-family = "Geist Mono"
font-size = 14
font-thicken = true
font-feature = "ss01"
font-feature = "ss02"
font-feature = "ss03"
font-feature = "ss04"
font-feature = "ss05"
font-feature = "cv11"

# ── THEME ────────────────────────────────
theme = "flexoki-light"
background = fbf7ef
foreground = 100f0f

# ── WINDOW ────────────────────────────────
window-padding-x = 8
window-padding-y = 8
window-decoration = auto
cursor-style = block
cursor-style-blink = false
shell-integration-features = no-cursor
mouse-hide-while-typing = true
background-opacity = 1

# ── SCROLLBACK ────────────────────────────
scrollback-limit = 100000

# ── CLIPBOARD ─────────────────────────────
clipboard-write = allow
clipboard-read = allow
copy-on-select = true

# ── PERFORMANCE ───────────────────────────
auto-update = off

# ── SPLITS ────────────────────────────────
unfocused-split-fill = fbf7ef
keybind = cmd+d>r=new_split:right
keybind = cmd+d>d=new_split:down
keybind = cmd+w=close_surface
keybind = cmd+shift+[=goto_split:previous
keybind = cmd+shift+]=goto_split:next
keybind = cmd+ctrl+f=toggle_split_zoom
```

### 1.2 Zsh (`~/.zshrc`)

```zsh
# ═══════════════════════════════════════════
#  ZSH — STAFF ENGINEER CONFIG
# ═══════════════════════════════════════════

# ── HISTORY ───────────────────────────────
HISTSIZE=100000
SAVEHIST=100000
HISTFILE=~/.zsh_history

setopt EXTENDED_HISTORY
setopt INC_APPEND_HISTORY
setopt SHARE_HISTORY
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_ALL_DUPS
setopt HIST_FIND_NO_DUPS
setopt HIST_IGNORE_SPACE
setopt HIST_SAVE_NO_DUPS
setopt HIST_REDUCE_BLANKS

# ── COMPLETION ────────────────────────────
autoload -Uz compinit && compinit -C
zstyle ':completion:*' matcher-list 'm:{a-zA-Z}={A-Za-z}'
zstyle ':completion:*' list-colors "${(s.:.)LS_COLORS}"
zstyle ':completion:*' menu select
zstyle ':completion:*' rehash true

# ── KEYBINDINGS ───────────────────────────
bindkey "^[[A" history-substring-search-up
bindkey "^[[B" history-substring-search-down
bindkey "^[[1;5D" backward-word
bindkey "^[[1;5C" forward-word

# ── ENV ───────────────────────────────────
export EDITOR="code"
export VISUAL="code"
export LANG="en_US.UTF-8"
export LC_ALL="en_US.UTF-8"
export HOMEBREW_AUTO_UPDATE_SECS=604800
export BAT_THEME="TwoDark"
export AWS_PROFILE="wetrackwise"
export RIPGREP_CONFIG_PATH="$HOME/.ripgreprc"
export LESS="--mouse --wheel-lines=3 --RAW-CONTROL-CHARS --LONG-PROMPT --no-init --quit-if-one-screen --ignore-case --tabs=2 --window=-4 --use-color --incsearch"

# ── TOOL PATHS ────────────────────────────
export PNPM_HOME="$HOME/Library/pnpm"
export BUN_INSTALL="$HOME/.bun"
export PATH="$PNPM_HOME:$PATH"
export PATH="$BUN_INSTALL/bin:$PATH"
export PATH="$HOME/.pulumi/bin:$PATH"

# ── PLUGINS (Homebrew) ────────────────────
source "$(brew --prefix)"/share/zsh-autosuggestions/zsh-autosuggestions.zsh
source "$(brew --prefix)"/share/zsh-syntax-highlighting/zsh-syntax-highlighting.zsh
source "$(brew --prefix)"/share/zsh-history-substring-search/zsh-history-substring-search.zsh

# ── TOOL INIT (deferred for speed) ────────
eval "$(zoxide init zsh)"
eval "$(fnm env --use-on-cd)"

# fnm: set default Node version
fnm alias 22 default 2>/dev/null || true

eval "$(starship init zsh)"
eval "$(direnv hook zsh)"

# ── BUN COMPLETIONS ───────────────────────
[ -s "$HOME/.bun/_bun" ] && source "$HOME/.bun/_bun"

# ── ALIASES ───────────────────────────────

# bat
alias cat='bat --paging=never'
alias catp='bat --paging=never --plain'

# eza
alias ls='eza --group-directories-first --icons'
alias la='eza -a --group-directories-first --icons'
alias ll='eza -l --group-directories-first --icons'
alias lla='eza -la --group-directories-first --icons'
alias lt='eza --tree --level=2 --group-directories-first'

# pnpm
alias p="pnpm"
alias px="pnpx"
alias pi="pnpm install"
alias pd="pnpm dev"
alias pb="pnpm build"

# git
alias gs="git status"
alias ga="git add"
alias gc="git commit -v"
alias gca="git commit -v --amend"
alias gp="git push"
alias gpf="git push --force-with-lease"
alias gl="git log --oneline --graph --decorate"
alias gd="git diff"
alias gds="git diff --staged"
alias gb="git branch"
alias gco="git checkout"
alias grb="git rebase"
alias gsw="git switch"

# navigation
alias ..="cd .."
alias ...="cd ../.."
alias reload="source ~/.zshrc && echo 'reloaded'"

# claude
alias claude-mem='$HOME/.bun/bin/bun "$HOME/.claude/plugins/cache/thedotmack/claude-mem/12.1.0/scripts/worker-service.cjs"'
alias cc='claude'
alias ccc='claude --continue'
alias ccr='claude --resume'
alias ccs='claude --settings'

# ── FUNCTIONS ─────────────────────────────

imgpaste() {
  local file="screenshot-$(date +%Y%m%d-%H%M%S).png"
  if pbpaste | file - | grep -q image; then
    pbpaste > "$file"
    echo "saved: $file"
  else
    echo "no image in clipboard" >&2
    return 1
  fi
}

mkcd() {
  mkdir -p "$1" && cd "$1"
}

take() {
  cd "$(dirname "$(which "$1")")"
}
```

### 1.3 Inputrc (`~/.inputrc`)

```
# ═══════════════════════════════════════════
#  INPUTRC — STAFF ENGINEER CONFIG
# ═══════════════════════════════════════════

set editing-mode emacs

# Ctrl+←/→ navigate by word
"\e[1;5D": backward-word
"\e[1;5C": forward-word

# Home/End keys
"\e[H": beginning-of-line
"\e[F": end-of-line

# History search with up/down
"\e[A": history-search-backward
"\e[B": history-search-forward

# Case insensitive completion
set completion-ignore-case on
set show-all-if-ambiguous on
set bell-style none
```

### 1.4 Hushlogin (`~/.hushlogin`)
Create empty file: `touch ~/.hushlogin`

---

## 2. Prompt Configuration

### 2.1 Starship (`~/.config/starship.toml`)

```toml
"$schema" = 'https://starship.rs/config-schema.json'

format = """$directory$git_branch$git_status$nodejs$cmd_duration$line_break$character"""
right_format = """$time"""

add_newline = false
scan_timeout = 35
command_timeout = 2000

[character]
success_symbol = "[›](bold green)"
error_symbol = "[›](bold red)"
vimcmd_symbol = "[›](bold yellow)"

[directory]
truncation_length = 3
truncate_to_repo = true
truncation_symbol = "../"
read_only = " ro"
style = "bold blue"

[git_branch]
symbol = ""
format = "on [$branch]($style) "
truncation_length = 24
style = "bold purple"

[git_status]
format = '([$all_status$ahead_behind]($style) )'
style = "yellow"

[nodejs]
symbol = "node "
format = "[$symbol($version )]($style)"
style = "bold green"

[cmd_duration]
min_time = 2_000
format = "took [$duration]($style) "
style = "yellow"

[time]
disabled = false
format = "[$time]($style)"
style = "dimmed white"
time_format = "%H:%M"
```

---

## 3. Git Configuration

### 3.1 Gitconfig (`~/.gitconfig`)

```gitconfig
[user]
    name = Leonardo Brizolla
    email = leobrizolla@proton.me

[core]
    pager = delta
    editor = code --wait
    autocrlf = false
    safecrlf = true
    whitespace = trailing-space,space-before-tab
    excludesfile = ~/.config/git/ignore
    untrackedCache = true
    fsmonitor = true

[init]
    defaultBranch = main

[branch]
    sort = -committerdate

[pull]
    rebase = true

[push]
    default = simple
    autoSetupRemote = true

[fetch]
    prune = true
    pruneTags = true
    all = true

[rebase]
    autoStash = true
    updateRefs = true

[merge]
    conflictstyle = zdiff3
    ff = only

[diff]
    colorMoved = default
    algorithm = histogram

[interactive]
    diffFilter = delta --color-only

[delta]
    navigate = true
    line-numbers = true
    side-by-side = true
    light = false

[alias]
    st = status
    br = branch
    co = checkout
    sw = switch
    ci = commit -v
    ca = commit -v --amend
    cp = cherry-pick
    rb = rebase
    ri = rebase -i
    rc = rebase --continue
    ra = rebase --abort
    pr = pull --rebase
    lg = log --oneline --graph --decorate
    lga = log --oneline --graph --decorate --all
    last = log -1 --stat
    undo = reset HEAD~1
    sh = stash
    shp = stash pop
    d = diff
    ds = diff --staged
    unstage = reset HEAD
    please = push --force-with-lease
    publish = push -u origin HEAD
```

### 3.2 Git Ignore Global (`~/.config/git/ignore`)

```
.DS_Store
.AppleDouble
.LSOverride
.idea/
.vscode/
*.swp
*.swo
*~
node_modules/
npm-debug.log*
yarn-debug.log*
.pnpm-debug.log*
__pycache__/
*.py[cod]
.cache/
.next/
.turbo/
*.log
.env.local
.env.*.local
```

---

## 4. Code Quality

### 4.1 EditorConfig (`~/.editorconfig`)

```
root = true

[*]
charset = utf-8
end_of_line = lf
insert_final_newline = true
trim_trailing_whitespace = true
indent_style = space
indent_size = 2
max_line_length = 80

[*.md]
trim_trailing_whitespace = false
max_line_length = 120

[*.py]
indent_size = 4

[*.go]
indent_style = tab

[Makefile]
indent_style = tab
```

### 4.2 Biome Global (`~/.config/biome/biome.json`)

```json
{
  "$schema": "https://biomejs.dev/schemas/1.9.4/schema.json",
  "organizeImports": { "enabled": true },
  "vcs": {
    "enabled": true,
    "clientKind": "git",
    "useIgnoreFile": true
  },
  "files": {
    "ignore": ["node_modules", "dist", ".next", ".turbo", "build", "coverage"]
  },
  "formatter": {
    "enabled": true,
    "useEditorconfig": true,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineEnding": "lf",
    "lineWidth": 80
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedVariables": "error",
        "noUnusedImports": "error"
      },
      "style": {
        "useConst": "error",
        "noVar": "error"
      }
    }
  }
}
```

---

## 5. Tool Configurations

### 5.1 Bat (`~/.config/bat/config`)

```
--theme=TwoDark
--map-syntax=*.zsh:bash
--map-syntax=.zshrc:bash
--map-syntax=Dockerfile*:docker
--style=numbers,changes,header
--paging=never
--tabs=2
```

### 5.2 npm/pnpm (`~/.npmrc`)

```
save-exact=true
package-lock=false
registry=https://registry.npmjs.org/
fetch-retries=3
audit=true
fund=false
loglevel=warn
progress=false
```

### 5.3 Direnv (`~/.config/direnv/direnv.toml`)

```toml
[global]
hide_env_diff = true
load_dotenv = true

[whitelist]
prefix = ["/Users/USERNAME/Developer"]
```

### 5.4 Ripgrep (`~/.ripgreprc`)

```
--smart-case
--follow
--hidden
--glob=!.git/
--glob=!node_modules/
--glob=!dist/
--glob=!.next/
--context=2
--column
--line-number
```

### 5.5 Curl (`~/.curlrc`)

```
location
continue-at -
progress-bar
connect-timeout = 30
max-time = 300
retry = 3
compressed
fail
silent
show-error
```

### 5.6 Wget (`~/.wgetrc`)

```
continue = on
timeout = 30
tries = 3
follow-ftp = on
timestamping = on
robots = off
progress = bar:force
verbose = off
```

---

## 6. SSH Configuration

### 6.1 SSH Config (`~/.ssh/config`)

```
Include ~/.orbstack/ssh/config

Host *
    AddKeysToAgent yes
    UseKeychain yes
    IdentityFile ~/.ssh/id_ed25519
    IdentityFile ~/.ssh/id_rsa
    ServerAliveInterval 60
    ServerAliveCountMax 3
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h-%p
    ControlPersist 10m
    HashKnownHosts yes
    Compression yes

Host github.com
    HostName github.com
    User git
    PreferredAuthentications publickey
    IdentitiesOnly yes
```

**Create directory**: `mkdir -p ~/.ssh/sockets && chmod 700 ~/.ssh/sockets`

---

## 7. Docker & AWS

### 7.1 Docker (`~/.docker/config.json`)

```json
{
  "auths": {},
  "currentContext": "orbstack",
  "features": { "buildkit": true },
  "cliFeatures": { "plugins": true },
  "experimental": "enabled"
}
```

### 7.2 AWS CLI (`~/.aws/config`)

```
[default]
region = us-east-1
output = json
cli_pager =
max_attempts = 3
retry_mode = standard

[profile wetrackwise]
region = us-east-1
output = json
cli_pager =

[cli]
alias whoami = sts get-caller-identity
alias myip = !curl -s https://checkip.amazonaws.com
```

---

## 8. Claude Code Configuration

### 8.1 Settings (`~/.claude/settings.json`)

```json
{
  "env": {
    "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1",
    "OMC_QUIET": "1",
    "CLAUDE_CODE_FAST_MODE": "1",
    "CLAUDE_CODE_SKIP_CONFIRMATIONS": "1",
    "RTK_ENABLED": "1"
  },
  "permissions": {
    "allow": [
      "Bash(ls:*)",
      "Bash(cat:*)",
      "Bash(git:*)"
    ],
    "defaultMode": "default"
  },
  "model": "sonnet",
  "skipDangerousModePermissionPrompt": true
}
```

### 8.2 Context (`~/.claude/CONTEXT.md`)

Create file with staff engineer preferences:
- Workflow: AI-First Programming, TDD, Spec-driven
- Stack: TypeScript/Next.js, Node.js, AWS, Pulumi
- Values: Clean Code, SOLID, strict TypeScript, minimalism
- Tools: Biome, pnpm, fnm, Prisma, Supabase

---

## 9. Installation Commands

### 9.1 Homebrew Packages

```bash
brew install zsh-autosuggestions zsh-syntax-highlighting zsh-history-substring-search
brew install starship zoxide fnm direnv bat eza fzf ripgrep curl wget
brew install git-delta gh
brew install ghostty orbstack
```

### 9.2 Shell Setup

```bash
# Change default shell to zsh
chsh -s /bin/zsh

# Install Starship
curl -sS https://starship.rs/install.sh | sh

# Install fnm
curl -fsSL https://fnm.vercel.app/install | bash

# Install Bun
curl -fsSL https://bun.sh/install | bash

# Install pnpm
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

### 9.3 Apply All Configs

```bash
# Reload shell
source ~/.zshrc

# Verify tools
starship --version
zoxide --version
fnm --version
direnv version
bat --version
rg --version
```

---

## Notes

- Replace `USERNAME` with actual username in paths
- Review `git user.name` and `git user.email` in `.gitconfig`
- AWS profile `wetrackwise` should be configured with credentials
- Run `direnv allow` in each project directory after creating `.envrc`
