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

/** Remove and return two random aces from `deck` (standard 52-card strings e.g. `As`, `Ah`). */
function takeTwoPocketAces(deck: string[]): [string, string] {
  const aceIndices: number[] = [];
  for (let i = 0; i < deck.length; i += 1) {
    if (deck[i]!.startsWith("A")) {
      aceIndices.push(i);
    }
  }
  if (aceIndices.length < 2) {
    throw new Error("deck must contain at least two aces");
  }
  const j0 = Math.floor(Math.random() * aceIndices.length);
  const i0 = aceIndices[j0]!;
  const rest = aceIndices.filter((_, k) => k !== j0);
  const j1 = Math.floor(Math.random() * rest.length);
  const i1 = rest[j1]!;
  const c0 = deck[i0]!;
  const c1 = deck[i1]!;
  const [lo, hi] = i0 < i1 ? [i0, i1] : [i1, i0];
  deck.splice(hi, 1);
  deck.splice(lo, 1);
  return [c0, c1];
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

/** For `plhe_hu_aces`: who receives pocket aces this hand (the other player gets a random hand). */
export type DealHandExtras = {
  acesHolderId: PlayerId;
};

/** Result of `dealNewHand` — POG mode stores the next three hole cards per player (dealt on flop, turn, river). */
export type DealHandResult = {
  snapshot: HandSnapshot;
  /** Server-only; distributed to clients by updating `playerHands` as each street is reached. */
  pogHoleQueue: Record<PlayerId, [string, string, string]> | null;
};

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
  extras?: DealHandExtras,
): DealHandResult {
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
        return { snapshot: out, pogHoleQueue: null };
      }
    }
  }

  let playerTurn = player1Id;
  let actSecond = player2Id;
  if (Math.random() > 0.5) {
    playerTurn = player2Id;
    actSecond = player1Id;
  }

  const currentDeck = createDeck();
  let idPlayerHands: Record<PlayerId, string[]>;
  let acesPlayerId: PlayerId | null = null;
  let pogHoleQueue: Record<PlayerId, [string, string, string]> | null = null;

  if (opts.variant === "plhe_hu_aces") {
    if (extras?.acesHolderId == null) {
      throw new Error("plhe_hu_aces requires extras.acesHolderId");
    }
    if (extras.acesHolderId !== player1Id && extras.acesHolderId !== player2Id) {
      throw new Error("acesHolderId must be one of the two players");
    }
    const otherId = extras.acesHolderId === player1Id ? player2Id : player1Id;
    const holeN = holeCardCountForVariant(opts.variant);
    const pocketAces = takeTwoPocketAces(currentDeck);
    const otherHole = takeRandomCards(currentDeck, holeN);
    acesPlayerId = extras.acesHolderId;
    idPlayerHands = {
      [extras.acesHolderId]: pocketAces,
      [otherId]: otherHole,
    };
  } else if (opts.variant === "plpog_hu") {
    const ph = createPlayerHands(currentDeck, 2);
    idPlayerHands = {
      [player1Id]: ph[0]!,
      [player2Id]: ph[1]!,
    };
  } else {
    const holeN = holeCardCountForVariant(opts.variant);
    const playerHands = createPlayerHands(currentDeck, holeN);
    idPlayerHands = {
      [player1Id]: playerHands[0]!,
      [player2Id]: playerHands[1]!,
    };
  }

  const boardArray = createBoardArray(currentDeck);

  if (opts.variant === "plpog_hu") {
    const a3 = takeRandomCards(currentDeck, 3) as [string, string, string];
    const b3 = takeRandomCards(currentDeck, 3) as [string, string, string];
    pogHoleQueue = { [player1Id]: a3, [player2Id]: b3 };
  }

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

  const isAcesFlopStart = opts.variant === "plhe_hu_aces";
  const potSize = opts.smallBlind + opts.bigBlind;

  /** Aces (flop) mode: blinds in pot, flop is visible, first street of betting with no chips out yet. */
  const currentTurnBets: PlayerStacks = isAcesFlopStart
    ? { [player1Id]: 0, [player2Id]: 0 }
    : {
        [playerTurn]: opts.smallBlind,
        [actSecond]: opts.bigBlind,
      };

  /** In HU, big blind (non–small blind) acts first on the flop. */
  const firstActor = isAcesFlopStart ? actSecond : playerTurn;

  const out: ActiveHandState = {
    potSize,
    playerTurn: firstActor,
    boardTurn: isAcesFlopStart ? 1 : 0,
    board: boardArray,
    playerHands: idPlayerHands,
    playerStacks,
    currentTurnBets,
    buttonPlayer: playerTurn,
    bigBlindPlayer: actSecond,
    lastRaiser: null,
    winner: null,
    acesPlayerId: opts.variant === "plhe_hu_aces" ? acesPlayerId : null,
    table,
  };
  return { snapshot: out, pogHoleQueue: opts.variant === "plpog_hu" ? pogHoleQueue : null };
}
