import type { Card, Suit, CardValue } from '../types/Card';

export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        // Only include image path if you have actual card images
        // If no images are available, omit this property to use suit/value fallback
        // image: `${value}-${suit}.png`
      });
    }
  }

  return deck;
}

// Alternative function to create deck with image paths (for when you have card images)
export function createDeckWithImages(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        image: `assets/cards/${value}-${suit}.png`
      });
    }
  }

  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

export function getCardValue(card: Card): number {
  switch (card.value) {
    case 'A': return 11;
    case 'K':
    case 'Q':
    case 'J': return 10;
    default: return parseInt(card.value);
  }
}

export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;

  for (const card of cards) {
    if (card.value === 'A') {
      aces++;
      value += 11;
    } else {
      value += getCardValue(card);
    }
  }

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  return {
    value,
    isSoft: aces > 0 && value <= 21
  };
}