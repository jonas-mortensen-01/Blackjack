import { ref, computed } from 'vue';
import type { Card } from '../types/Card';
import type { Hand } from '../types/Hand';
import { createDeck, shuffleDeck, calculateHandValue } from '../utils/deck';

// Enum to represent the phases of the game
export type GamePhase = 'setup' | 'betting' | 'dealing' | 'player-turn' | 'dealer-turn' | 'game-over' | 'victory' | 'out-of-chips';

export interface GameState {
  deck: Card[];
  playerHands: Hand[];
  activeHandIndex: number;
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
  const playerHands = ref<Hand[]>([]);
  const activeHandIndex = ref<number>(0);
  const dealerHand = ref<Card[]>([]);
  const phase = ref<GamePhase>('setup');
  const gameMessage = ref<string>('Welcome to Blackjack! Set your starting chips and win goal to begin.');
  const chips = ref<number>(1000);
  let currentBet = ref<number>(0);
  const startingChips = ref<number>(1000);
  const targetChips = ref<number>(2000);
  const hasDoubledDown = ref(false);
  const cutPercent = ref<number>(.25);
  const cutIndex = ref<number>(0);
  const numDeck = ref<number>(1);
  const shuffleAfterRound = ref<boolean>(true);
  const insuranceBet = ref<number>(0);
  const insuranceAvailable = ref(false);

  // Computed values
  // Gets the active player hand from an index
  function getActiveHand(): Hand | undefined {
    return playerHands.value[activeHandIndex.value];
  }

  // active hand value (used by UI for the hand the player is acting on)
  const playerHandValue = computed(() => {
    const hand = getActiveHand();
    return hand ? calculateHandValue(hand.cards) : { value: 0, isSoft: false };
  });

  // Initial hand setup
  const dealerHandValue = computed(() => calculateHandValue(dealerHand.value));
  const dealerUpCard = computed(() => dealerHand.value[0]);

  // Gets the players hand and determines if there are exactly 2 cards in their hand 
  // and if they have the same value it will allow for the "split" game action
  const canSplit = computed(() => {
    if (phase.value !== 'player-turn') return false;

    const hand = getActiveHand();
    if (!hand) return false;

    if (hand.cards.length !== 2) return false;
    if (chips.value < hand.bet) return false;

    const [card1, card2] = hand.cards;

    const faceCards = ['J', 'Q', 'K'];

    // Same numeric value
    if (card1.value === card2.value) return true;

    // Both face cards
    if (faceCards.includes(card1.value) && faceCards.includes(card2.value)) return true;

    // Matches a 10 against possible face cards in hand
    if (
      (card1.value === '10' && faceCards.includes(card2.value)) ||
      (card2.value === '10' && faceCards.includes(card1.value))
    ) {
      return true;
    }

    return false;
  });

  // If the player can't double down
  const cannotDoubleDown = computed(() => {
    if (phase.value !== 'player-turn') return false;
    const hv = playerHandValue.value;
    return ((hv && hv.value >= 21 && !hv.isSoft) || hasDoubledDown.value || playerHands.value.length > 1 || chips.value < currentBet.value || playerHands.value[activeHandIndex.value]?.cards.length > 2) ? true : false;
  });

  // If the player has a hand with value less than 21 the player can hit
  const canHit = computed(() => {
    if (phase.value !== 'player-turn') return false;
    const hv = playerHandValue.value;
    return hv && hv.value < 21;
  });

  // If the player has their turn they can end it
  const canStand = computed(() => phase.value === 'player-turn');

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
  const isPlayerBust = computed(() => {
    const hand = getActiveHand();
    return hand ? calculateHandValue(hand.cards).value > 21 : false;
  });
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
    if (shuffleAfterRound.value === true) {
      deck.value = shuffleDeck(createDeck(numDeck.value));
      cutIndex.value = Math.floor(deck.value.length * cutPercent.value);
      shuffleAfterRound.value = false;
    }

    // Reset hands
    playerHands.value = [{
      cards: [],
      bet: currentBet.value,
      insuranceBet: 0,
      isFinished: false,
      hasDoubled: false,
      hasInsurance: false
    } as Hand];

    // Reset game parameters
    activeHandIndex.value = 0;
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

    gameMessage.value = 'Dealing first card to player...';
    playerHands.value[0].cards.push(dealCard()!);

    setTimeout(() => {
      gameMessage.value = 'Dealing first card to dealer...';
      dealerHand.value.push(dealCard()!);

      setTimeout(() => {
        gameMessage.value = 'Dealing second card to player...';
        playerHands.value[0].cards.push(dealCard()!);

        setTimeout(() => {
          gameMessage.value = 'Dealing second card to dealer...';
          dealerHand.value.push({ suit: 'placeholder', value: 'hidden' });

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
    const hand = getActiveHand();
    if (card && hand) {
      hand.cards.push(card);
    }

    setTimeout(() => {
      const hv = getActiveHand() ? calculateHandValue(getActiveHand()!.cards).value : 0;

      // If this active hand busts, mark finished and advance
      if (hv > 21) {
        const finishedHand = getActiveHand();
        if (finishedHand) finishedHand.isFinished = true;

        // If there are more hands that aren't finished, advance to next
        const nextIndex = playerHands.value.findIndex((h, idx) => idx > activeHandIndex.value && !h.isFinished);
        if (nextIndex !== -1) {
          activeHandIndex.value = nextIndex;
          gameMessage.value = `Bust on current hand (${hv}). Moving to next hand.`;
        } else {
          // All hands done -> dealer turn
          gameMessage.value = 'All hands finished. Dealer\'s turn...';
          phase.value = 'dealer-turn';
          assignDealerHiddenCard();
          setTimeout(() => playDealerTurn(), ANIMATION_DURATION);
        }
        return;
      }

      if (hv === 21) {
        gameMessage.value = 'You got 21 on this hand! Stand or continue with other hands.';
      } else {
        gameMessage.value = 'Your turn! Hit, Stand, or Split if possible.';
      }
    }, ANIMATION_DURATION);
  }

  // Finds the placeholder card in the dealers hand and replaces it with and actual card
  function assignDealerHiddenCard() {
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
    if (phase.value !== 'player-turn') return;

    const current = getActiveHand();
    if (current) current.isFinished = true;

    // Find next unfinished hand
    const nextIndex = playerHands.value.findIndex((h, idx) => idx > activeHandIndex.value && !h.isFinished);
    if (nextIndex !== -1) {
      activeHandIndex.value = nextIndex;
      gameMessage.value = `Now playing hand ${activeHandIndex.value + 1}.`;
      return;
    }

    // No more player hands -> dealer turn
    phase.value = 'dealer-turn';
    gameMessage.value = 'Revealing dealer\'s card...';
    assignDealerHiddenCard();
    setTimeout(() => playDealerTurn(), 1000);
  }

  // Plays the dealers turn
  function playDealerTurn() {
    const ANIMATION_DURATION = 600;

    // If all player hands are bust, dealer wins immediately
    const anyPlayerAlive = playerHands.value.some(h => calculateHandValue(h.cards).value <= 21);
    if (!anyPlayerAlive) {
      gameMessage.value = `All player hands bust. Dealer wins automatically.`;
      setTimeout(() => determineWinner(), ANIMATION_DURATION);
      return;
    }

    // Dealer hits until 17 or more (standard rule). Soft-17 handling could be added later.
    const dealDealerCard = () => {
      const dealerTotal = dealerHandValue.value.value;

      if (dealerTotal >= 17 && dealerTotal <= 21) {
        gameMessage.value = `Dealer stands with ${dealerTotal}.`;
        setTimeout(() => determineWinner(), ANIMATION_DURATION);
        return;
      }

      if (dealerTotal > 21) {
        gameMessage.value = `Dealer busts with ${dealerTotal}!`;
        setTimeout(() => determineWinner(), ANIMATION_DURATION);
        return;
      }

      // Dealer hits
      gameMessage.value = `Dealer hits (has ${dealerTotal})...`;
      const card = dealCard();
      if (card) dealerHand.value.push(card);

      setTimeout(dealDealerCard, ANIMATION_DURATION);
    };

    dealDealerCard();
  }

  // Allows for the doubleDown feature where a player can double their bet for one more card
  function doubleDown() {
    const hand = getActiveHand();
    if (!hand || phase.value !== 'player-turn') return;
    // need enough chips to match the hand's bet
    if (chips.value < hand.bet) {
      gameMessage.value = 'Not enough chips to double down.';
      return;
    }

    // Deduct chips and double the bet on this hand
    chips.value -= hand.bet;
    currentBet.value += currentBet.value;
    hand.bet = hand.bet * 2;
    hand.hasDoubled = true;

    // Give exactly one card
    const newCard = dealCard();
    if (newCard) hand.cards.push(newCard);

    // Finish this hand after double down
    hand.isFinished = true;

    // Advance to next unfinished hand or dealer
    const nextIndex = playerHands.value.findIndex((h, idx) => idx > activeHandIndex.value && !h.isFinished);
    if (nextIndex !== -1) {
      activeHandIndex.value = nextIndex;
      gameMessage.value = 'Double down done. Moving to next hand.';
    } else {
      phase.value = 'dealer-turn';
      gameMessage.value = 'All player hands done. Dealer\'s turn...';
      assignDealerHiddenCard();
      setTimeout(() => playDealerTurn(), 800);
    }
  }

  // Determines a winner for the game
  // If the player wins they get payout, if it is tied the player gets their bet back
  // If the player has blackjack on 2 cards and dealer does not the player wins with a 3:2 payout
  function determineWinner() {
    phase.value = 'game-over';
    let totalWinnings = 0;
    let messages: string[] = [];

    // blackjack check for dealer
    const dealerRevealedValue = dealerHandValue.value.value;
    const dealerBlackjack = dealerRevealedValue === 21 && dealerHand.value.length === 2;

    // Resolve insurance (unchanged)
    const insuranceHasPayout = resolveInsurance(dealerBlackjack);
    if (insuranceBet.value > 0) {
      if (insuranceHasPayout) {
        messages.push(`Insurance payout! Won ${insuranceBet.value * 2} chips.`);
      } else {
        messages.push(`Insurance lost! Lost ${insuranceBet.value} chips.`);
      }
    }
    insuranceBet.value = 0;
    insuranceAvailable.value = false;

    // Evaluate each hand individually
    playerHands.value.forEach((hand, index) => {
      const hv = calculateHandValue(hand.cards).value;
      const bet = hand.bet;
      const handNumber = index + 1;
      const playerBlackjack = hv === 21 && hand.cards.length === 2;

      if (hv > 21) {
        // Bust
        messages.push(`Hand ${handNumber} busts with ${hv}. Lost ${bet} chips.`);
        return;
      }

      if (dealerRevealedValue > 21) {
        // Dealer bust
        totalWinnings += bet * 2;
        messages.push(`Dealer busts. Hand ${handNumber} wins ${bet} chips.`);
        return;
      }

      if (playerBlackjack && !dealerBlackjack) {
        // Blackjack
        const payout = Math.floor(bet * 2.5);
        totalWinnings += payout;
        const profit = payout - bet;
        messages.push(`Hand ${handNumber} hits Blackjack! Won ${profit} chips.`);
        return;
      }

      if (dealerBlackjack && !playerBlackjack) {
        messages.push(`Hand ${handNumber} loses. Dealer has Blackjack. Lost ${bet} chips.`);
        return;
      }

      // Regular comparison for player hand with dealer hand
      if (hv > dealerRevealedValue) {
        totalWinnings += bet * 2;
        messages.push(`Hand ${handNumber} wins vs dealer (${hv} vs ${dealerRevealedValue}). Won ${bet} chips.`);
      } else if (hv < dealerRevealedValue) {
        messages.push(`Hand ${handNumber} loses vs dealer (${hv} vs ${dealerRevealedValue}). Lost ${bet} chips.`);
      } else {
        // Push
        totalWinnings += bet;
        messages.push(`Hand ${handNumber} pushes with dealer (${hv}). It's a Tie.`);
      }
    });

    // Apply winnings to chips
    chips.value += totalWinnings;

    // Report messages
    gameMessage.value = messages.join(' \n');

    // Victory or out of chips check
    if (chips.value >= targetChips.value) {
      phase.value = 'victory';
      gameMessage.value = `🎉 CONGRATULATIONS! You reached your goal of ${targetChips.value} chips! You won with ${chips.value} chips!`;
      return;
    }

    if (chips.value === 0) {
      phase.value = 'out-of-chips';
      gameMessage.value += `\nGame Over! You're out of chips.`;
      return;
    }

    // Reshuffle if needed
    if (deck.value.length <= cutIndex.value) {
      shuffleAfterRound.value = true;
      gameMessage.value += `\nCut card reached! Reshuffling deck after round end.`;
    }
  }

  // Split implementation
  // Uses index to find the active player hand of which to run the split
  function split(indexToSplit: number) {
    if (phase.value !== 'player-turn') return;

    const hand = playerHands.value[indexToSplit];
    if (!hand || hand.cards.length !== 2) return;

    if (playerHands.value.length >= 8) return;

    const [card1, card2] = hand.cards;
    const faceCards = ['J', 'Q', 'K'];

    // Can this hand be split?
    const canSplitHand =
    card1.value === card2.value || // same value (10+10, J+J, etc.)
    (faceCards.includes(card1.value) && faceCards.includes(card2.value)) || // both face cards
    ((card1.value === '10' && faceCards.includes(card2.value)) || // 10 + face card
     (card2.value === '10' && faceCards.includes(card1.value)));

    if (!canSplitHand) {
      gameMessage.value = 'This hand cannot be split.';
      return;
    }

    if (chips.value < hand.bet) {
      gameMessage.value = 'Not enough chips to split.';
      return;
    }

    // Deduct chips for the new hand
    chips.value -= hand.bet;

    // Create a new hand from one of the cards
    const movedCard = hand.cards.pop()!;
    const newHand: Hand = {
      cards: [movedCard],
      bet: hand.bet,
      insuranceBet: 0,
      isFinished: false,
      hasDoubled: false,
      hasInsurance: false,
    };

    // Insert new hand next to the current one
    playerHands.value.splice(indexToSplit + 1, 0, newHand);

    // Deal one card to each split hand
    const cardForOriginal = dealCard();
    if (cardForOriginal) hand.cards.push(cardForOriginal);

    const cardForNew = dealCard();
    if (cardForNew) newHand.cards.push(cardForNew);

    // Keep active hand on the first split hand
    activeHandIndex.value = indexToSplit;

    gameMessage.value = `Split performed on hand ${indexToSplit + 1}. Now playing it.`;
  }

  // Check if insurance is available
  function checkInsurance() {
    const value = dealerUpCard.value?.value;
    insuranceAvailable.value = value === 'A' || ['10', 'J', 'Q', 'K'].includes(value);
  };

  // Returns the value of a hand 
  function calculateHandDetails(cards: Card[]) {
    let total = 0;
    let aces = 0;

    for (const card of cards) {
      if (card.value === 'A') {
        aces++;
        total += 11;
      } else if (['K', 'Q', 'J'].includes(card.value)) {
        total += 10;
      } else {
        total += parseInt(card.value);
      }
    }

    // Downgrade aces if bust
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }

    return {
      value: total,
      isSoft: aces > 0 // if we still count at least one Ace as 11 → soft hand
    };
  }

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
    playerHands,
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
    activeHandIndex,

    // Computed
    dealerUpCard,
    playerHandValue,
    dealerHandValue,
    canSplit,
    canHit,
    cannotDoubleDown,
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
    placeInsurance,
    calculateHandDetails
  };
}