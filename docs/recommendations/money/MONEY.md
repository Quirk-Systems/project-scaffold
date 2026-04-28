# Money

> Revenue is not vanity. It's the mechanism by which a product survives.
> Understand your numbers before you build features.
> The best product that dies is not better than the worse product that lives.

---

## Core SaaS Metrics

```
MRR (Monthly Recurring Revenue)
  = sum of all active subscription values, normalized monthly
  New MRR + Expansion MRR - Churned MRR - Contraction MRR = Net New MRR

ARR = MRR × 12. Don't count one-time fees.

Churn Rate = customers lost / customers at start of month
  Good: < 2%/mo | Great: < 0.5%/mo

Net Revenue Retention (NRR)
  = MRR from last month's cohort / their MRR last month
  > 100% = expansion > churn (grow without new customers)
  > 120% = elite

LTV = ARPU / monthly churn rate
CAC = (Sales + Marketing spend) / new customers acquired
LTV:CAC target: > 3:1
CAC payback target: < 12 months
```

### Health Check
```
                  Green    Yellow    Red
MRR Growth (MoM)  >10%    5-10%     <5%
Net MRR Churn     <0%     0-2%      >2%
NRR               >110%   100-110%  <100%
CAC Payback       <12mo   12-18mo   >18mo
Gross Margin      >70%    50-70%    <50%
```

---

## Stripe — Implementation

### Checkout + Subscription
```typescript
// Create customer at signup
const customer = await stripe.customers.create({
  email: user.email,
  metadata: { userId: user.id },
});

// Checkout session
const session = await stripe.checkout.sessions.create({
  customer: user.stripeCustomerId,
  mode: "subscription",
  line_items: [{ price: process.env.STRIPE_PRO_PRICE_ID, quantity: 1 }],
  success_url: `${APP_URL}/dashboard?upgraded=true`,
  cancel_url: `${APP_URL}/pricing`,
  allow_promotion_codes: true,
  subscription_data: { trial_period_days: 14, metadata: { userId: user.id } },
});
```

### Webhook Handler
```typescript
switch (event.type) {
  case "checkout.session.completed": {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.mode !== "subscription") break;
    await db.subscription.create({
      data: {
        userId: s.metadata!.userId,
        stripeSubscriptionId: s.subscription as string,
        status: "active",
      },
    });
    break;
  }
  case "customer.subscription.updated": {
    const sub = event.data.object as Stripe.Subscription;
    await db.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: sub.status, cancelAtPeriodEnd: sub.cancel_at_period_end },
    });
    break;
  }
  case "customer.subscription.deleted": {
    const sub = event.data.object as Stripe.Subscription;
    await db.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data: { status: "canceled", canceledAt: new Date() },
    });
    await downgradeUser(sub.metadata.userId);
    break;
  }
  case "invoice.payment_failed": {
    const inv = event.data.object as Stripe.Invoice;
    await sendPaymentFailedEmail(inv.customer_email!, inv.hosted_invoice_url!);
    break;
  }
}
```

### Customer Portal
```typescript
const portal = await stripe.billingPortal.sessions.create({
  customer: user.stripeCustomerId,
  return_url: `${APP_URL}/settings/billing`,
});
return redirect(portal.url);
```

### Metered Billing
```typescript
await stripe.subscriptionItems.createUsageRecord(subscriptionItemId, {
  quantity: apiCallCount,
  timestamp: Math.floor(Date.now() / 1000),
  action: "increment",
});
```

---

## Pricing Psychology

### The Magic of Three Plans
```
Basic:      $9/mo   — intentionally limited (anchor low)
Pro:        $29/mo  — your target (looks great against both)
Enterprise: $99/mo  — anchor high, makes Pro look reasonable

Most users pick middle. Design middle to be what you want sold.
```

### Annual Plans
```
Offer 2 months free (better than "save 16%").
→ 10-12x lower churn than monthly
→ Cash flow positive (upfront)
→ Higher LTV

Make annual the default selection.
```

### Freemium vs Free Trial
```
Free trial:  urgency → higher conversion, better for complex products
Freemium:    lower friction → build habit first, risk: no upgrade trigger

Best: freemium with hard usage limit (natural upgrade trigger, no time pressure)
```

---

## Dunning

```
80% of failed payments are recoverable (expired cards, not intentional).

Sequence:
  Day 0:  "Update your payment method"
  Day 3:  Reminder + portal link
  Day 7:  "Access will be suspended"
  Day 14: Access suspended, last chance
  Day 30: Canceled, reactivation offer

Tools: Stripe built-in dunning, Recover.com, Churnkey
```

---

## Unit Economics

```
CAC: $300
MRR: $30, Gross Margin: 80% → GP: $24/mo
CAC Payback: $300 / $24 = 12.5 months
Churn: 3%/mo → Avg lifetime: 33 months
LTV: $24 × 33 = $792
LTV:CAC = 2.6:1 ← below target, need improvement

Levers: ↑ARPU, ↓churn, ↓CAC, ↑gross margin
```

---

## Resources

- [Stripe Docs](https://stripe.com/docs)
- [Baremetrics](https://baremetrics.com) — SaaS metrics
- [SaaSMetrics.co](http://saasmetrics.co) — David Skok's bible
- [Stripe Tax](https://stripe.com/tax) — automated compliance
- [ProfitWell](https://www.profitwell.com) — analytics + dunning
