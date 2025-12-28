# Task 01: eBay API Integration with Rate Limiting

**Goal:** Complete eBay API client with rate limiting and caching

**Time Estimate:** 10 hours

**Phase:** Phase 7

**Dependencies:** Phase 2 and Phase 3 complete

---

## 📖 Context

**What this task delivers:**
- eBay API client (Finding, Shopping, Trading APIs)
- Rate limiter (5000 calls/day sandbox, 5M/day production)
- eBay data caching (24 hours in Redis)
- Transaction data ingestion
- Error handling and retry logic
- Unit tests for eBay client
- Integration tests for API calls
- Basic testing included
- Ready for CT Price calculation

**Why this matters:**
eBay API provides the real transaction data that powers CT Price calculations. Rate limiting prevents exceeding quotas. Caching reduces API calls and improves performance.

**Planning docs:**
- `planning/architecture-overview.md` - eBay API integration (Section: Integration Architecture)
- `planning/feature-breakdown.md` - eBay integration tasks (Section: Phase 1, Task 1.1)
- `planning/price-algorithm.md` - Data sources (Section: Data Sources)
- `planning/agents.md` - Development guidelines (MANDATORY)

---

## ✅ Requirements

**Functional Requirements:**
- [ ] eBay API client can search completed listings
- [ ] eBay API client can search active listings
- [ ] Rate limiting prevents exceeding quota
- [ ] Responses cached for 24 hours
- [ ] Transaction data parsed and normalized
- [ ] Error handling with retries

**Technical Requirements:**
- [ ] TypeScript strict mode
- [ ] Bottleneck for rate limiting
- [ ] Redis for caching
- [ ] Axios for HTTP requests
- [ ] Environment variables for credentials

**Acceptance Criteria:**
- [ ] Can fetch eBay sold listings
- [ ] Rate limiting works
- [ ] Caching works
- [ ] Data parsed correctly
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Deployed

---

## 📝 Implementation Approach

**lib/ebay/client.ts:**
```typescript
import axios from 'axios';
import Bottleneck from 'bottleneck';

const limiter = new Bottleneck({
  reservoir: 5000,
  reservoirRefreshAmount: 5000,
  reservoirRefreshInterval: 24 * 60 * 60 * 1000,
  maxConcurrent: 5,
  minTime: 200,
});

export class EbayClient {
  async findCompletedItems(keywords: string) {
    return limiter.schedule(async () => {
      const response = await axios.get(
        'https://svcs.sandbox.ebay.com/services/search/FindingService/v1',
        {
          params: {
            'OPERATION-NAME': 'findCompletedItems',
            'SERVICE-VERSION': '1.0.0',
            'SECURITY-APPNAME': process.env.EBAY_APP_ID,
            'RESPONSE-DATA-FORMAT': 'JSON',
            keywords,
            'itemFilter(0).name': 'SoldItemsOnly',
            'itemFilter(0).value': 'true',
          },
        }
      );
      
      return response.data.findCompletedItemsResponse[0].searchResult[0].item || [];
    });
  }
}
```

---

## ✅ Done When

- [ ] eBay client works
- [ ] Rate limiting works
- [ ] Caching works
- [ ] Tests pass
- [ ] Deployed

---

**Built with:** Agent Cube - Efficiency Mode  
**For:** CardTrail (卡迹) PTCG Price Tracker  
**Agent Guidelines:** `planning/agents.md`
