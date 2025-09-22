import { ref, computed } from 'vue';
import type { Card } from '../types/Card';
import { createDeck, shuffleDeck, calculateHandValue } from '../utils/deck';

export type GamePhase = 'setup' | 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over' | 'victory';

export interface GameState {
  deck: Card[];
  playerHand: Card[];
  dealerHand: Card[];
  phase: GamePhase;
  gameMessage: string;
  canSplit: boolean;
  chips: number;
  currentBet: number;
  startingChips: number;
  targetChips: number;
}

export function useBlackjack() {
  const deck = ref<Card[]>([]);
  const playerHand = ref<Card[]>([]);
  const dealerHand = ref<Card[]>([]);
  const phase = ref<GamePhase>('setup');
  const gameMessage = ref<string>('Welcome to Blackjack! Set your starting chips and win goal to begin.');
  const chips = ref<number>(1000);
  const currentBet = ref<number>(0);
  const startingChips = ref<number>(1000);
  const targetChips = ref<number>(2000);

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

  const canBet = computed(() => {
    return phase.value === 'betting' && chips.value > 0;
  });

  const maxBet = computed(() => {
    return Math.min(chips.value, 500); // Set a max bet limit
  });

  const minBet = computed(() => {
    return Math.min(10, chips.value); // Minimum bet of 10 or remaining chips
  });

  const isPlayerBust = computed(() => playerHandValue.value.value > 21);
  const isDealerBust = computed(() => dealerHandValue.value.value > 21);

  function setStartingChips(amount: number, target: number) {
    startingChips.value = amount;
    targetChips.value = target;
    chips.value = amount;
    phase.value = 'betting';
    gameMessage.value = `You have ${chips.value} chips. Goal: ${target}. Place your bet to start!`;
  }

  function placeBet(betAmount: number) {
    if (betAmount > chips.value || betAmount < minBet.value) {
      gameMessage.value = `Invalid bet! Min: ${minBet.value}, Max: ${chips.value}`;
      return false;
    }

    currentBet.value = betAmount;
    chips.value -= betAmount;
    gameMessage.value = `Bet placed: ${betAmount} chips. Starting new hand...`;

    setTimeout(() => initializeGame(), 1000);
    return true;
  }

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
    let winnings = 0;

    // Check for blackjack (21 with 2 cards)
    const playerBlackjack = playerHandValue.value.value === 21 && playerHand.value.length === 2;
    const dealerBlackjack = dealerHandValue.value.value === 21 && dealerHand.value.length === 2;

    if (isPlayerBust.value) {
      gameMessage.value = `Dealer wins! You went bust. Lost ${currentBet.value} chips.`;
      // Player already lost chips when betting, no change needed
    } else if (isDealerBust.value) {
      winnings = currentBet.value * 2; // Get bet back + equal amount
      gameMessage.value = `You win! Dealer went bust. Won ${currentBet.value} chips!`;
    } else if (playerBlackjack && !dealerBlackjack) {
      winnings = Math.floor(currentBet.value * 2.5); // Blackjack pays 3:2
      gameMessage.value = `Blackjack! Won ${winnings - currentBet.value} chips!`;
    } else if (dealerBlackjack && !playerBlackjack) {
      gameMessage.value = `Dealer has blackjack! Lost ${currentBet.value} chips.`;
    } else if (playerHandValue.value.value > dealerHandValue.value.value) {
      winnings = currentBet.value * 2;
      gameMessage.value = `You win! Won ${currentBet.value} chips!`;
    } else if (dealerHandValue.value.value > playerHandValue.value.value) {
      gameMessage.value = `Dealer wins! Lost ${currentBet.value} chips.`;
    } else {
      winnings = currentBet.value; // Push - return bet
      gameMessage.value = `It's a tie! Your bet of ${currentBet.value} chips is returned.`;
    }

    chips.value += winnings;

    // Check for victory condition first
    if (chips.value >= targetChips.value) {
      phase.value = 'victory';
      gameMessage.value = `🎉 CONGRATULATIONS! You reached your goal of ${targetChips.value} chips! You won with ${chips.value} chips!`;
      return;
    }

    // Check if player is out of money
    if (chips.value < minBet.value) {
      gameMessage.value += ` Game Over! You're out of chips.`;
    } else {
      gameMessage.value += ` Chips: ${chips.value} / Goal: ${targetChips.value}`;
    }
  }

  function split() {
    // Basic split implementation - simplified for this demo
    if (!canSplit.value) return;

    gameMessage.value = 'Split not fully implemented in this demo';
  }

  function newGame() {
    if (chips.value >= minBet.value) {
      currentBet.value = 0;
      phase.value = 'betting';
      gameMessage.value = `You have ${chips.value} chips. Goal: ${targetChips.value}. Place your bet for the next hand!`;
    } else {
      phase.value = 'setup';
      gameMessage.value = 'Game Over! You ran out of chips. Set your starting chips and goal to play again.';
    }
  }

  function restartGame() {
    phase.value = 'setup';
    chips.value = 1000;
    currentBet.value = 0;
    startingChips.value = 1000;
    targetChips.value = 2000;
    gameMessage.value = 'Welcome to Blackjack! Set your starting chips and win goal to begin.';
  }

  return {
    // State
    deck,
    playerHand,
    dealerHand,
    phase,
    gameMessage,
    chips,
    currentBet,
    startingChips,
    targetChips,

    // Computed
    playerHandValue,
    dealerHandValue,
    canSplit,
    canHit,
    canStand,
    canBet,
    maxBet,
    minBet,
    isPlayerBust,
    isDealerBust,

    // Actions
    setStartingChips,
    placeBet,
    initializeGame,
    hit,
    stand,
    split,
    newGame,
    restartGame
  };
}