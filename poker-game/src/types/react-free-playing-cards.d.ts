declare module 'react-free-playing-cards' {
  import type { FC } from 'react';
  interface CardProps {
    card?: string;
    back?: boolean;
    height?: string | number;
    deckType?: string;
  }
  const Card: FC<CardProps>;
  export default Card;
}
