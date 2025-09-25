import type { Card } from '../types/Card';

export interface Hand {
  cards: Card[]
  bet: number
  insuranceBet: number
  isFinished: boolean
  hasDoubled: boolean
  hasInsurance: boolean
}