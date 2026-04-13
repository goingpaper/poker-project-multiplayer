const DENOMS = [500, 100, 25, 10, 5, 1];

/**
 * Up to `maxTokens` greedy “chips” for a tiny visual strip; remainder shown as “+”.
 * @param {number} amount
 * @param {number} [maxTokens]
 */
export function tokensForAmount(amount, maxTokens = 4) {
  let n = Math.floor(Math.max(0, Number(amount) || 0));
  if (n === 0) return { tokens: [], remainder: 0 };
  const tokens = [];
  for (const d of DENOMS) {
    while (n >= d && tokens.length < maxTokens) {
      tokens.push(d);
      n -= d;
    }
    if (tokens.length >= maxTokens) break;
  }
  return { tokens, remainder: n };
}

/** CSS class per denomination (size + color on felt). */
export function denomClass(denom) {
  return `d${denom}`;
}
