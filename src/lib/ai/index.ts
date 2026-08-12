export { getAnthropic, assertAiConfigured, DEFAULT_MODEL } from "./client";
export { getPersona, type Persona, type PersonaName } from "./personas";
export {
  getRegister,
  registerNames,
  type Register,
  type RegisterName,
  type AnimationVocabulary,
  type MotionCharacter,
} from "./registers";
export { composeSystem } from "./compose";
export {
  generateText,
  streamText,
  createStream,
  type GenerateOptions,
} from "./generate";
export { animationFor, type AiState } from "./animation";
export {
  DEFAULT_EMBEDDING_MODEL,
  EMBEDDING_INPUT_MAX_CHARS,
  assertEmbeddingsConfigured,
  buildAssetEmbeddingInput,
  embedText,
  embedTexts,
  isEmbeddingsConfigured,
} from "./embeddings";
