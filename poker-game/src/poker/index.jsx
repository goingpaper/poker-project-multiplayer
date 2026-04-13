import { useState, useEffect, useCallback, useMemo } from 'react';
import { io } from 'socket.io-client';
import Board from './board';
import { ChipStack } from './ChipStack';
import { BIG_BLIND } from './config';
import Hand from './hand';
import {
  getSeatPositions,
  rotateSeatsForViewer,
  seatAnchorStyle,
  seatFlexStyle,
  seatLabel,
  sortedSeatIds,
} from './tableLayouts';
import './poker.css';

const defaultSocketUrl = 'http://127.0.0.1:3001';

function Poker() {
  const [started, setStarted] = useState(false);
  const [betSize, setBetSize] = useState(0);
  const [handState, setHandState] = useState(null);
  const [socketId, setSocketId] = useState(null);
  const [socket, setSocket] = useState(null);

  const calculateMinRaiseSize = useCallback((opponentCurrentBet, playerCurrentBet, lastRaiser) => {
    if (lastRaiser == null) {
      return 2 * BIG_BLIND;
    }
    return 2 * opponentCurrentBet - playerCurrentBet;
  }, []);

  const getOpponentId = useCallback(
    (state) => Object.keys(state.playerStacks).filter((playerId) => playerId !== socketId)[0],
    [socketId],
  );

  useEffect(() => {
    const url = import.meta.env.VITE_SOCKET_URL || defaultSocketUrl;
    const ws = io(url, {
      reconnectionDelayMax: 10000,
      transports: ['websocket'],
    });

    ws.on('playerConnected', (id) => {
      setSocketId(id);
    });

    ws.on('receiveHandState', (raw) => {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      setHandState(parsed);
    });

    ws.on('playerleft', () => {
      setStarted(false);
    });

    ws.on('started', () => {
      setStarted(true);
    });

    setSocket(ws);

    return () => {
      ws.disconnect();
    };
  }, []);

  useEffect(() => {
    if (handState == null || socketId == null) return;
    const opponentId = Object.keys(handState.playerStacks).find((id) => id !== socketId);
    if (opponentId == null) return;
    setBetSize(
      calculateMinRaiseSize(
        handState.currentTurnBets[opponentId],
        handState.currentTurnBets[socketId],
        handState.lastRaiser,
      ),
    );
  }, [handState, socketId, calculateMinRaiseSize]);

  const handleChangeBetSize = useCallback(
    (event) => {
      const valueRaw = event.target.value;
      const value = valueRaw === '' ? 0 : Number(valueRaw);
      if (!handState || !socketId) return;
      const maxBet = handState.currentTurnBets[socketId] + handState.playerStacks[socketId];
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

  const table = useMemo(() => {
    if (handState == null || socketId == null) {
      return (
        <div className="poker-wait">
          <p>Open another tab here so two players connect.</p>
          <p className="poker-note">Connecting…</p>
        </div>
      );
    }

    const opponentId = getOpponentId(handState);
    const turn = handState.boardTurn;
    const isPlayerTurn = socketId === handState.playerTurn;
    const isCheckAllowed = handState.currentTurnBets[socketId] === handState.currentTurnBets[opponentId];
    const isCallAllowed = handState.currentTurnBets[socketId] < handState.currentTurnBets[opponentId];
    const isRaiseAllowed = handState.currentTurnBets[opponentId] < handState.playerStacks[socketId];

    const minRaise = calculateMinRaiseSize(
      handState.currentTurnBets[opponentId],
      handState.currentTurnBets[socketId],
      handState.lastRaiser,
    );

    const idsSorted = sortedSeatIds(handState.playerStacks);
    const seatIds = rotateSeatsForViewer(idsSorted, socketId);
    const seatCount = seatIds.length;
    const positions = getSeatPositions(seatCount);

    const cardHeightForSeat =
      seatCount <= 4 ? 'clamp(72px, 9vw, 108px)' : 'clamp(52px, 6vw, 88px)';

    return (
      <div className="poker-shell">
        {!started && <p className="poker-note">Waiting for second player.</p>}

        <div className={`poker-table-ring poker-table-ring--players-${seatCount}`}>
          {seatIds.map((playerId, slot) => {
            const pos = positions[slot] ?? positions[0];
            const isHero = playerId === socketId;
            const cap = seatLabel(playerId, socketId, slot, seatCount);
            const stack = handState.playerStacks[playerId] ?? 0;
            const isButton = handState.buttonPlayer === playerId;

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
                    <Hand handArray={handState.playerHands[playerId]} cardHeight={cardHeightForSeat} />
                  ) : (
                    <Hand hidden cardAmount={2} cardHeight={cardHeightForSeat} />
                  )}
                  {turn === 4 && handState.playerHands?.[playerId] != null && !isHero && (
                    <div className="poker-note">{handState.playerHands[playerId].join(' ')}</div>
                  )}
                </div>
              </div>
            );
          })}

          <div className="poker-table-center">
            <Board
              boardArray={handState.board}
              turn={handState.boardTurn}
              potSize={handState.potSize}
              seatCount={seatCount}
              seatIds={seatIds}
              currentTurnBets={handState.currentTurnBets}
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
              max={handState.currentTurnBets[socketId] + handState.playerStacks[socketId]}
              onChange={handleChangeBetSize}
            />
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
  ]);

  return <div className="poker-root">{table}</div>;
}

export default Poker;
