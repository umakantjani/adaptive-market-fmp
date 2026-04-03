# 🧮 The Kelly Criterion

> "Bet more when you have an edge. Bet less when you don't. Never bet what you cannot afford to lose."

The Kelly Criterion is the mathematical foundation of intelligent position sizing. Developed by John L. Kelly Jr. at Bell Labs in 1956, it was originally designed for information theory before being adopted by blackjack players, gamblers, and eventually professional traders. It answers the fundamental question: **given a known edge, how much should I risk?**

---

## The Formula

$$f^* = \frac{p \cdot b - q}{b}$$

| Variable | Definition |
|----------|-----------|
| `f*` | The fraction of total bankroll to wager on the trade |
| `p` | Probability of a win (your historical win rate) |
| `q` | Probability of a loss (1 − p) |
| `b` | The odds ratio — how much you win for every $1 you lose (Win/Loss ratio) |

### Example Calculation

Suppose your system has a **60% win rate** and a **1.5:1 reward-to-risk ratio**:

- p = 0.60, q = 0.40, b = 1.5
- f* = (0.60 × 1.5 − 0.40) / 1.5 = (0.90 − 0.40) / 1.5 = 0.50 / 1.5 = **33.3%**

Full Kelly says risk 33.3% of your account on this trade. In practice, this is far too aggressive. Enter: **Fractional Kelly**.

---

## The Spartan Rule: Fractional Kelly

The stock market contains **Black Swan events** — low-probability, high-impact shocks that the Kelly formula cannot model because they are, by definition, outside historical data. Professional quants at firms like Renaissance Technologies and Bridgewater use only a **fraction** of the full Kelly bet.

| Kelly Fraction | % of Optimal Growth Captured | Volatility Reduction |
|----------------|------------------------------|----------------------|
| Full Kelly (1.0×) | 100% | 0% (maximum drawdown risk) |
| Half Kelly (0.5×) | ~75% | ~50% reduction in variance |
| Quarter Kelly (0.25×) | ~56% | ~75% reduction in variance |

**The Sniper uses Half-Kelly by default.** You capture three-quarters of the mathematical growth while cutting your "roller-coaster" portfolio volatility in half. This is the rational trade-off between growth and survival.

---

## Risk of Ruin: Why Kelly Matters

If you over-bet your edge, you **will** go broke — even with a winning system. This is the mathematical certainty of the gambler's ruin applied to trading.

| Fraction Bet (over Kelly) | Risk of Ruin (long-run) |
|--------------------------|------------------------|
| Exactly Kelly | ~0% (theoretically optimal) |
| 2× Kelly | ~100% — guaranteed ruin |
| 1.5× Kelly | Very high |
| 0.5× Kelly (Half-Kelly) | Near zero |

> Over-betting is not courage. It is mathematical self-destruction.

---

## Practical Position Sizing for the Sniper

**Step 1 — Calculate your historical edge:**

Review your last 50 trades. Record your win rate (p) and your average winner vs average loser ratio (b).

**Step 2 — Compute Half-Kelly:**

```
f* = (p × b − q) / b
Half-Kelly position = f* / 2
Dollar risk = Account Size × Half-Kelly
```

**Step 3 — Apply per-trade:**

If your account is $25,000 and Half-Kelly says risk 5%, your maximum dollar risk on this trade is $1,250. Set your stop-loss to define that dollar risk precisely.

---

## The Kelly Criterion's Hidden Wisdom

Kelly is not just about sizing. It encodes a deeper truth: **your edge is finite, and pretending otherwise destroys capital.** The formula forces you to confront your actual historical win rate — not your imagined win rate.

- **No edge → Kelly says bet zero.** If p × b − q ≤ 0, your system has no mathematical edge and you should not trade it.
- **Edge uncertainty → reduce further.** When you are uncertain about your true win rate, use Quarter-Kelly until your track record grows.
- **Edge decay → resize.** Markets change. Re-calculate Kelly every 50 trades as your system's edge may shift.

---

## Daily Kelly Check

Before any trade entry:

- [ ] Do I know my system's current win rate over the last 50 trades?
- [ ] Have I calculated my Half-Kelly position size for this trade?
- [ ] Is my stop-loss placed to limit my dollar risk to ≤ Half-Kelly?
- [ ] Am I trading a system with a proven edge, or is this intuition?
