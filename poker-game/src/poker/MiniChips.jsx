import { useMemo } from 'react';
import { denomClass, tokensForAmount } from './chipMini';

/**
 * @param {'seat' | 'felt'} [variant]
 */
export function MiniChips({ amount, maxDots = 4, variant = 'seat' }) {
  const total = Math.floor(Number(amount) || 0);
  const { tokens, remainder } = useMemo(
    () => tokensForAmount(total, maxDots),
    [total, maxDots],
  );

  if (total === 0) {
    return (
      <span className={`mini-chips mini-chips--empty mini-chips--${variant}`} aria-hidden>
        <span className="mini-chips__dot mini-chips__dot--empty" />
      </span>
    );
  }

  const showMore = remainder > 0;

  return (
    <span className={`mini-chips mini-chips--${variant}`} aria-hidden>
      <span className="mini-chips__row">
        {tokens.map((denom, i) => (
          <span key={`${denom}-${i}`} className={`mini-chips__dot mini-chips__dot--${denomClass(denom)}`} />
        ))}
        {showMore && <span className="mini-chips__more">+</span>}
      </span>
    </span>
  );
}
