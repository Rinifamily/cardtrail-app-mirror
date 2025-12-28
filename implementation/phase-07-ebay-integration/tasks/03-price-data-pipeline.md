# Task 03: Price Data Pipeline with Daily Updates

**Goal:** Automated price update pipeline with cron job

**Time Estimate:** 6 hours

**Phase:** Phase 7

**Dependencies:** Task 01 (eBay API) and Task 02 (CT Price Algorithm)

---

## 📖 Context

**What this task delivers:**
- Daily cron job for price updates
- Internal API endpoint for price sync
- Price history table population
- card_extensions table updates
- Progress logging and monitoring
- Error handling and alerting
- Basic testing included
- Ready for automated price updates

**Why this matters:**
The price data pipeline ensures CT Prices stay current. Daily updates keep data fresh without manual intervention. Automated monitoring detects issues early.

**Planning docs:**
- `planning/feature-breakdown.md` - Price sync cron job
- `planning/backend-architecture.md` - Internal APIs
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] Cron job runs daily at 00:00 UTC
- [ ] Updates all cards with active tracking
- [ ] Stores results in price_history table
- [ ] Updates card_extensions table
- [ ] Logs progress to Sentry
- [ ] Sends summary email on completion

**Technical Requirements:**
- [ ] Internal API: POST /api/internal/sync-prices
- [ ] Protected with API key
- [ ] Batch processing (100 cards at a time)
- [ ] Respects eBay rate limits

**Acceptance Criteria:**
- [ ] Cron job runs successfully
- [ ] Prices updated correctly
- [ ] Historical data stored
- [ ] Monitoring works
- [ ] Deployed

---

## 📝 Implementation Approach

**app/api/internal/sync-prices/route.ts:**
```typescript
export async function POST(req: NextRequest) {
  const apiKey = req.headers.get('X-Internal-API-Key');
  if (apiKey !== process.env.INTERNAL_API_KEY) {
    return new NextResponse('Unauthorized', { status: 401 });
  }
  
  const cards = await getCardsForPriceUpdate();
  
  for (const card of cards) {
    const price = await calculateCTPrice({ card_id: card.id, grade: 'psa10' });
    
    await supabase.from('card_extensions').upsert({
      card_id: card.id,
      current_price_psa10: price.price,
      price_updated_at: new Date().toISOString(),
    });
    
    await supabase.from('price_history').insert({
      card_id: card.id,
      date: new Date().toISOString().split('T')[0],
      price_psa10: price.price,
    });
  }
  
  return NextResponse.json({ status: 'completed', updated: cards.length });
}
```

**vercel.json:**
```json
{
  "crons": [{
    "path": "/api/internal/sync-prices",
    "schedule": "0 0 * * *"
  }]
}
```

---

## ✅ Done When

- [ ] Cron job works
- [ ] Prices update
- [ ] Data stored
- [ ] Monitoring active
- [ ] Deployed

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
