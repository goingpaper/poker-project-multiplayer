const DENOMS = [500, 100, 25, 10, 5, 1];

export function tokensForAmount(amount: number, maxTokens = 4): { tokens: number[]; remainder: number } {
  let n = Math.floor(Math.max(0, Number(amount) || 0));
  if (n === 0) return { tokens: [], remainder: 0 };
  const tokens: number[] = [];
  for (const d of DENOMS) {
    while (n >= d && tokens.length < maxTokens) {
      tokens.push(d);
      n -= d;
    }
    if (tokens.length >= maxTokens) break;
  }
  return { tokens, remainder: n };
}

export function denomClass(denom: number): string {
  return `d${denom}`;
}
