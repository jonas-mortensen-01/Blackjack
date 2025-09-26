<template>
  <div class="blackjack-game">
    <div class="game-header">
      <h1>Blackjack Game</h1>
      <div class="game-message">{{ gameMessage }}</div>

      <button class="rules-btn" @click="showRules = !showRules">?</button>
    </div>
      
<!-- Rules Overlay -->
  <div v-if="showRules" class="rules-overlay">
    <div class="rules-content">
      <h3>How to Play Blackjack</h3>
      <ul>
        <li>1: Get two cards; dealer gets two (one hidden).</li>
        <li>2: Card values numbers equals face value, Jack Queen or King counts as a 10, Ace counts as 1 or 11.</li>
        <li>3: Try to reach 21 without going over.</li>
        <li>4: Hit = take a card; Stand = keep your hand.</li>
        <li>5: You can Split pairs or Double Down in some cases.</li>
        <li>6: Split allows to place another bet on an additional hand if you have 2 matching cards</li>
        <li>7: Double down allows you to double your bet for a hand but only draws you one more card</li>
        <li>8: Dealer must draw until at least 17.</li>
        <li>9: Closest to 21 wins; Blackjack (Ace + 10) pays 3:2.</li>
      </ul>
      <button class="btn btn-primary" @click="showRules = false">Close</button>
    </div>
  </div>

    <!-- Setup Screen -->
    <div v-if="phase === 'setup'" class="setup-screen">
      <div class="setup-card">
        <h2>Welcome to Blackjack!</h2>
        <div class="chip-setup">
          <div class="setup-group">
            <label for="startingChips" class="startingChipsLabel">Starting Chips<div class="info-bubble">?<div
                  class="info-bubble-menu" style="max-width: 50%">The amount of chips you wish to start with</div>
              </div>:</label>
            <input id="startingChips" v-model.number="setupChips" type="number" min="50" max="10000" step="50"
              class="chip-input" />
          </div>
          <div class="setup-group">
            <label for="targetChips" class="targetChipsLabel">Win Goal<div class="info-bubble">?<div
                  class="info-bubble-menu" style="max-width: 50%">Target chips to achieve before winning the game</div>
              </div>:</label>
            <input id="targetChips" v-model.number="setupTarget" type="number" :min="setupChips * 1.5" max="50000"
              step="100" class="chip-input" />
          </div>
          <div class="setup-group">
            <label for="numDeck" class="numDeckLabel">
              How many decks <div class="info-bubble">?<div class="info-bubble-menu" style="max-width: 50%">This will
                  increase the amount of decks played with making it harder to count cards</div>
              </div>:
            </label>
            <input id="numDeck" v-model.number="setupNumDeck" type="number" min="1" max="10" step="1"
              class="num-deck-input" />
          </div>
          <button @click="startGame" class="btn btn-primary" :disabled="!isValidSetup">
            Start Game
          </button>
        </div>
        <div class="preset-section">
          <div class="preset-group">
            <h4>Starting Chips</h4>
            <div class="preset-chips">
              <button @click="setupChips = 500; updateTargetMin()" class="btn btn-preset">500</button>
              <button @click="setupChips = 1000; updateTargetMin()" class="btn btn-preset">1000</button>
              <button @click="setupChips = 2500; updateTargetMin()" class="btn btn-preset">2500</button>
              <button @click="setupChips = 5000; updateTargetMin()" class="btn btn-preset">5000</button>
            </div>
          </div>
          <div class="preset-group">
            <h4>Win Goals</h4>
            <div class="preset-chips">
              <button @click="setupTarget = setupChips * 2" class="btn btn-preset">2x</button>
              <button @click="setupTarget = setupChips * 3" class="btn btn-preset">3x</button>
              <button @click="setupTarget = setupChips * 5" class="btn btn-preset">5x</button>
              <button @click="setupTarget = setupChips * 10" class="btn btn-preset">10x</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Victory Screen -->
    <!-- <div v-if="phase === 'victory'" class="victory-screen">
      <div class="victory-card">
        <h2>🎉 CONGRATULATIONS! 🎉</h2>
        <div class="victory-message">
          <p>You reached your goal of <strong>{{ targetChips }}</strong> chips!</p>
          <p>Final amount: <strong>{{ chips }}</strong> chips</p>
          <p class="victory-subtitle">You've mastered the art of blackjack!</p>
        </div>
        <button @click="restartGame" class="btn btn-victory">
          Play Again
        </button>
      </div>
    </div> -->

    <!-- Betting Screen -->
    <div v-if="phase === 'betting'" class="betting-screen">
      <div class="chip-display">
        <h2>💰 Chips: {{ chips }}</h2>
        <div class="bet-input">
          <label for="betAmount">Place Your Bet:</label>
          <input id="betAmount" v-model.number="betAmount" type="number" :min="minBet" :max="Math.min(chips, maxBet)"
            step="5" class="bet-input-field" />
          <button @click="submitBet" class="btn btn-primary" :disabled="!isValidBet || currentBet > 0">
            Deal Cards
          </button>
        </div>
        <div class="preset-bets" v-if="chips > 0">
          <button :disabled="currentBet > 0" @click="betAmount = minBet" class="btn btn-preset">{{ minBet }}</button>
          <button :disabled="currentBet > 0" @click="betAmount = Math.min(chips, 50)" class="btn btn-preset"
            v-if="chips >= 50">50</button>
          <button :disabled="currentBet > 0" @click="betAmount = Math.min(chips, 100)" class="btn btn-preset"
            v-if="chips >= 100">100</button>
          <button :disabled="currentBet > 0" @click="betAmount = chips" class="btn btn-preset-all">All In</button>
        </div>
      </div>
    </div>

    <!-- Game Board (visible during dealing, playing, dealer turn, game over) -->
    <div v-if="phase !== 'setup' && phase !== 'betting'" class="game-board">
      <div class="game-info">
        <div class="info-item">💰 Chips: {{ chips }}</div>
        <div class="info-item">🎯 Bet: {{ currentBet }}</div>
        <div class="info-item" v-if="insuranceBet > 0"> Insurance: {{ insuranceBet }}</div>
        <div class="info-item">🃏 Cards: {{ deck.length }}</div>
      </div>

      <!-- Dealer Section -->
      <div class="dealer-section">
        <h3>Dealer ({{ phase === 'player-turn' ? '?' : dealerHandValue.value }})</h3>
        <div class="hand">
          <Card v-for="(card, index) in dealerHand" :key="`dealer-${index}-${card.suit}-${card.value}`"
            :suit="card.suit" :value="card.value" :image="card.image || ''"
            :is-visible="phase !== 'player-turn' || index === 0" class="card-dealing" />
        </div>
      </div>

      <!-- Player Section -->
      <div class="player-section">
  <h3>Player Hands</h3>
  <div class="player-hands">
    <div
      v-for="(hand, index) in playerHands"
      :key="index"
      :class="['hand-wrapper', { active: index === activeHandIndex }]"
      @click="setActiveHand(index)"
    >
      <div class="hand-header">
        <span>Hand {{ index + 1 }}</span>
        <span v-if="index === activeHandIndex"> (Active)</span>
      </div>
      <div class="hand">
        <Card
          v-for="(card, cardIndex) in hand.cards"
          :key="`player-${index}-${cardIndex}-${card.suit}-${card.value}`"
          :suit="card.suit"
          :value="card.value"
          :image="card.image || ''"
          :is-visible="true"
          class="card-dealing"
        />
      </div>
      <div class="hand-value">
        Value: {{ calculateHandDetails(hand.cards).value }}
        <span v-if="calculateHandDetails(hand.cards).isSoft">(Soft)</span>
      </div>
      <!-- <div v-if="hand.isSoft && phase === 'player-turn'" class="soft-hand-indicator">
        Soft Hand (Ace as 11)
      </div> -->
    </div>
  </div>
</div>
    </div>

    <!-- Game Controls -->
    <div class="game-controls">
      <div v-if="phase === 'player-turn'" class="player-controls">
        <button @click="hit" :disabled="!canHit" class="btn btn-secondary">
          Hit
        </button>
        <button @click="stand" :disabled="!canStand" class="btn btn-secondary">
          Stand
        </button>
        <button @click="doubleDown" class="btn btn-secondary"
          :disabled="hasDoubledDown || playerHands.length == 2 || chips < currentBet">
          Double Down
        </button>
        <button @click="split(activeHandIndex)" :disabled="!canSplit" class="btn btn-secondary">
          Split
        </button>
        <button @click="betInsurance()" :disabled="!insuranceAvailable" class="btn btn-secondary btn-with-input">
          Insurance <input id="betAmount" v-model.number="initialInsuranceBet" min="1" :max="maxValidInsurance" @blur="enforceInsuranceBetLimits" type="number" @click.stop class="insurance-input-field"></input>
        </button>
      </div>

      <div v-if="phase === 'dealer-turn'" class="dealer-controls">
        <div class="dealer-thinking">Dealer is playing...</div>
      </div>

      <div v-if="phase === 'game-over'" class="game-over-controls">
        <button @click="newGame" class="btn btn-primary">
          {{ chips >= minBet ? 'Next Hand' : 'Game Over' }}
        </button>
      </div>

      <div v-if="phase === 'out-of-chips'" class="out-of-chips-controls">
        <button @click="restartGame" class="btn btn-primary">
          Restart ?
        </button>
      </div>

      <button v-if="phase == 'victory'" @click="restartGame" class="btn btn-victory">
        Play Again
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import Card from './Card.vue';
import { useBlackjack } from '../composables/useBlackjack';

const {
  // State
  deck,
  playerHands,
  dealerHand,
  phase,
  gameMessage,
  chips,
  currentBet,
  hasDoubledDown,
  insuranceAvailable,
  insuranceBet,
  activeHandIndex,

  // Computed

  dealerHandValue,
  canSplit,
  canHit,
  canStand,
  maxBet,
  minBet,

  // Actions
  startSetup,
  placeBet,
  hit,
  stand,
  split,
  newGame,
  restartGame,
  doubleDown,
  placeInsurance,
  calculateHandDetails
} = useBlackjack();

// Local reactive data for UI
const setupChips = ref(1000);
const setupTarget = ref(2000);
const setupNumDeck = ref(1);
const betAmount = ref(10);
let initialInsuranceBet = ref(1);
const showRules = ref(false);

// Checks if the attempted bet is valid and places it
function betInsurance() {
  const allowedInsurance = initialInsuranceBet.value <= currentBet.value / 2 && initialInsuranceBet.value > 0;
  if (allowedInsurance) {
    placeInsurance(initialInsuranceBet.value);
  }
}

// Computed properties for validation
const maxValidInsurance = computed(() => {
  return currentBet.value / 2;
});

const isValidBet = computed(() => {
  return betAmount.value >= minBet.value &&
    betAmount.value <= chips.value &&
    betAmount.value <= maxBet.value;
});

const isValidSetup = computed(() => {
  return setupChips.value >= 50 &&
    setupTarget.value >= setupChips.value * 1.5 &&
    setupTarget.value <= 50000;
});

// Methods
function startGame() {
  if (isValidSetup.value) {
    startSetup(setupChips.value, setupTarget.value, setupNumDeck.value);
  }
}

function submitBet() {
  if (isValidBet.value) {
    placeBet(betAmount.value);
  }
}

// Prevents illegal insurance bets 
function enforceInsuranceBetLimits() {
  if (initialInsuranceBet.value > maxValidInsurance.value) initialInsuranceBet.value = maxValidInsurance.value
  else if (initialInsuranceBet.value < 1) initialInsuranceBet.value = 1;
}

function updateTargetMin() {
  if (setupTarget.value < setupChips.value * 1.5) {
    setupTarget.value = setupChips.value * 2;
  }
}

function setActiveHand(index: number) {
  if (phase.value === 'player-turn') {
    activeHandIndex.value = index;
  }
}
</script>

<style scoped>
.rules-btn {
  margin-left: 10px;
  background: #2196f3;
  border: none;
  color: white;
  font-weight: bold;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 18px;
  cursor: pointer;
}

.rules-btn:hover {
  opacity: .8;
}

.rules-overlay {
  position: fixed;
  top: 0; left: 0;
  width: 100%; height: 100%;
  background: rgba(0,0,0,0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.rules-content {
  background: #fff;
  color: #000;
  padding: 20px 30px;
  border-radius: 12px;
  max-width: 500px;
  text-align: left;
}
.rules-content h3 {
  margin-bottom: 15px;
}
.rules-content ul {
  list-style: none;
  padding: 0;
  margin-bottom: 20px;
}
.rules-content li {
  margin: 6px 0;
}

.info-bubble {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-bottom: 30px;
}

.info-bubble:hover {
  text-decoration: underline;
  cursor: pointer;
}

.info-bubble-menu {
  display: none;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  padding: 10px;
  position: absolute;
  transform: translateY(-100%);
}

.info-bubble:hover .info-bubble-menu {
  display: block;
  cursor: pointer;
}

.blackjack-game {
  max-width: 800px;
  margin: 0 auto;
  padding: 20px;
  font-family: 'Arial', sans-serif;
  background: linear-gradient(135deg, #1e3c72, #2a5298);
  min-height: 100vh;
  color: white;
}

.game-header {
  text-align: center;
  margin-bottom: 30px;
}

.game-header h1 {
  font-size: 2.5rem;
  margin-bottom: 10px;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.game-message {
  font-size: 1.2rem;
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 20px;
  display: inline-block;
}

.game-board {
  display: grid;
  gap: 30px;
  margin-bottom: 30px;
}

.dealer-section,
.player-section {
  text-align: center;
}

.dealer-section h3,
.player-section h3 {
  font-size: 1.5rem;
  margin-bottom: 15px;
  padding: 10px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  display: inline-block;
}

.hand {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 5px;
}

.game-controls {
  text-align: center;
  margin-bottom: 20px;
}

.betting-controls,
.player-controls,
.dealer-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.btn {
  padding: 12px 24px;
  font-size: 1.1rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-weight: bold;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: #4caf50;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #45a049;
  transform: translateY(-2px);
}

.btn-secondary {
  background: #2196f3;
  color: white;
}

.btn-secondary:hover:not(:disabled) {
  background: #1976d2;
  transform: translateY(-2px);
}

.btn-with-input {
  display: flex;
  align-items: center;
}

.dealer-thinking {
  font-size: 1.2rem;
  font-style: italic;
  color: #ffeb3b;
}

/* Setup Screen Styles */
.setup-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.setup-card {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.setup-card h2 {
  margin-bottom: 30px;
  font-size: 2rem;
}

.chip-setup {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-bottom: 30px;
}

.setup-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
  align-items: center;
}

.setup-group label {
  font-size: 1.1rem;
  font-weight: bold;
}

.chip-input,
.num-deck-input {
  padding: 12px 20px;
  font-size: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  text-align: center;
  width: 200px;
}

.preset-section {
  display: flex;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.preset-group {
  text-align: center;
}

.preset-group h4 {
  margin-bottom: 15px;
  font-size: 1.1rem;
  color: rgba(255, 255, 255, 0.9);
}

.preset-chips {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-preset {
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.3);
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-preset:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: translateY(-1px);
}

/* Betting Screen Styles */
.betting-screen {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

.chip-display {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  padding: 40px;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}

.chip-display h2 {
  margin-bottom: 30px;
  font-size: 2.5rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
}

.bet-input {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
}

.bet-input-field {
  padding: 12px 20px;
  font-size: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  text-align: center;
  width: 150px;
}

.insurance-input-field {
  margin-left: 6px;
  font-size: 1.2rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  text-align: center;
  height: 36px;
}

.preset-bets {
  display: flex;
  gap: 10px;
  justify-content: center;
  flex-wrap: wrap;
}

.btn-preset-all {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s;
  font-weight: bold;
}

.btn-preset-all:hover {
  background: #d32f2f;
  transform: translateY(-1px);
}

/* Game Info Bar */
.game-info {
  display: flex;
  justify-content: center;
  gap: 30px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.info-item {
  background: rgba(255, 255, 255, 0.1);
  padding: 10px 20px;
  border-radius: 15px;
  font-weight: bold;
  font-size: 1.1rem;
}

.hand-value {
  font-weight: bold;
  margin-top: 0.5rem;
}

.hand-value span {
  color: #4caf50; /* green for soft */
  font-style: italic;
}

.soft-hand-indicator {
  margin-top: 10px;
  background: rgba(255, 193, 7, 0.8);
  color: #333;
  padding: 5px 15px;
  border-radius: 15px;
  font-size: 0.9rem;
  font-weight: bold;
}

.btn-victory:hover {
  background: rgba(255, 255, 255, 0.53);
  transform: translateY(-1px);
}

.game-over-controls {
  display: flex;
  justify-content: center;
  gap: 15px;
  flex-wrap: wrap;
}

.status-item {
  font-size: 1rem;
}

.numDeckLabel,
.targetChipsLabel,
.startingChipsLabel {
  display: flex;
  height: 20px;
}

.player-hands {
  display: flex;
  gap: 20px;
  justify-content: center;
  overflow-x: scroll;
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.player-hands::after {
  display: hidden !important;
}

.hand-wrapper {
  padding: 10px;
  border: 2px solid transparent;
  border-radius: 10px;
  cursor: pointer;
  transition: border 0.2s, transform 0.2s;
}

.hand-wrapper.active {
  border-color: #ffeb3b;
  background: rgba(255, 255, 255, 0.1);
}

/* Card animations */
.card-dealing {
  animation: cardSlideIn 0.6s ease-out;
  animation-fill-mode: forwards;
  opacity: 0;
  /* Start invisible until animation begins */
}

@keyframes cardSlideIn {
  0% {
    opacity: 0;
    transform: translateY(-30px) scale(0.7) rotateX(90deg);
  }

  1% {
    opacity: 1;
    /* Become visible immediately to respect face-down/face-up state */
  }

  100% {
    opacity: 1;
    transform: translateY(0) scale(1) rotateX(0deg);
  }
}

@media (max-width: 600px) {
  .blackjack-game {
    padding: 10px;
  }

  .game-header h1 {
    font-size: 2rem;
  }

  .hand {
    justify-content: center;
  }

  .game-status {
    flex-direction: column;
    gap: 10px;
  }
}
</style>