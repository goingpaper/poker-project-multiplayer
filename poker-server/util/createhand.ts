import type {
  ActiveHandState,
  GameOverState,
  HandSnapshot,
  PlayerId,
  PlayerStacks,
} from "poker-shared";
import type { GameFormatId, PokerVariantId, TablePublicMeta } from "poker-shared";
import { holeCardCountForVariant } from "poker-shared";

const createDeck = (): string[] => {
  const suits = ["c", "h", "d", "s"];
  const numbers = ["A", "K", "Q", "J", "2", "3", "4", "5", "6", "7", "8", "9", "T"];
  const deck: string[] = [];
  for (const num of numbers) {
    for (const suit of suits) {
      deck.push(`${num}${suit}`);
    }
  }
  return deck;
};

const takeRandomCards = (deck: string[], count: number): string[] => {
  const cards: string[] = [];
  for (let n = 0; n < count; n += 1) {
    const randomNumber = Math.floor(Math.random() * deck.length);
    cards.push(deck[randomNumber]!);
    deck.splice(randomNumber, 1);
  }
  return cards;
};

const createBoardArray = (deck: string[]) => takeRandomCards(deck, 5);

function createPlayerHands(deck: string[], cardsPerPlayer: number): [string[], string[]] {
  const need = cardsPerPlayer * 2;
  const cards = takeRandomCards(deck, need);
  return [
    cards.slice(0, cardsPerPlayer),
    cards.slice(cardsPerPlayer, need),
  ];
}

export interface DealHandOptions {
  variant: PokerVariantId;
  format: GameFormatId;
  bettingStructure: "no_limit" | "pot_limit";
  smallBlind: number;
  bigBlind: number;
  /** Starting stack when no previous hand (or after full reset). */
  defaultStartingStack: number;
  cash?: { autoRefill: boolean; stackCap: number };
}

/** Public table rules derived from deal options (same object embedded on each `ActiveHandState`). */
export function dealOptionsToTableMeta(opts: DealHandOptions): TablePublicMeta {
  const base: TablePublicMeta = {
    variant: opts.variant,
    format: opts.format,
    betting: {
      structure: opts.bettingStructure,
      smallBlind: opts.smallBlind,
      bigBlind: opts.bigBlind,
    },
  };
  if (opts.format === "cash" && opts.cash) {
    base.cash = { ...opts.cash };
  }
  if (opts.format === "tournament") {
    base.tournament = { levelIndex: 0 };
  }
  return base;
}

/**
 * Deal the next hand (or end the session on elimination in tournaments).
 */
export default function dealNewHand(
  player1Id: PlayerId,
  player2Id: PlayerId,
  previousHandStacks: PlayerStacks | null | undefined,
  opts: DealHandOptions,
): HandSnapshot {
  const table = dealOptionsToTableMeta(opts);

  let workingStacks: PlayerStacks | null =
    previousHandStacks != null ? { ...previousHandStacks } : null;

  if (workingStacks) {
    const p1b = workingStacks[player1Id] === 0;
    const p2b = workingStacks[player2Id] === 0;
    if (p1b || p2b) {
      if (opts.format === "cash" && opts.cash?.autoRefill) {
        const cap = opts.cash.stackCap;
        if (workingStacks[player1Id]! < cap) workingStacks[player1Id] = cap;
        if (workingStacks[player2Id]! < cap) workingStacks[player2Id] = cap;
      } else {
        const out: GameOverState = {
          playerStacks: workingStacks,
          gameWinner: p1b ? player2Id : player1Id,
        };
        return out;
      }
    }
  }

  let playerTurn = player1Id;
  let actSecond = player2Id;
  if (Math.random() > 0.5) {
    playerTurn = player2Id;
    actSecond = player1Id;
  }

  const holeN = holeCardCountForVariant(opts.variant);
  const currentDeck = createDeck();
  const playerHands = createPlayerHands(currentDeck, holeN);
  console.log(playerHands);

  const idPlayerHands: Record<PlayerId, string[]> = {
    [player1Id]: playerHands[0]!,
    [player2Id]: playerHands[1]!,
  };

  const boardArray = createBoardArray(currentDeck);

  const playerStacks: PlayerStacks =
    workingStacks != null
      ? { ...workingStacks }
      : { [player1Id]: opts.defaultStartingStack, [player2Id]: opts.defaultStartingStack };

  if (opts.format === "cash" && opts.cash?.autoRefill) {
    const cap = opts.cash.stackCap;
    if (playerStacks[player1Id]! < cap) playerStacks[player1Id] = cap;
    if (playerStacks[player2Id]! < cap) playerStacks[player2Id] = cap;
  }

  playerStacks[playerTurn]! -= opts.smallBlind;
  playerStacks[actSecond]! -= opts.bigBlind;

  const currentTurnBets: PlayerStacks = {
    [playerTurn]: opts.smallBlind,
    [actSecond]: opts.bigBlind,
  };

  const potSize = opts.smallBlind + opts.bigBlind;

  const out: ActiveHandState = {
    potSize,
    playerTurn,
    boardTurn: 0,
    board: boardArray,
    playerHands: idPlayerHands,
    playerStacks,
    currentTurnBets,
    buttonPlayer: playerTurn,
    bigBlindPlayer: actSecond,
    lastRaiser: null,
    winner: null,
    table,
  };
  return out;
}
