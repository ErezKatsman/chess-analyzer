---
name: clarify
description: Ask targeted clarifying questions before implementing a new feature or bug fix. Invoke this yourself whenever a request is ambiguous before writing any code.
---

## clarify skill

Before writing any code, identify what is unclear and ask the user directly.

### when to use this
- any new feature request where scope, UX, or data requirements are not 100% clear
- any bug fix where the root cause or expected behavior is ambiguous
- any time you would otherwise have to guess what the user wants

### how to run it

1. **read the request carefully**
   - what exactly needs to change?
   - which file / route / component is affected?
   - is this behind the paywall or free for all users?
   - what does "done" look like — what should the user see?

2. **identify the gaps** — look for these specifically:
   - **scope**: is this one small change or does it touch multiple features?
   - **UX**: where exactly does this appear? what does the empty/loading/error state look like?
   - **data**: does this need a new API, schema change, or can it use what already exists?
   - **paywall**: should free users see this? is it a paid-only feature?
   - **edge cases**: what happens when there are no games analyzed yet? when the user is new?

3. **ask only what is actually unclear** — max 4 questions
   - do not ask about things that are already obvious from context
   - do not ask "is there anything else?" — ask specific, targeted questions
   - use AskUserQuestion tool with concrete options where possible

4. **wait for answers before planning or coding**
   - once answered, produce the short plan (3-7 bullets) per CLAUDE.md workflow
   - then implement slice by slice

### what NOT to ask about
- implementation details you can decide yourself (file naming, function names, component structure)
- things already defined in CLAUDE.md (single quotes, no any, max 150 LOC per slice)
- things you can infer from the existing codebase patterns
