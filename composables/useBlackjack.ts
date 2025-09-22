import { ref, computed } from 'vue';
import type { Card } from '../types/Card';
import { createDeck, shuffleDeck, calculateHandValue } from '../utils/deck';

export type GamePhase = 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over';

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: GamePhase;
  gameMessage: string;
  canSplit: boolean;
}

export function useBlackjack() {
  const deck = ref<Card[]>([]);
  const playerHand = ref<Card[]>([]);
  const dealerHand = ref<Card[]>([]);
  const phase = ref<GamePhase>('betting');
  const gameMessage = ref<string>('Welcome to Blackjack!');

  const playerHandValue = computed(() => calculateHandValue(playerHand.value));
  const dealerHandValue = computed(() => calculateHandValue(dealerHand.value));

  const canSplit = computed(() => {
    return phase.value === 'player-turn' &&
           playerHand.value.length === 2 &&
           playerHand.value[0].value === playerHand.value[1].value;
  });

  const canHit = computed(() => {
    return phase.value === 'player-turn' && playerHandValue.value.value < 21;
  });

  const canStand = computed(() => {
    return phase.value === 'player-turn';
  });

  const isPlayerBust = computed(() => playerHandValue.value.value > 21);
  const isDealerBust = computed(() => dealerHandValue.value.value > 21);

  function initializeGame() {
    deck.value = shuffleDeck(createDeck());
    playerHand.value = [];
    dealerHand.value = [];
    phase.value = 'dealing';
    gameMessage.value = 'Dealing cards...';

    setTimeout(() => dealInitialCards(), 500);
  }

  function dealCard(): Card | undefined {
    return deck.value.pop();
  }

  function dealInitialCards() {
    playerHand.value.push(dealCard()!);
    dealerHand.value.push(dealCard()!);
    playerHand.value.push(dealCard()!);
    dealerHand.value.push(dealCard()!);

    phase.value = 'player-turn';

    if (playerHandValue.value.value === 21) {
      gameMessage.value = 'Blackjack!';
      stand();
    } else {
      gameMessage.value = 'Your turn! Hit, Stand, or Split if possible.';
    }
  }

  function hit() {
    if (!canHit.value) return;

    const card = dealCard();
    if (card) {
      playerHand.value.push(card);
    }

    if (isPlayerBust.value) {
      gameMessage.value = 'Bust! You went over 21.';
      phase.value = 'game-over';
    } else if (playerHandValue.value.value === 21) {
      gameMessage.value = 'You got 21!';
      stand();
    }
  }

  function stand() {
    if (!canStand.value && phase.value !== 'player-turn') return;

    phase.value = 'dealer-turn';
    gameMessage.value = 'Dealer\'s turn...';

    setTimeout(() => playDealerTurn(), 1000);
  }

  function playDealerTurn() {
    while (dealerHandValue.value.value < 17) {
      const card = dealCard();
      if (card) {
        dealerHand.value.push(card);
      }
    }

    setTimeout(() => determineWinner(), 1000);
  }

  function determineWinner() {
    phase.value = 'game-over';

    if (isPlayerBust.value) {
      gameMessage.value = 'Dealer wins! You went bust.';
    } else if (isDealerBust.value) {
      gameMessage.value = 'You win! Dealer went bust.';
    } else if (playerHandValue.value.value > dealerHandValue.value.value) {
      gameMessage.value = 'You win!';
    } else if (dealerHandValue.value.value > playerHandValue.value.value) {
      gameMessage.value = 'Dealer wins!';
    } else {
      gameMessage.value = 'It\'s a tie!';
    }
  }

  function split() {
    // Basic split implementation - simplified for this demo
    if (!canSplit.value) return;

    gameMessage.value = 'Split not fully implemented in this demo';
  }

  function newGame() {
    initializeGame();
  }

  return {
    // State
    deck,
    playerHand,
    dealerHand,
    phase,
    gameMessage,

    // Computed
    playerHandValue,
    dealerHandValue,
    canSplit,
    canHit,
    canStand,
    isPlayerBust,
    isDealerBust,

    // Actions
    initializeGame,
    hit,
    stand,
    split,
    newGame
  };
}