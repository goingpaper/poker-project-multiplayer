import { CALL, CHECK, FOLD, RAISE } from "../constants.js";

/** Parsed client payload; validated before the engine runs. */
export type EngineAction =
  | { actionType: typeof CALL }
  | { actionType: typeof CHECK }
  | { actionType: typeof FOLD }
  | { actionType: typeof RAISE; betSize: number };

export type ParseActionResult =
  | { ok: true; action: EngineAction }
  | { ok: false; reason: "invalid_json" | "invalid_shape" };

/**
 * Accepts the same JSON shape the socket sends (`actionType`, optional `betSize`).
 */
export function parsePlayerActionJson(raw: string): ParseActionResult {
  let data: unknown;
  try {
    data = JSON.parse(raw) as unknown;
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
  if (typeof data !== "object" || data === null) {
    return { ok: false, reason: "invalid_shape" };
  }
  const o = data as Record<string, unknown>;
  const actionType = o.actionType;
  if (actionType === FOLD || actionType === CALL || actionType === CHECK) {
    return { ok: true, action: { actionType } };
  }
  if (actionType === RAISE) {
    const betSize = o.betSize;
    if (typeof betSize !== "number" || !Number.isFinite(betSize)) {
      return { ok: false, reason: "invalid_shape" };
    }
    return { ok: true, action: { actionType: RAISE, betSize } };
  }
  return { ok: false, reason: "invalid_shape" };
}
