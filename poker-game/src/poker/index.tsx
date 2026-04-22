import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ChangeEvent } from 'react';
import type { Socket } from 'socket.io-client';
import { io } from 'socket.io-client';
import Board from './board';
import { ChipStack } from './ChipStack';
import Hand from './hand';
import {
  getSeatPositions,
  rotateSeatsForViewer,
  seatAnchorStyle,
  seatFlexStyle,
  seatLabel,
  sortedSeatIds,
} from './tableLayouts';
import type {
  ActiveHandState,
  HandHistoryEntry,
  HandSnapshot,
  LastHandResult,
  TableConfigPayload,
} from 'poker-shared';
import { holeCardCountForVariant, isGameOver } from 'poker-shared';
import { formatTableLabel, resolveTableMeta } from './tableMeta';
import { socketOrigin } from '../apiBase';
import HandResultOverlay from './HandResultOverlay';
import HandHistoryPanel from './HandHistoryPanel';
import './poker.css';

const HAND_RESULT_MS = 2800;

type PokerProps = {
  /** Must match a server room (`default` exists; API-created games use the returned id). */
  roomId: string;
};

function Poker({ roomId }: PokerProps) {
  const [started, setStarted] = useState(false);
  const [betSize, setBetSize] = useState(0);
  const [handState, setHandState] = useState<HandSnapshot | null>(null);
  const [socketId, setSocketId] = useState<string | null>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [serverTable, setServerTable] = useState<TableConfigPayload | null>(null);
  const [handResultOverlay, setHandResultOverlay] = useState<LastHandResult | null>(null);
  const [handHistory, setHandHistory] = useState<HandHistoryEntry[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);

  const calculateMinRaiseSize = useCallback(
    (
      opponentCurrentBet: number,
      playerCurrentBet: number,
      lastRaiser: string | null,
      bigBlind: number,
    ) => {
      if (lastRaiser == null) {
        return 2 * bigBlind;
      }
      return 2 * opponentCurrentBet - playerCurrentBet;
    },
    [],
  );

  const getOpponentId = useCallback((state: ActiveHandState): string | undefined => {
    return Object.keys(state.playerStacks).find((playerId) => playerId !== socketId);
  }, [socketId]);

  useEffect(() => {
    setHandHistory([]);
    const url = socketOrigin();
    const ws = io(url, {
      query: { room: roomId },
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
    });

    ws.on('joinError', (err: { reason?: string }) => {
      console.warn('socket joinError', err?.reason);
    });

    ws.on('tableConfig', (payload: TableConfigPayload) => {
      setServerTable(payload);
    });

    ws.on('playerConnected', (id: string) => {
      setSocketId(id);
    });

    ws.on('receiveHandState', (raw: unknown) => {
      const parsed = typeof raw === 'string' ? (JSON.parse(raw) as HandSnapshot) : (raw as HandSnapshot);
      setHandState(parsed);
    });

    ws.on('playerleft', () => {
      setStarted(false);
    });

    ws.on('started', () => {
      setStarted(true);
    });

    ws.on('handHistory', (raw: string) => {
      try {
        const parsed = JSON.parse(raw) as unknown;
        setHandHistory(Array.isArray(parsed) ? (parsed as HandHistoryEntry[]) : []);
      } catch {
        setHandHistory([]);
      }
    });

    ws.on('handHistoryAppend', (raw: string) => {
      try {
        const e = JSON.parse(raw) as HandHistoryEntry;
        if (e?.handNumber == null) return;
        setHandHistory((prev) => {
          if (prev.some((p) => p.handNumber === e.handNumber)) {
            return prev;
          }
          return [...prev, e].slice(-50);
        });
      } catch {
        /* ignore */
      }
    });

    setSocket(ws);

    return () => {
      ws.disconnect();
    };
  }, [roomId]);

  useEffect(() => {
    if (handState == null || socketId == null || isGameOver(handState)) return;
    const opponentId = Object.keys(handState.playerStacks).find((id) => id !== socketId);
    if (opponentId == null) return;
    setBetSize(
      calculateMinRaiseSize(
        handState.currentTurnBets[opponentId]!,
        handState.currentTurnBets[socketId]!,
        handState.lastRaiser,
        resolveTableMeta(handState, serverTable).betting.bigBlind,
      ),
    );
  }, [handState, socketId, calculateMinRaiseSize, serverTable]);

  useEffect(() => {
    if (handState == null || isGameOver(handState) || !handState.lastHandResult) {
      setHandResultOverlay(null);
      return;
    }
    const r = handState.lastHandResult;
    setHandResultOverlay(r);
    const t = window.setTimeout(() => setHandResultOverlay(null), HAND_RESULT_MS);
    return () => clearTimeout(t);
  }, [handState]);

  const handleChangeBetSize = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const valueRaw = event.target.value;
      const value = valueRaw === '' ? 0 : Number(valueRaw);
      if (!handState || socketId == null || isGameOver(handState)) return;
      const maxBet =
        handState.currentMaxRaiseTo ??
        handState.currentTurnBets[socketId]! + handState.playerStacks[socketId]!;
      const clamped = Number.isFinite(value) ? Math.min(Math.max(value, 0), maxBet) : 0;
      setBetSize(clamped);
    },
    [handState, socketId],
  );

  const fold = useCallback(() => {
    socket?.emit('playerAction', JSON.stringify({ actionType: 'fold' }));
  }, [socket]);

  const raise = useCallback(() => {
    socket?.emit(
      'playerAction',
      JSON.stringify({
        actionType: 'raise',
        betSize: Math.floor(Number(betSize)),
      }),
    );
  }, [socket, betSize]);

  const call = useCallback(() => {
    socket?.emit('playerAction', JSON.stringify({ actionType: 'call' }));
  }, [socket]);

  const check = useCallback(() => {
    socket?.emit('playerAction', JSON.stringify({ actionType: 'check' }));
  }, [socket]);

  /** Raise-to total = current street bet + fraction × pot (clamped to min/max legal raise). */
  const applyPotFraction = useCallback(
    (fraction: number) => {
      if (handState == null || socketId == null || isGameOver(handState)) return;
      const hs = handState;
      const opponentId = getOpponentId(hs);
      if (opponentId == null) return;
      const my = hs.currentTurnBets[socketId]!;
      const pot = hs.potSize;
      const meta = resolveTableMeta(hs, serverTable);
      const minR = calculateMinRaiseSize(
        hs.currentTurnBets[opponentId]!,
        hs.currentTurnBets[socketId]!,
        hs.lastRaiser,
        meta.betting.bigBlind,
      );
      const maxR =
        hs.currentMaxRaiseTo ?? hs.currentTurnBets[socketId]! + hs.playerStacks[socketId]!;
      const raw = my + pot * fraction;
      const clamped = Math.floor(Math.min(maxR, Math.max(minR, raw)));
      setBetSize(clamped);
    },
    [handState, socketId, getOpponentId, calculateMinRaiseSize, serverTable],
  );

  const table = useMemo(() => {
    if (handState == null || socketId == null) {
      return (
        <div className="poker-wait">
          <p>Open another tab here so two players connect.</p>
          <p className="poker-note">Connecting…</p>
          {serverTable != null && (
            <p className="poker-note">{formatTableLabel(resolveTableMeta(null, serverTable))}</p>
          )}
        </div>
      );
    }

    if (isGameOver(handState)) {
      const winnerYou = handState.gameWinner === socketId;
      return (
        <div className="poker-shell">
          <p className="poker-note">{formatTableLabel(resolveTableMeta(handState, serverTable))}</p>
          <p className="poker-note">Game over — {winnerYou ? 'You win' : 'Opponent wins'}.</p>
        </div>
      );
    }

    const hs = handState;
    const meta = resolveTableMeta(handState, serverTable);
    const holeN = holeCardCountForVariant(meta.variant);

    const opponentId = getOpponentId(hs);
    if (opponentId == null) {
      return (
        <div className="poker-wait">
          <p className="poker-note">Waiting for opponent…</p>
        </div>
      );
    }
    const turn = hs.boardTurn;
    const isPlayerTurn = socketId === hs.playerTurn;
    const isCheckAllowed = hs.currentTurnBets[socketId] === hs.currentTurnBets[opponentId];
    const isCallAllowed = hs.currentTurnBets[socketId]! < hs.currentTurnBets[opponentId]!;
    const maxRaiseTo =
      hs.currentMaxRaiseTo ?? hs.currentTurnBets[socketId]! + hs.playerStacks[socketId]!;
    const minRaise = calculateMinRaiseSize(
      hs.currentTurnBets[opponentId]!,
      hs.currentTurnBets[socketId]!,
      hs.lastRaiser,
      meta.betting.bigBlind,
    );
    const isRaiseAllowed = minRaise <= maxRaiseTo && hs.currentTurnBets[socketId]! < maxRaiseTo;

    const idsSorted = sortedSeatIds(hs.playerStacks);
    const seatIds = rotateSeatsForViewer(idsSorted, socketId);
    const seatCount = seatIds.length;
    const positions = getSeatPositions(seatCount);

    const cardHeightForSeat =
      seatCount <= 4 ? 'clamp(72px, 9vw, 108px)' : 'clamp(52px, 6vw, 88px)';

    return (
      <div className="poker-shell">
        {!started && <p className="poker-note">Waiting for second player.</p>}
        <p className="poker-note poker-note--meta">{formatTableLabel(meta)}</p>

        <div className={`poker-table-ring poker-table-ring--players-${seatCount}`}>
          {seatIds.map((playerId, slot) => {
            const pos = positions[slot] ?? positions[0]!;
            const isHero = playerId === socketId;
            const cap = seatLabel(playerId, socketId, slot, seatCount);
            const stack = hs.playerStacks[playerId] ?? 0;
            const isButton = hs.buttonPlayer === playerId;

            return (
              <div
                key={playerId}
                className="poker-seat"
                style={seatAnchorStyle(pos)}
                data-slot={slot}
              >
                <div className="poker-seat__inner" style={seatFlexStyle(pos)}>
                  {isButton && (
                    <span className="dealer-disc" title="Dealer" aria-label="Dealer button">
                      D
                    </span>
                  )}
                  <ChipStack amount={stack} caption={cap} variant="seat" />
                  {isHero ? (
                    <Hand
                      handArray={hs.playerHands[playerId]!}
                      cardHeight={cardHeightForSeat}
                      fourCardRow={holeN === 4}
                    />
                  ) : (
                    <Hand
                      hidden
                      cardAmount={holeN}
                      cardHeight={cardHeightForSeat}
                      fourCardRow={holeN === 4}
                    />
                  )}
                  {turn === 4 && hs.playerHands[playerId] != null && !isHero && (
                    <div className="poker-note">{hs.playerHands[playerId]!.join(' ')}</div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="poker-table-center">
            <Board
              boardArray={hs.board}
              turn={hs.boardTurn}
              potSize={hs.potSize}
              seatCount={seatCount}
              seatIds={seatIds}
              currentTurnBets={hs.currentTurnBets}
              viewerId={socketId}
            />
          </div>
        </div>

        {isPlayerTurn ? (
          <div className="poker-actions">
            <label htmlFor="raise-amount">Raise to</label>
            <input
              id="raise-amount"
              type="number"
              value={betSize}
              min={minRaise}
              max={Math.floor(maxRaiseTo)}
              onChange={handleChangeBetSize}
            />
            {isRaiseAllowed && (
              <div className="poker-presets" role="group" aria-label="Bet size as fraction of pot">
                <button type="button" className="poker-preset" onClick={() => applyPotFraction(0.25)}>
                  25%
                </button>
                <button type="button" className="poker-preset" onClick={() => applyPotFraction(0.5)}>
                  50%
                </button>
                <button type="button" className="poker-preset" onClick={() => applyPotFraction(0.75)}>
                  75%
                </button>
                <button type="button" className="poker-preset" onClick={() => applyPotFraction(1)}>
                  Pot
                </button>
                <button type="button" className="poker-preset" onClick={() => applyPotFraction(1.5)}>
                  150%
                </button>
              </div>
            )}
            <button type="button" onClick={fold}>
              Fold
            </button>
            {isCheckAllowed && (
              <button type="button" onClick={check}>
                Check
              </button>
            )}
            {isCallAllowed && (
              <button type="button" onClick={call}>
                Call
              </button>
            )}
            {isRaiseAllowed && (
              <button type="button" onClick={raise}>
                Raise
              </button>
            )}
          </div>
        ) : (
          <p className="poker-hint">Waiting for another player.</p>
        )}
      </div>
    );
  }, [
    handState,
    socketId,
    started,
    betSize,
    getOpponentId,
    calculateMinRaiseSize,
    handleChangeBetSize,
    fold,
    raise,
    call,
    check,
    serverTable,
    applyPotFraction,
  ]);

  const historyHoleCount = holeCardCountForVariant(resolveTableMeta(handState, serverTable).variant);

  return (
    <div className="poker-root">
      {socketId != null && (
        <div className="poker-toolbar">
          <button type="button" className="poker-toolbar__btn" onClick={() => setHistoryOpen(true)}>
            Hand history{handHistory.length > 0 ? ` (${handHistory.length})` : ''}
          </button>
        </div>
      )}
      {handResultOverlay != null && socketId != null && handState != null && !isGameOver(handState) && (
        <HandResultOverlay
          result={handResultOverlay}
          viewerId={socketId}
          holeCount={historyHoleCount}
        />
      )}
      <HandHistoryPanel
        entries={handHistory}
        viewerId={socketId}
        holeCount={historyHoleCount}
        open={historyOpen}
        onOpenChange={setHistoryOpen}
      />
      {table}
    </div>
  );
}

export default Poker;
