<template>
  <div class="blackjack-game">
    <div class="game-header">
      <h1>Blackjack Game</h1>
      <div class="game-message">{{ gameMessage }}</div>
    </div>

    <div class="game-board">
      <!-- Dealer Section -->
      <div class="dealer-section">
        <h3>Dealer ({{ phase === 'player-turn' ? '?' : dealerHandValue.value }})</h3>
        <div class="hand">
          <Card
            v-for="(card, index) in dealerHand"
            :key="`dealer-${index}`"
            :suit="card.suit"
            :value="card.value"
            :image="card.image || ''"
            :is-visible="phase !== 'player-turn' || index === 0"
          />
        </div>
      </div>

      <!-- Player Section -->
      <div class="player-section">
        <h3>Player ({{ playerHandValue.value }})</h3>
        <div class="hand">
          <Card
            v-for="(card, index) in playerHand"
            :key="`player-${index}`"
            :suit="card.suit"
            :value="card.value"
            :image="card.image || ''"
            :is-visible="true"
          />
        </div>
      </div>
    </div>

    <!-- Game Controls -->
    <div class="game-controls">
      <div v-if="phase === 'betting' || phase === 'game-over'" class="betting-controls">
        <button @click="newGame" class="btn btn-primary">
          {{ phase === 'betting' ? 'Start Game' : 'New Game' }}
        </button>
      </div>

      <div v-if="phase === 'player-turn'" class="player-controls">
        <button @click="hit" :disabled="!canHit" class="btn btn-secondary">
          Hit
        </button>
        <button @click="stand" :disabled="!canStand" class="btn btn-secondary">
          Stand
        </button>
        <button @click="split" :disabled="!canSplit" class="btn btn-secondary">
          Split
        </button>
      </div>

      <div v-if="phase === 'dealer-turn'" class="dealer-controls">
        <div class="dealer-thinking">Dealer is playing...</div>
      </div>
    </div>

    <!-- Game Status -->
    <div class="game-status">
      <div class="status-item">
        <strong>Cards Remaining:</strong> {{ deck.length }}
      </div>
      <div class="status-item" v-if="playerHandValue.isSoft && phase === 'player-turn'">
        <strong>Soft Hand</strong> (Ace counted as 11)
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import Card from './Card.vue';
import { useBlackjack } from '../composables/useBlackjack';

const {
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

  // Actions
  initializeGame,
  hit,
  stand,
  split,
  newGame
} = useBlackjack();

onMounted(() => {
  // Auto-start the game when component mounts
  initializeGame();
});
</script>

<style scoped>
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

.dealer-thinking {
  font-size: 1.2rem;
  font-style: italic;
  color: #ffeb3b;
}

.game-status {
  display: flex;
  justify-content: center;
  gap: 30px;
  flex-wrap: wrap;
  text-align: center;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 10px;
}

.status-item {
  font-size: 1rem;
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