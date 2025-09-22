<template>
  <div class="card" :class="{ 'face-down': !isVisible || isPlaceholderCard }">
    <div v-if="isVisible && !isPlaceholderCard" class="card-content">
      <!-- Image Display (if image is provided and loads successfully) -->
      <img
        v-if="image && !imageLoadError"
        :src="image"
        :alt="`${value} of ${suit}`"
        class="card-image"
        @load="handleImageLoad"
      />

      <!-- Fallback to suit/value display -->
      <div v-if="!image || imageLoadError" class="card-suit-value-display">
        <div class="card-corner top-left">
          <div class="card-value">{{ value }}</div>
        </div>
        <div class="card-center">
          <div class="card-suit-large" :class="suitColor">{{ suitSymbol }}</div>
        </div>
        <div class="card-corner bottom-right">
          <div class="card-value">{{ value }}</div>
        </div>
      </div>
    </div>
    <div v-else class="card-back">
      <div class="card-back-pattern"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import type { Card } from '../types/Card';

interface Props {
  suit: Card['suit'];
  value: Card['value'];
  image?: string;
  isVisible?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: true,
  image: ''
});

const imageLoadError = ref(false);

const suitSymbol = computed(() => {
  switch (props.suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
    case 'placeholder': return '';
    default: return '';
  }
});

const suitColor = computed(() => {
  return props.suit === 'hearts' || props.suit === 'diamonds' ? 'red' : 'black';
});

const isPlaceholderCard = computed(() => {
  return props.suit === 'placeholder' || props.value === 'hidden';
});

function handleImageError() {
  imageLoadError.value = true;
}

function handleImageLoad() {
  imageLoadError.value = false;
}
</script>

<style scoped>
.card {
  width: 86px;
  height: 120px;
  border: 2px solid #333;
  border-radius: 8px;
  background: white;
  position: relative;
  margin: 4px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.card:hover {
  transform: translateY(-2px);
}

.card-content {
  width: 100%;
  height: 100%;
  position: relative;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 6px;
}

.card-suit-value-display {
  width: 100%;
  height: 100%;
  position: relative;
}

.card-corner {
  position: absolute;
  font-size: 12px;
  margin: 0 2px;
  font-weight: bold;
  display: flex;
  align-items: center;
}

.top-left {
  top: 4px;
  left: 4px;
}

.bottom-right {
  bottom: 4px;
  right: 4px;
  transform: rotate(180deg);
}

.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.card-suit-large {
  font-size: 24px;
}

.card-value {
  font-size: 16px;
  line-height: 1;
  color: black;
}

.card-suit {
  font-size: 8px;
  line-height: 1;
}

.red {
  color: #d32f2f;
}

.black {
  color: #333;
}

.face-down .card-back {
  width: 100%;
  height: 100%;
  background: linear-gradient(45deg, #1976d2, #42a5f5);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-back-pattern {
  width: 60%;
  height: 60%;
  background: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.1) 4px,
    rgba(255, 255, 255, 0.2) 4px,
    rgba(255, 255, 255, 0.2) 8px
  );
  border-radius: 4px;
}
</style>