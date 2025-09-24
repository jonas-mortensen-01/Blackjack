import type { Card, Suit, CardValue } from '../types/Card';

// Initializes the deck with suit, value and image.
// Value is not the actual value of the card but the character representing the value
// this will need conversion later for other operations.
// An image is not needed here since the frontend functionality allows for missing assets
// which will make it use an alternative hard coded card front with lower detail.
export function createDeck(): Card[] {
  const suits: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values: CardValue[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  const deck: Card[] = [];

  // For each suit create a card of each value
  for (const suit of suits) {
    for (const value of values) {
      deck.push({
        suit,
        value,
        image: `dist/assets/${suit}_${value}.png`
      });
    }
  }

  return deck;
}

// Shuffle function to "shuffle" and return the provided deck
export function shuffleDeck(deck: Card[]): Card[] {
  // Creates a "shuffled" instance of the deck to manipulate
  const shuffled = [...deck];

  // For each card in the "shuffled" collection get a random number and swich [i] with [j]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

// Gets takes a card input and returns the actual value of the card
// 0 means a placeholder which will be hidden meaning back face up and without and initial value
export function getCardValue(card: Card): number {
  if (card.value === 'hidden') return 0; // Placeholder cards have no value

  // Switch with a fallback case for K, Q and J which all have the same value
  switch (card.value) {
    case 'A': return 11;
    case 'K':
    case 'Q':
    case 'J': return 10;
    default: return parseInt(card.value);
  }
}

// Calculates the value of any players hand
export function calculateHandValue(cards: Card[]): { value: number; isSoft: boolean } {
  let value = 0;
  let aces = 0;

  // Loops to find all face-up visible cards and adds them together
  // The reason for this is the dealer would have a face-down card that does not have a value initially
  for (const card of cards) {
    if (card.value === 'hidden') {
      continue; // Skip placeholder cards
    } else if (card.value === 'A') {
      // Aces are used to find if the hand is a "softhand"
      aces++;
      value += 11;
    } else {
      value += getCardValue(card);
    }
  }

  // If the value of the hand is above 21 it will count the amount of aces in the hand 
  // to attempt to reduce the value below 21 / "bust"
  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }

  // Returns the value and if the hand is soft meaning if the value is below 21 and aces are present
  return {
    value,
    isSoft: aces > 0 && value <= 21
  };
}