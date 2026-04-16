import type { CSSProperties } from 'react';

export type SeatPos = { top: number; left: number };

const PRESET: Record<number, SeatPos[]> = {
  2: [
    { top: 88, left: 50 },
    { top: 12, left: 50 },
  ],
  3: [
    { top: 86, left: 50 },
    { top: 20, left: 16 },
    { top: 20, left: 84 },
  ],
  4: [
    { top: 84, left: 50 },
    { top: 50, left: 88 },
    { top: 16, left: 50 },
    { top: 50, left: 12 },
  ],
  5: [
    { top: 84, left: 50 },
    { top: 58, left: 86 },
    { top: 22, left: 72 },
    { top: 22, left: 28 },
    { top: 58, left: 14 },
  ],
  6: [
    { top: 84, left: 50 },
    { top: 62, left: 86 },
    { top: 28, left: 82 },
    { top: 14, left: 50 },
    { top: 28, left: 18 },
    { top: 62, left: 14 },
  ],
  7: [
    { top: 84, left: 50 },
    { top: 66, left: 86 },
    { top: 36, left: 90 },
    { top: 16, left: 64 },
    { top: 16, left: 36 },
    { top: 36, left: 10 },
    { top: 66, left: 14 },
  ],
  8: [
    { top: 84, left: 50 },
    { top: 68, left: 86 },
    { top: 40, left: 92 },
    { top: 18, left: 74 },
    { top: 12, left: 50 },
    { top: 18, left: 26 },
    { top: 40, left: 8 },
    { top: 68, left: 14 },
  ],
  9: [
    { top: 84, left: 50 },
    { top: 70, left: 86 },
    { top: 44, left: 92 },
    { top: 22, left: 80 },
    { top: 12, left: 58 },
    { top: 12, left: 42 },
    { top: 22, left: 20 },
    { top: 44, left: 8 },
    { top: 70, left: 14 },
  ],
};

function circlePositions(n: number): SeatPos[] {
  const r = n <= 4 ? 36 : n <= 6 ? 38 : 40;
  return Array.from({ length: n }, (_, i) => {
    const angle = Math.PI / 2 + (2 * Math.PI * i) / n;
    return {
      top: 50 + r * Math.sin(angle),
      left: 50 + r * Math.cos(angle),
    };
  });
}

export function getSeatPositions(playerCount: number): SeatPos[] {
  const n = Math.max(1, Math.floor(playerCount));
  if (n === 1) return [{ top: 88, left: 50 }];
  if (PRESET[n]) return PRESET[n]!;
  return circlePositions(n);
}

export function sortedSeatIds(stacksRecord: Record<string, number> | undefined): string[] {
  return Object.keys(stacksRecord ?? {}).sort();
}

export function rotateSeatsForViewer(ids: string[], viewerId: string): string[] {
  const list = [...ids];
  const idx = list.indexOf(viewerId);
  if (idx < 0 || idx === 0) return list;
  return [...list.slice(idx), ...list.slice(0, idx)];
}

export function seatAnchorStyle(pos: SeatPos): CSSProperties {
  return {
    position: 'absolute',
    top: `${pos.top}%`,
    left: `${pos.left}%`,
    transform: 'translate(-50%, -50%)',
  };
}

export function seatFlexStyle(pos: SeatPos): CSSProperties {
  const towardBottom = pos.top >= 50;
  return {
    flexDirection: towardBottom ? 'column-reverse' : 'column',
  };
}

export function seatLabel(playerId: string, viewerId: string, slotIndex: number, totalSeats: number): string {
  if (playerId === viewerId) return 'You';
  if (totalSeats === 2) return 'Opponent';
  return `Seat ${slotIndex + 1}`;
}

export function getBetOnFeltPositions(playerCount: number): SeatPos[] {
  const seats = getSeatPositions(playerCount);
  const pull = 0.52;
  return seats.map(({ top, left }) => ({
    top: 50 + (top - 50) * pull,
    left: 50 + (left - 50) * pull,
  }));
}
