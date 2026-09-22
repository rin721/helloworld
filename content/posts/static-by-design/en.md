---
title: "Static by design"
publishedAt: 2026-09-19T08:00:00Z
kind: note
layout: text
tags: ["Learning","Web"]
demo: true
---

## Start with a question

Static by design. The first step in learning is to turn a vague question into something observable. This demo note explores headings, code, tables, and task lists.

## A small example

Define the inputs and outputs before reaching for an abstraction. This function keeps only published entries:

```typescript
type Entry = { title: string; draft: boolean };

function published(entries: Entry[]) {
  return entries.filter(entry => !entry.draft);
}
```

### Keep the boundary clear

Test **one assumption at a time**. A clear boundary makes it easier to understand where a change belongs.

| Stage | Question |
| --- | --- |
| Input | Where does the data come from? |
| Processing | What can happen at build time? |
| Output | How do we verify the result? |

## Next steps

- [x] Write down the question
- [x] Verify a small example
- [ ] Observe it with real content

> Understanding means being able to explain why an answer works.

Leave your findings somewhere easy to discover, ready for the next question.
