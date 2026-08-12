import {
  getRegister,
  type AnimationVocabulary,
  type RegisterName,
} from "./registers";

// The lifecycle a register-switching UI animates through. Each phase is a real
// state change the UI can key motion off — waiting becomes theater, not a
// spinner; completion and failure each get their own beat.
export type AiState =
  | { phase: "idle" }
  | { phase: "summoning"; register: RegisterName }
  | { phase: "streaming"; register: RegisterName }
  | { phase: "settled"; register: RegisterName }
  | { phase: "stumbled"; register: RegisterName; message: string };

const IDLE_VOCAB: AnimationVocabulary = {
  waitingCaption: "",
  motion: "calm",
  intensity: 0,
  enterMs: 200,
  exitMs: 150,
};

// Resolve the animation vocabulary for a state. UIs read this to pick easing,
// offsets, captions, and accents without knowing about registers directly.
export function animationFor(state: AiState): AnimationVocabulary {
  if (state.phase === "idle") return IDLE_VOCAB;
  const vocab = getRegister(state.register).animation;
  if (state.phase === "settled") {
    // Settle: same character, calmer — let the result breathe.
    return { ...vocab, intensity: vocab.intensity * 0.4 };
  }
  return vocab;
}
