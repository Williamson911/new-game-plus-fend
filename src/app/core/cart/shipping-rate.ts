import { DeliveryMode } from './cart.types';

interface Tier {
  maxGrams: number;
  relayPrice: number;
  homePrice: number;
}

// Mirrors ShippingRateCalculator.TIERS in the backend
// (new-game-plus/src/main/java/be/technifutur/newgameplus/shipping/ShippingRateCalculator.java).
// Keep both tables in sync if the backend's tiers or prices ever change — this is a
// deliberate duplication (see the design spec's non-goals), not a shared source of truth.
const TIERS: Tier[] = [
  { maxGrams: 250, relayPrice: 4.15, homePrice: 4.99 },
  { maxGrams: 1_000, relayPrice: 5.99, homePrice: 6.99 },
  { maxGrams: 3_000, relayPrice: 6.99, homePrice: 7.99 },
  { maxGrams: 5_000, relayPrice: 7.99, homePrice: 8.99 },
  { maxGrams: 10_000, relayPrice: 9.49, homePrice: 11.99 },
  { maxGrams: 15_000, relayPrice: 11.49, homePrice: 14.99 },
  { maxGrams: 20_000, relayPrice: 13.49, homePrice: 17.99 },
];

export function estimateShippingCost(mode: DeliveryMode, totalWeightGrams: number): number {
  const tier = TIERS.find((t) => totalWeightGrams <= t.maxGrams) ?? TIERS[TIERS.length - 1];
  return mode === 'RELAY_POINT' ? tier.relayPrice : tier.homePrice;
}
