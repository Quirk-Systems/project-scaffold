import type Anthropic from "@anthropic-ai/sdk";
import { getPersona, type PersonaName } from "./personas";
import { getRegister, type RegisterName } from "./registers";

// Builds the system prompt as ordered blocks. The persona prefix is frozen and
// carries the cache_control breakpoint; the register directive follows it,
// unmarked, so it can vary per-request without invalidating the cached prefix.
//
// Note: prompt caching only activates once the cached prefix exceeds the
// model's minimum (~4096 tokens on Opus 4.7). A short persona won't cache —
// it becomes effective once you grow the persona with few-shot exemplars.
export function composeSystem(
  personaName: PersonaName = "house",
  registerName: RegisterName = "straight",
): Anthropic.TextBlockParam[] {
  const persona = getPersona(personaName);
  const register = getRegister(registerName);
  return [
    {
      type: "text",
      text: persona.system,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: register.directive,
    },
  ];
}
