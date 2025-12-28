#!/bin/bash

# Test eBay Webhook Endpoint
# Tests both challenge verification and notification handling

echo "╔════════════════════════════════════════════════════════════╗"
echo "║  eBay Webhook Endpoint Test                               ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment
cd "$(dirname "$0")/.."
export $(cat .env.local | grep -v '^#' | xargs)

ENDPOINT="http://localhost:3000/api/webhooks/ebay/account-deletion"
CHALLENGE_CODE="test_challenge_$(date +%s)"

echo "🔧 Configuration:"
echo "   Endpoint: $ENDPOINT"
echo "   Verification Token: ${EBAY_VERIFICATION_TOKEN:0:20}..."
echo "   Challenge Code: $CHALLENGE_CODE"
echo ""

# Test 1: Challenge Verification (GET)
echo "═══════════════════════════════════════════════════════════"
echo "Test 1: Challenge Verification (GET)"
echo "═══════════════════════════════════════════════════════════"
echo ""

RESPONSE=$(curl -s "$ENDPOINT?challenge_code=$CHALLENGE_CODE")
echo "Response: $RESPONSE"
echo ""

# Check if challengeResponse exists
if echo "$RESPONSE" | grep -q "challengeResponse"; then
  echo -e "${GREEN}✅ Challenge verification endpoint working!${NC}"
else
  echo -e "${RED}❌ Challenge verification failed!${NC}"
fi

echo ""

# Test 2: Account Deletion Notification (POST)
echo "═══════════════════════════════════════════════════════════"
echo "Test 2: Account Deletion Notification (POST)"
echo "═══════════════════════════════════════════════════════════"
echo ""

NOTIFICATION_PAYLOAD='{
  "metadata": {
    "topic": "MARKETPLACE_ACCOUNT_DELETION",
    "schemaVersion": "1.0",
    "deprecated": false,
    "notificationId": "test_notification_123"
  },
  "notification": {
    "notificationId": "test_notification_123",
    "eventDate": "2024-12-08T12:00:00.000Z",
    "publishDate": "2024-12-08T12:00:01.000Z",
    "publishAttemptCount": 1,
    "data": [{
      "userId": "test_user_456",
      "username": "test_seller",
      "eiasToken": "test_token_789"
    }]
  }
}'

RESPONSE2=$(curl -s -X POST "$ENDPOINT" \
  -H "Content-Type: application/json" \
  -H "X-EBAY-SIGNATURE: test_signature" \
  -d "$NOTIFICATION_PAYLOAD")

echo "Response: $RESPONSE2"
echo ""

if echo "$RESPONSE2" | grep -q "success"; then
  echo -e "${GREEN}✅ Notification handler working!${NC}"
else
  echo -e "${YELLOW}⚠️  Check response format${NC}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "🎉 Local tests complete!"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "📋 Next steps for eBay Developer Portal:"
echo ""
echo "1. Visit: https://developer.ebay.com/my/keys"
echo "2. Click your App ID: SongzheL-CardTrai-SBX-0e02ee627-669dd8ce"
echo "3. Go to Notifications section"
echo "4. Configure:"
echo "   • Alert email: your@email.com"
echo "   • Endpoint: https://cardtrail-app.vercel.app/api/webhooks/ebay/account-deletion"
echo "   • Verification Token: $EBAY_VERIFICATION_TOKEN"
echo ""
echo "5. Save and eBay will send challenge to verify endpoint"
echo ""

