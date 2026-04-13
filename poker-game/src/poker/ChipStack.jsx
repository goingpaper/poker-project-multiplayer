import { MiniChips } from './MiniChips';

/**
 * @param {'seat' | 'felt'} [variant]
 * @param {boolean} [showAmount] — show numeric total; default `true` (pass `false` to hide).
 */
export function ChipStack({ amount, caption, chips = true, variant = 'seat', showAmount }) {
  const total = Math.floor(Number(amount) || 0);
  const onFelt = variant === 'felt';
  const showNumbers = showAmount ?? true;
  const label =
    caption != null && caption !== ''
      ? `${caption}, ${total.toLocaleString()}`
      : total.toLocaleString();

  return (
    <div className={`money money--${variant}`} role="group" aria-label={label}>
      {caption != null && caption !== '' && <span className="money__caption">{caption}</span>}
      <span className="money__line">
        {chips && (
          <MiniChips amount={total} variant={onFelt ? 'felt' : 'seat'} maxDots={onFelt ? 5 : 4} />
        )}
        {showNumbers ? (
          <span className="money__value">{total.toLocaleString()}</span>
        ) : (
          <span className="sr-only">{total.toLocaleString()}</span>
        )}
      </span>
    </div>
  );
}

export default ChipStack;
