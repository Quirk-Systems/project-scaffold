/**
 * @param {string} idea
 * @param {string} nextMove
 * @returns {{idea: string, nextMove: string} | null}
 */
export function makeCandidate(idea, nextMove) {
  const text = idea.trim();
  if (!text || !["capture", "try", "decide"].includes(nextMove)) return null;
  return { idea: text, nextMove };
}
