import { ref, computed } from 'vue';
import type { Card } from '../types/Card';
import { createDeck, shuffleDeck, calculateHandValue } from '../utils/deck';

// Enum to represent the phases of the game
export type GamePhase = 'setup' | 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over' | 'victory' | 'out-of-chips';

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
  let currentBet = ref<number>(0);
  const startingChips = ref<number>(1000);
  const targetChips = ref<number>(2000);
  const hasDoubledDown = ref(false);
  const cutPercent = ref<number>(.90);
  const cutIndex = ref<number>(0);
  const numDeck = ref<number>(1);
  const shuffleAfterRound = ref<boolean>(true);
  const insuranceBet = ref<number>(0);
  const insuranceAvailable = ref(false);

  // Computed values
  // Initial hand setup
  const playerHandValue = computed(() => calculateHandValue(playerHand.value));
  const dealerHandValue = computed(() => calculateHandValue(dealerHand.value));
  const dealerUpCard = computed(() => dealerHand.value[0]);

  // Gets the players hand and determines if there are exactly 2 cards in their hand 
  // and if they have the same value it will allow for the "split" game action
  const canSplit = computed(() => {
    return phase.value === 'player-turn' &&
      playerHand.value.length === 2 &&
      playerHand.value[0].value === playerHand.value[1].value;
  });

  // If the player has a hand with value less than 21 the player can hit
  const canHit = computed(() => {
    return phase.value === 'player-turn' && playerHandValue.value.value < 21;
  });

  // If the player has their turn they can end it
  const canStand = computed(() => {
    return phase.value === 'player-turn';
  });

  // If the phase is betting and the player has any chips left to bet with
  const canBet = computed(() => {
    return phase.value === 'betting' && chips.value > 0;
  });

  // Sets a maxBet value
  const maxBet = computed(() => {
    return chips.value; // Set a max bet limit
  });

  // Sets a minBet value based on the chips the player has left
  const minBet = computed(() => {
    return Math.min(10, chips.value); // Minimum bet of 10 or remaining chips
  });

  // If any player is bust / hand value is over 21
  const isPlayerBust = computed(() => playerHandValue.value.value > 21);
  const isDealerBust = computed(() => dealerHandValue.value.value > 21);

  // Initializes the starting values for chips target chips and starts the betting
  function startSetup(amount: number, target: number, deckNumber: number = 1) {
    startingChips.value = amount;
    targetChips.value = target;
    numDeck.value = deckNumber;
    chips.value = amount;
    phase.value = 'betting';
    gameMessage.value = `You have ${chips.value} chips. Goal: ${target}. Place your bet to start!`;
  }

  // Bet an amount provided in the parameter if the amount is larger than the minBet value 
  // and smaller than the amount of chips the player has
  function placeBet(betAmount: number) {
    if (betAmount > chips.value || betAmount < minBet.value) {
      gameMessage.value = `Invalid bet! Min: ${minBet.value}, Max: ${chips.value}`;
      return false;
    }

    currentBet.value = betAmount;
    chips.value -= betAmount;
    gameMessage.value = `Bet placed: ${betAmount} chips. Starting new hand...`;

    // If the bet is allowed this will start the game
    setTimeout(() => initializeGame(), 1000);
    return true;
  }

  // Initializes the game by shuffling and dealing the cards
  function initializeGame() {
    if (shuffleAfterRound.value == true) {
      deck.value = shuffleDeck(createDeck(numDeck.value));
      cutIndex.value = Math.floor(deck.value.length * cutPercent.value);
      shuffleAfterRound.value = false;
    }

    playerHand.value = [];
    dealerHand.value = [];
    phase.value = 'dealing';
    gameMessage.value = 'Dealing cards...';

    setTimeout(() => dealInitialCards(), 500);
  }

  // Takes the top card of the deck and returns it
  function dealCard(): Card | undefined {
    return deck.value.pop();
  }

  // Initial dealing switching between player and dealer with feedback to the player
  function dealInitialCards() {
    const ANIMATION_DURATION = 600;

    // Deal cards with animation timing
    gameMessage.value = 'Dealing first card to player...';
    playerHand.value.push(dealCard()!);

    setTimeout(() => {
      gameMessage.value = 'Dealing first card to dealer...';
      dealerHand.value.push(dealCard()!);

      setTimeout(() => {
        gameMessage.value = 'Dealing second card to player...';
        playerHand.value.push(dealCard()!);

        setTimeout(() => {
          gameMessage.value = 'Dealing second card to dealer...';

          // Last card dealt to the dealer is face-down
          dealerHand.value.push({ suit: 'placeholder', value: 'hidden' });

          // Instead of an instant win on player drawing blackjack 
          // the game will allow them to press stand to provide more interaction with the game
          setTimeout(() => {
            phase.value = 'player-turn';

            if (playerHandValue.value.value === 21) {
              gameMessage.value = 'Blackjack! You can stand to continue.';
            } else {
              gameMessage.value = 'Your turn! Hit, Stand, or Split if possible.';
            }

            checkInsurance();
          }, ANIMATION_DURATION);
        }, ANIMATION_DURATION);
      }, ANIMATION_DURATION);
    }, ANIMATION_DURATION);
  }

  // Places an insurance bet
  function placeInsurance(initialInsuranceBet: number) {
    if (!insuranceAvailable.value) return;

    const insurance = initialInsuranceBet;
    chips.value -= insurance;
    insuranceBet.value = insurance;

    stand();
  }

  // Checks if the insurance has won if so adds the winnings to the chip count
  function resolveInsurance(dealerHasBlackjack: boolean): boolean {
    if (dealerHasBlackjack) {
      // player wins 2:1 on insurance
      chips.value += insuranceBet.value * 2;
    }

    return dealerHasBlackjack;
  }

  // If the player can hit it will deal them a card if one is present on the deck
  // and determines afterwards if the player is bust and has lost 
  function hit() {
    if (!canHit.value) return;

    const ANIMATION_DURATION = 600;

    gameMessage.value = 'Dealing card...';
    const card = dealCard();
    if (card) {
      playerHand.value.push(card);
    }

    // After hit determine if the player has lost or has blackjack
    setTimeout(() => {
      // If the playerhand is above 21 and they have no chips left to bet with
      if (isPlayerBust.value) {
        if (chips.value == 0) {
          phase.value = 'out-of-chips';
          gameMessage.value = ` Game Over! You're out of chips.`;
        }
        else {
          gameMessage.value = 'Bust! You went over 21.';
          phase.value = 'game-over';
        }
      } else if (playerHandValue.value.value === 21) {
        gameMessage.value = 'You got 21! You can stand to continue.';
      } else {
        gameMessage.value = 'Your turn! Hit, Stand, or Split if possible.';
      }
    }, ANIMATION_DURATION);
  }

  // Finds the placeholder card in the dealers hand and replaces it with and actual card
  function assignDealerHiddenCard() {
    // Find the placeholder card and replace it with a real card
    const placeholderIndex = dealerHand.value.findIndex(card => card.value === 'hidden');
    if (placeholderIndex !== -1) {
      const realCard = dealCard();
      if (realCard) {
        dealerHand.value[placeholderIndex] = realCard;
      }
    }
  }

  // If the player has their turn it will end and play the dealers turn
  function stand() {
    if (!canStand.value && phase.value !== 'player-turn') return;

    phase.value = 'dealer-turn';
    gameMessage.value = 'Revealing dealer\'s card...';

    // Assign real card to placeholder
    assignDealerHiddenCard();

    setTimeout(() => playDealerTurn(), 1000);
  }

  // Plays the dealers turn
  function playDealerTurn() {
    const ANIMATION_DURATION = 600; // Match CSS animation duration

    // If the player is bust the dealer wins
    if (playerHandValue.value.value > 21) {
      gameMessage.value = `Player busts with ${playerHandValue.value.value}! Dealer wins automatically.`;
      setTimeout(() => determineWinner(), ANIMATION_DURATION);
      return;
    }

    // Deals cards to the dealer until they have beaten the player or gone bust
    const dealDealerCard = () => {
      const dealerTotal = dealerHandValue.value.value;
      const playerTotal = playerHandValue.value.value;

      // If dealer has already beaten or tied the player (without busting)
      if (dealerTotal >= playerTotal && dealerTotal <= 21) {
        gameMessage.value = `Dealer stands with ${dealerTotal}. 
        `;
        setTimeout(() => determineWinner(), ANIMATION_DURATION);
        return;
      }

      // If dealer is bust
      if (dealerTotal > 21) {
        gameMessage.value = `Dealer busts with ${dealerTotal}! 
        `;
        setTimeout(() => determineWinner(), ANIMATION_DURATION);
        return;
      }

      // Otherwise, dealer hits
      gameMessage.value = `Dealer hits (has ${dealerTotal})... 
      `;
      const card = dealCard();
      if (card) {
        dealerHand.value.push(card);
      }

      setTimeout(() => {
        dealDealerCard();
      }, ANIMATION_DURATION);
    };

    dealDealerCard();
  }

  // Allows for the doubleDown feature where a player can double their bet for one more card
  function doubleDown() {
    // If the player has enough chips to double the currentBet
    if (chips.value >= currentBet.value) {
      hasDoubledDown.value = true;

      const newCard = deck.value.pop();
      playerHand.value.push(newCard!);

      chips.value -= currentBet.value;
      currentBet.value += currentBet.value;

      stand();
    }
  }

  // Determines a winner for the game
  // If the player wins they get payout, if it is tied the player gets their bet back
  // If the player has blackjack on 2 cards and dealer does not the player wins with a 3:2 payout
  function determineWinner() {
    phase.value = 'game-over';
    let winnings = 0;

    // Check for blackjack (21 with 2 cards)
    const playerBlackjack = playerHandValue.value.value === 21 && playerHand.value.length === 2;
    const dealerBlackjack = dealerHandValue.value.value === 21 && dealerHand.value.length === 2;

    // Resolves insurance payout if it has any and how much
    const insuranceHasPayout = resolveInsurance(dealerBlackjack);

    if (insuranceHasPayout == true) {
      gameMessage.value += `Insurance payout! Won ${insuranceBet.value * 2} chips. 
      `;
    }
    else {
      gameMessage.value += `Insurance lost! lost ${insuranceBet.value} chips. 
      `;
    }

    // Reset insurance state
    insuranceBet.value = 0;
    insuranceAvailable.value = false;

    if (isPlayerBust.value) {
      gameMessage.value += `Dealer wins! You went bust. Lost ${currentBet.value} chips. 
      `;
      // Player already lost chips when betting, no change needed
    } else if (isDealerBust.value) {
      winnings = currentBet.value * 2; // Get bet back + equal amount
      gameMessage.value += `You win! Dealer went bust. Won ${currentBet.value} chips. 
      `;
    } else if (playerBlackjack && !dealerBlackjack) {
      winnings = Math.floor(currentBet.value * 2.5); // Blackjack pays 3:2
      gameMessage.value += `Blackjack! Won ${winnings - currentBet.value} chips. 
      `;
    } else if (dealerBlackjack && !playerBlackjack) {
      gameMessage.value += `Dealer has blackjack! Lost ${currentBet.value} chips. 
      `;
    } else if (playerHandValue.value.value > dealerHandValue.value.value) {
      winnings = currentBet.value * 2;
      gameMessage.value += `You win! Won ${currentBet.value} chips. 
      `;
    } else if (dealerHandValue.value.value > playerHandValue.value.value) {
      gameMessage.value += `Dealer wins! Lost ${currentBet.value} chips. 
      `;
    } else {
      winnings = currentBet.value; // Push - return bet
      gameMessage.value += `It's a tie! Your bet of ${currentBet.value} chips is returned. 
      `;
    }

    chips.value += winnings;

    // If the player has enough chips to reach the target
    if (chips.value >= targetChips.value) {
      phase.value = 'victory';
      gameMessage.value = `🎉 CONGRATULATIONS! You reached your goal of ${targetChips.value} chips! You won with ${chips.value} chips! 
      `;
      return;
    }

    // If player is out of money
    if (chips.value == 0) {
      phase.value = 'out-of-chips';
      gameMessage.value += ` Game Over! You're out of chips. 
      `;
    } else {
      gameMessage.value += ` Chips: ${chips.value} / Goal: ${targetChips.value}. 
      `;
    }

    if (deck.value.length <= cutIndex.value) {
      shuffleAfterRound.value = true;
      gameMessage.value += `Cut card reached! Reshuffling deck after round end. 
      `;
    }
  }

  // Split implementation / Not made yet 
  function split() {
    if (!canSplit.value) return;

    gameMessage.value = 'Split not fully implemented in this demo';
  }

  // Check if insurance is available
  function checkInsurance() {
    const value = dealerUpCard.value?.value;
    console.log("value", value);
    console.log("dealer card", dealerUpCard);
    insuranceAvailable.value = value === 'A' || ['10', 'J', 'Q', 'K'].includes(value);
  };

  // Determines if the game can continue
  // If the player has no chips the game ends
  function newGame() {
    if (chips.value >= minBet.value) {
      currentBet.value = 0;
      hasDoubledDown.value = false;
      phase.value = 'betting';
      gameMessage.value = `You have ${chips.value} chips. Goal: ${targetChips.value}. Place your bet for the next hand!`;
    } else {
      phase.value = 'setup';
      gameMessage.value = 'Game Over! You ran out of chips. Set your starting chips and goal to play again.';
    }
  }

  // Resets the game and goes back to setup to allow configuring it for a new game
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
    hasDoubledDown,
    insuranceAvailable,
    insuranceBet,

    // Computed
    dealerUpCard,
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
    startSetup,
    placeBet,
    initializeGame,
    hit,
    stand,
    split,
    newGame,
    restartGame,
    assignDealerHiddenCard,
    doubleDown,
    placeInsurance
  };
}