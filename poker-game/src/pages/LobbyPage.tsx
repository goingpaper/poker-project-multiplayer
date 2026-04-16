import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CreateTableRequest, CreateTableResponse } from 'poker-shared';
import { socketOrigin } from '../apiBase';

export default function LobbyPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [variant, setVariant] = useState<CreateTableRequest['variant']>('nlhe_hu');
  const [format, setFormat] = useState<CreateTableRequest['format']>('cash');
  const [bettingStructure, setBettingStructure] = useState<CreateTableRequest['bettingStructure']>(
    'no_limit',
  );
  const [smallBlind, setSmallBlind] = useState(5);
  const [bigBlind, setBigBlind] = useState(10);
  const [initialStack, setInitialStack] = useState(1000);
  const [cashAutoRefill, setCashAutoRefill] = useState(true);
  const [cashStackCap, setCashStackCap] = useState(1000);
  const [joinRoomId, setJoinRoomId] = useState('');

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get('room')?.trim();
    if (q) {
      navigate(`/play/${encodeURIComponent(q)}`, { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (variant === 'plo_hu' && bettingStructure === 'no_limit') {
      setBettingStructure('pot_limit');
    }
  }, [variant, bettingStructure]);

  async function createTable(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const body: CreateTableRequest = {
      variant,
      format,
      bettingStructure,
      smallBlind,
      bigBlind,
      initialStack,
      ...(format === 'cash'
        ? { cashAutoRefill, cashStackCap: Math.max(initialStack, cashStackCap) }
        : {}),
    };
    try {
      const res = await fetch(`${socketOrigin()}/api/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(err.error || res.statusText);
      }
      const data = (await res.json()) as CreateTableResponse;
      navigate(data.playPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create table');
    } finally {
      setLoading(false);
    }
  }

  function joinRoom(e: FormEvent) {
    e.preventDefault();
    const id = joinRoomId.trim();
    if (!id) {
      setError('Enter a room id');
      return;
    }
    navigate(`/play/${encodeURIComponent(id)}`);
  }

  return (
    <div className="lobby">
      <h1 className="lobby__title">Poker</h1>
      <p className="lobby__lead">Create a heads-up table or join with a room id.</p>

      <form className="lobby__card" onSubmit={createTable}>
        <h2>New table</h2>
        <label className="lobby__field">
          Variant
          <select value={variant} onChange={(ev) => setVariant(ev.target.value as typeof variant)}>
            <option value="nlhe_hu">No-limit Hold&apos;em (HU)</option>
            <option value="plo_hu">Pot-limit Omaha (HU)</option>
          </select>
        </label>
        <label className="lobby__field">
          Format
          <select value={format} onChange={(ev) => setFormat(ev.target.value as typeof format)}>
            <option value="cash">Cash</option>
            <option value="tournament">Tournament</option>
          </select>
        </label>
        <label className="lobby__field">
          Betting
          <select
            value={bettingStructure}
            onChange={(ev) => setBettingStructure(ev.target.value as typeof bettingStructure)}
          >
            <option value="no_limit">No limit</option>
            <option value="pot_limit">Pot limit</option>
          </select>
        </label>
        <div className="lobby__row">
          <label className="lobby__field">
            Small blind
            <input
              type="number"
              min={1}
              value={smallBlind}
              onChange={(ev) => setSmallBlind(Number(ev.target.value))}
            />
          </label>
          <label className="lobby__field">
            Big blind
            <input
              type="number"
              min={2}
              value={bigBlind}
              onChange={(ev) => setBigBlind(Number(ev.target.value))}
            />
          </label>
        </div>
        <label className="lobby__field">
          Starting stack
          <input
            type="number"
            min={20}
            value={initialStack}
            onChange={(ev) => setInitialStack(Number(ev.target.value))}
          />
        </label>
        {format === 'cash' && (
          <>
            <label className="lobby__field lobby__check">
              <input
                type="checkbox"
                checked={cashAutoRefill}
                onChange={(ev) => setCashAutoRefill(ev.target.checked)}
              />
              Auto top-up to cap between hands
            </label>
            <label className="lobby__field">
              Stack cap
              <input
                type="number"
                min={initialStack}
                value={cashStackCap}
                onChange={(ev) => setCashStackCap(Number(ev.target.value))}
              />
            </label>
          </>
        )}
        <button type="submit" className="lobby__submit" disabled={loading}>
          {loading ? 'Creating…' : 'Create table'}
        </button>
      </form>

      <form className="lobby__card" onSubmit={joinRoom}>
        <h2>Join table</h2>
        <label className="lobby__field">
          Room id
          <input
            type="text"
            placeholder="paste uuid from host"
            value={joinRoomId}
            onChange={(ev) => setJoinRoomId(ev.target.value)}
            autoComplete="off"
          />
        </label>
        <button type="submit" className="lobby__submit lobby__submit--secondary">
          Join
        </button>
      </form>

      <p className="lobby__hint">
        Quick test:{' '}
        <button
          type="button"
          className="lobby__linkish"
          onClick={() => navigate('/play/default')}
        >
          Open default table
        </button>{' '}
        (two tabs, no API).
      </p>

      {error != null && <p className="lobby__error">{error}</p>}
    </div>
  );
}
