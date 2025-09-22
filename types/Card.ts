export interface Card {
  suit: 'hearts' | 'diamonds' | 'clubs' | 'spades' | 'placeholder';
  value: 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'hidden';
  image?: string;
}

export type Suit = Card['suit'];
export type CardValue = Card['value'];