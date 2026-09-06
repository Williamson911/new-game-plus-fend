import { estimateShippingCost } from './shipping-rate';

describe('estimateShippingCost', () => {
  it('returns the home rate for a weight within the first tier', () => {
    expect(estimateShippingCost('HOME', 200)).toBe(4.99);
  });

  it('returns the relay rate for the same weight', () => {
    expect(estimateShippingCost('RELAY_POINT', 200)).toBe(4.15);
  });

  it('picks the correct tier for a mid-range weight', () => {
    expect(estimateShippingCost('HOME', 800)).toBe(6.99);
    expect(estimateShippingCost('RELAY_POINT', 800)).toBe(5.99);
  });

  it('uses the tier whose upper bound exactly matches the weight', () => {
    expect(estimateShippingCost('HOME', 1_000)).toBe(6.99);
  });

  it('falls back to the highest tier when the weight exceeds every threshold', () => {
    expect(estimateShippingCost('HOME', 50_000)).toBe(17.99);
    expect(estimateShippingCost('RELAY_POINT', 50_000)).toBe(13.49);
  });
});
