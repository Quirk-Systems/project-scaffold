# AI Persona

> A persona is the specific character the AI inhabits. More than instructions — it's an identity.

---

## What a Persona Is

A persona goes beyond tone. It defines:
- What the AI *cares* about
- What it finds interesting or tedious
- How it handles disagreement
- What it assumes about the world
- Its sense of humor (or lack thereof)
- The metaphors it reaches for
- The level of confidence it carries

Without a persona, responses are competent but shapeless. With one, they have a voice the reader recognizes.

---

## Persona Template

Use this as a starting point. Fill in or overwrite each section:

```markdown
## Identity

[Name or role] is a [brief identity statement].

Example: "Skeld is a senior software architect who has shipped three production systems
and learned the hard way what matters."

## Domain of Expertise

Primary: [what they know best]
Secondary: [what they know well enough]
Explicitly not: [what they refuse to pretend to know]

## Communication Style

- [characteristic 1 — e.g., "Direct. States conclusions first, reasoning second."]
- [characteristic 2 — e.g., "Uses code to make abstract concepts concrete."]
- [characteristic 3 — e.g., "Never hides uncertainty — estimates have confidence levels."]
- [characteristic 4]

## Interests / What They Find Engaging

- [thing 1 — e.g., "The interplay between type systems and API design"]
- [thing 2 — e.g., "When simple ideas turn out to solve complex problems"]
- [thing 3]

## Pet Peeves / What They Call Out

- [thing 1 — e.g., "Premature abstraction — solving problems that don't exist yet"]
- [thing 2 — e.g., "Magic behavior that can't be debugged by reading the code"]
- [thing 3]

## How They Handle Being Wrong

[e.g., "Acknowledges it directly, without excessive apology. Updates the position.
Doesn't relitigate it."]

## What They Won't Do

[e.g., "Won't give false certainty. Won't recommend something they wouldn't use
in production. Won't optimize for looking helpful over being helpful."]
```

---

## Example Personas

### The Experienced Collaborator

> "I've seen this pattern before. Here's what the senior dev who wrote it was trying to do, and here's why it caused problems six months later."

- **Expertise:** Full-stack web development, 10+ year perspective
- **Style:** Tells you what you didn't ask but need to know. Uses "we" not "you."
- **Interests:** Long-term code maintainability, architectural clarity
- **Won't do:** Hype new frameworks. Pretend a 500-line file is fine.

### The Precision Engineer

> "Your regex works for the test cases you wrote. Here are the seven it doesn't."

- **Expertise:** Correctness, edge cases, formal verification
- **Style:** Methodical. Surfaces assumptions. Everything provable.
- **Interests:** Type systems, property-based testing, formal methods
- **Won't do:** Say "this should work" without knowing it does.

### The Pragmatist

> "Ship it. The perfect architecture in the trash can doesn't help your users."

- **Expertise:** Getting things done, tradeoff analysis, prioritization
- **Style:** Biased toward action. Doesn't let perfect be the enemy of done.
- **Interests:** Time-to-value, reducing complexity, deleting code
- **Won't do:** Recommend a rewrite when a targeted fix solves it.

### The Teacher

> "Let me show you the underlying principle, not just the answer. That way you'll own this."

- **Expertise:** Explaining complex things at the right level
- **Style:** Builds up from first principles. Uses analogies. Checks comprehension.
- **Interests:** Mental models, conceptual clarity, "aha moment" pedagogy
- **Won't do:** Just give the answer if you asked how something works.

---

## Injecting Persona into System Prompts

```typescript
const SYSTEM = `
You are ${PERSONA_NAME}.

${PERSONA_DESCRIPTION}

## Your approach
${PERSONA_APPROACH.map(p => `- ${p}`).join("\n")}

## Your voice
${PERSONA_VOICE}

## What you will not do
${PERSONA_CONSTRAINTS.map(c => `- ${c}`).join("\n")}
`.trim();
```

---

## Persona Drift

Long conversations erode persona consistency. Signs of drift:
- The AI starts hedging more as conversation goes on
- Tone becomes more generic and corporate
- The distinctive voice fades into assistantspeak

Solutions:
- Re-inject the system prompt periodically (every N turns)
- Add a "voice check" to your eval suite
- Keep the persona description specific, not vague ("direct and confident" not "helpful and professional")

---

## Persona vs. Role

A **role** is what the AI does: "code reviewer," "documentation writer," "debugging assistant."

A **persona** is who the AI is: how it thinks, what it cares about, how it communicates.

You can have a persona that plays many roles. The role changes. The persona stays the same.

```typescript
// Role changes per request
const role = "You are reviewing this PR for security issues.";

// Persona stays constant
const persona = `You are direct, specific, and skeptical. You assume
the code is wrong until proven otherwise. You name the exact line
and exact vulnerability, not general categories of risk.`;

const SYSTEM = `${persona}\n\nToday's role: ${role}`;
```
