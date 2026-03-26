# Obsidian — Vault Setup, Plugins & Workflows

---

## Vault Structure (Opinionated)

```
vault/
├── 00-Inbox/           # Capture everything here first
├── 10-Projects/        # Active projects (one folder per)
│   └── project-name/
│       ├── README.md
│       ├── planning/
│       └── notes/
├── 20-Areas/           # Ongoing responsibilities
│   ├── work/
│   ├── learning/
│   └── health/
├── 30-Resources/       # Reference material
│   ├── programming/
│   ├── books/
│   └── research/
├── 40-Archive/         # Completed / inactive
├── 50-Templates/       # All templates go here
├── 60-Maps/            # MOCs - Maps of Content
└── _assets/            # Images, PDFs, attachments
```

> Based on the PARA method (Tiago Forte). Flat is better. Don't nest more than 2 levels.

---

## Essential Plugins

### Core (built-in, enable these)
- **Daily notes** — your anchor note each day
- **Templates** — snippet insertion
- **Backlinks** — see what links here
- **Outline** — doc structure sidebar
- **Canvas** — infinite whiteboard

### Community — Must Have
| Plugin | What It Does |
|--------|-------------|
| **Dataview** | SQL-like queries over your notes |
| **Templater** | Dynamic templates with JS |
| **Excalidraw** | Hand-drawn diagrams in notes |
| **Obsidian Git** | Auto-commit vault to GitHub |
| **QuickAdd** | One-key capture + template actions |
| **Tasks** | Task management with due dates, filters |
| **Calendar** | Month view of daily notes |
| **Hotkeys++** | Extra keyboard shortcuts |
| **Advanced Tables** | Excel-like table editing |
| **Iconize** | Icons for folders/files |

### Community — Power User
| Plugin | What It Does |
|--------|-------------|
| **Juggl** | Interactive graph view |
| **Omnisearch** | Full-text search that actually works |
| **Breadcrumbs** | Hierarchical navigation |
| **Kanban** | Kanban boards from markdown |
| **Periodic Notes** | Weekly / monthly / quarterly notes |
| **Smart Connections** | AI-powered related notes (local) |

---

## Dataview Queries

### All active projects
````markdown
```dataview
TABLE file.mtime AS "Modified", status, priority
FROM "10-Projects"
WHERE status = "active"
SORT priority ASC
```
````

### Tasks due this week
````markdown
```dataview
TASK
WHERE !completed AND due >= date(today) AND due <= date(today) + dur(7 days)
SORT due ASC
```
````

### Notes created this month
````markdown
```dataview
LIST
FROM ""
WHERE file.cday >= date(this month)
SORT file.cday DESC
```
````

### Index of all people notes
````markdown
```dataview
TABLE role, company, last-contact
FROM "30-Resources/people"
SORT last-contact DESC
```
````

---

## Templater Templates

### Daily Note
```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
day: <% tp.date.now("dddd") %>
type: daily
---

# <% tp.date.now("dddd, MMMM D, YYYY") %>

## Focus
> One thing that makes today a win:

## Tasks
- [ ]

## Notes

## Log
```

### Meeting Note
```markdown
---
date: <% tp.date.now("YYYY-MM-DD") %>
type: meeting
attendees:
project:
---

# <% tp.file.title %>

**Date:** <% tp.date.now("YYYY-MM-DD HH:mm") %>
**Attendees:**

## Agenda
1.

## Notes

## Decisions
-

## Action Items
- [ ]
```

### Book Note
```markdown
---
type: book
author:
status: reading | done | dropped
rating:
finished:
tags: []
---

# <% tp.file.title %>

## Summary

## Key Ideas

## Quotes

## My Take
```

---

## Obsidian + Git Workflow

```bash
# .obsidian/plugins/obsidian-git/data.json key settings
{
  "autoSaveInterval": 10,      # commit every 10 minutes
  "autoPushInterval": 0,       # push manually or set interval
  "commitMessage": "vault: auto-save {{date}}",
  "pullBeforePush": true
}
```

```gitignore
# .obsidianignore (for Git plugin)
_assets/
.obsidian/workspace.json
.obsidian/workspace-mobile.json
```

---

## Canvas — Useful Patterns

- **Project Canvas**: cards = tasks, arrows = dependencies
- **System Design**: boxes = services, arrows = data flow
- **Book Map**: central concept → branches → notes
- **Decision Tree**: options as branches, pros/cons as leaf cards

---

## Hotkey Setup

```
# Custom hotkeys worth setting
Ctrl+Shift+D  → Open daily note
Ctrl+Shift+F  → Omnisearch
Ctrl+Shift+T  → Insert template (Templater)
Ctrl+Shift+N  → New note in Inbox
Alt+Enter     → Follow link in new pane
```

---

## CSS Snippets

```css
/* .obsidian/snippets/clean.css */

/* Wider content area */
.markdown-source-view,
.markdown-reading-view {
  max-width: 900px;
  margin: 0 auto;
}

/* Subtle callout */
.callout[data-callout="note"] {
  --callout-color: 120, 120, 120;
}

/* Tag pills */
.tag {
  background: var(--tag-background);
  border-radius: 12px;
  padding: 2px 8px;
  font-size: 0.8em;
}
```

---

## Resources

- [Obsidian docs](https://help.obsidian.md) — official
- [Obsidian Hub](https://publish.obsidian.md/hub) — community wiki
- [Dataview docs](https://blacksmithgu.github.io/obsidian-dataview/) — query reference
- [Templater docs](https://silentvoid13.github.io/Templater/) — template functions
- [Nicole van der Hoeven](https://nicolevanderhoeven.com) — best Obsidian content creator
- [Linking Your Thinking (Nick Milo)](https://www.linkingyourthinking.com) — MOC methodology
