import { describe, it, expect } from "vitest";
import type { ActiveHandState } from "poker-shared";
import { computeCurrentMaxRaiseTo } from "./betting.js";

describe("computeCurrentMaxRaiseTo pot-limit", () => {
  it("matches SB preflop: my+pot+facing (reference: pot + amount to call)", () => {
    const h: ActiveHandState = {
      potSize: 15,
      playerTurn: "p1",
      boardTurn: 0,
      board: [],
      playerHands: { p1: [], p2: [] },
      playerStacks: { p1: 995, p2: 990 },
      currentTurnBets: { p1: 5, p2: 10 },
      buttonPlayer: "p1",
      bigBlindPlayer: "p2",
      lastRaiser: null,
      winner: null,
      table: {
        variant: "plo_hu",
        format: "cash",
        betting: { structure: "pot_limit", smallBlind: 5, bigBlind: 10 },
      },
    };
    expect(computeCurrentMaxRaiseTo(h, "p1", "p2")).toBe(25);
  });

  it("matches facing a bet: pot 150, facing 50 → max total 200", () => {
    const h: ActiveHandState = {
      potSize: 150,
      playerTurn: "p1",
      boardTurn: 1,
      board: [],
      playerHands: { p1: [], p2: [] },
      playerStacks: { p1: 850, p2: 800 },
      currentTurnBets: { p1: 0, p2: 50 },
      buttonPlayer: "p1",
      bigBlindPlayer: "p2",
      lastRaiser: "p2",
      winner: null,
      table: {
        variant: "plo_hu",
        format: "cash",
        betting: { structure: "pot_limit", smallBlind: 5, bigBlind: 10 },
      },
    };
    expect(computeCurrentMaxRaiseTo(h, "p1", "p2")).toBe(200);
  });

  it("no-limit caps at all-in", () => {
    const h: ActiveHandState = {
      potSize: 500,
      playerTurn: "p1",
      boardTurn: 2,
      board: [],
      playerHands: { p1: [], p2: [] },
      playerStacks: { p1: 40, p2: 900 },
      currentTurnBets: { p1: 0, p2: 100 },
      buttonPlayer: "p1",
      bigBlindPlayer: "p2",
      lastRaiser: "p2",
      winner: null,
      table: {
        variant: "nlhe_hu",
        format: "cash",
        betting: { structure: "no_limit", smallBlind: 5, bigBlind: 10 },
      },
    };
    expect(computeCurrentMaxRaiseTo(h, "p1", "p2")).toBe(40);
  });
});
