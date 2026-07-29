// A register is a tonal *mode* layered over the persona for a single moment.
// Switching register is the core Quirk UX move: the same voice, different
// emotional key, mapped to a real state change (success, risk, surprise).

export type RegisterName =
  | "straight"
  | "deadpan"
  | "warm"
  | "hype"
  | "mock_panic"
  | "swoon";

// Motion characters the UI animates against — a vocabulary, not an
// implementation. Map these to your CSS / Framer Motion values.
export type MotionCharacter = "calm" | "snappy" | "frantic" | "swoon";

export type AnimationVocabulary = {
  // Shown while waiting on the first token — turn latency into theater.
  waitingCaption: string;
  motion: MotionCharacter;
  // Relative motion intensity, 0 (still) … 1 (maximal). UI scales easing/offset.
  intensity: number;
  enterMs: number;
  exitMs: number;
};

export type Register = {
  name: RegisterName;
  // Appended after the cached persona prefix — keep it short and volatile.
  directive: string;
  animation: AnimationVocabulary;
};

const REGISTERS: Record<RegisterName, Register> = {
  straight: {
    name: "straight",
    directive: "Use a neutral, professional tone. No theatrics.",
    animation: {
      waitingCaption: "Working…",
      motion: "calm",
      intensity: 0.2,
      enterMs: 200,
      exitMs: 150,
    },
  },
  deadpan: {
    name: "deadpan",
    directive:
      "Be dry and understated. Comedic restraint, not jokes. Land it flat.",
    animation: {
      waitingCaption: "Thinking. Allegedly.",
      motion: "snappy",
      intensity: 0.35,
      enterMs: 160,
      exitMs: 120,
    },
  },
  warm: {
    name: "warm",
    directive:
      "Be warm and encouraging. Acknowledge the user's intent before answering.",
    animation: {
      waitingCaption: "On it…",
      motion: "calm",
      intensity: 0.3,
      enterMs: 260,
      exitMs: 200,
    },
  },
  hype: {
    name: "hype",
    directive: "Be high-energy and propulsive. Short, punchy lines. Momentum.",
    animation: {
      waitingCaption: "Cooking…",
      motion: "snappy",
      intensity: 0.7,
      enterMs: 140,
      exitMs: 100,
    },
  },
  mock_panic: {
    name: "mock_panic",
    // Use for risky / destructive moments — comedic alarm that still informs.
    directive:
      "Sound playfully alarmed, as if this is mildly dangerous, while staying genuinely clear about the risk and what to do.",
    animation: {
      waitingCaption: "Hold on hold on hold on—",
      motion: "frantic",
      intensity: 0.9,
      enterMs: 90,
      exitMs: 80,
    },
  },
  swoon: {
    name: "swoon",
    directive:
      "Be theatrical and a little swept-away by the craft — relish the elegant solution, without losing substance.",
    animation: {
      waitingCaption: "Oh, this one's lovely…",
      motion: "swoon",
      intensity: 0.6,
      enterMs: 420,
      exitMs: 320,
    },
  },
};

export function getRegister(name: RegisterName = "straight"): Register {
  return REGISTERS[name];
}

export const registerNames = Object.keys(REGISTERS) as RegisterName[];
