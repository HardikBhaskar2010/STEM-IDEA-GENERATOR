#!/bin/bash

# Test Script for Guidance Feature
# Tests the connection between local frontend and production backend

echo "=========================================="
echo "Guidance Feature Connection Test"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Backend Health Check
echo "Test 1: Backend Health Check"
echo "Endpoint: https://perfection-v2.onrender.com/api/health"
HEALTH_RESPONSE=$(curl -s -w "\n%{http_code}" https://perfection-v2.onrender.com/api/health)
HTTP_CODE=$(echo "$HEALTH_RESPONSE" | tail -n 1)
RESPONSE_BODY=$(echo "$HEALTH_RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Backend is healthy (HTTP $HTTP_CODE)"
    echo "Response: $(echo $RESPONSE_BODY | jq -r '.status' 2>/dev/null || echo $RESPONSE_BODY | head -c 100)"
else
    echo -e "${RED}❌ FAIL${NC} - Backend health check failed (HTTP $HTTP_CODE)"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Test 2: OpenRouter Integration
echo "Test 2: OpenRouter AI Integration"
OPENROUTER_STATUS=$(echo $RESPONSE_BODY | jq -r '.openrouter.status' 2>/dev/null)
if [ "$OPENROUTER_STATUS" = "healthy" ]; then
    echo -e "${GREEN}✅ PASS${NC} - OpenRouter is configured and operational"
else
    echo -e "${YELLOW}⚠️  WARN${NC} - OpenRouter status: $OPENROUTER_STATUS"
fi
echo ""

# Test 3: Frontend Environment Variable
echo "Test 3: Frontend Environment Configuration"
if grep -q "VITE_API_BASE_URL=https://perfection-v2.onrender.com/api" /app/frontend/.env; then
    echo -e "${GREEN}✅ PASS${NC} - Frontend .env configured for production backend"
else
    echo -e "${RED}❌ FAIL${NC} - Frontend .env not configured correctly"
    echo "Current value:"
    grep "VITE_API_BASE_URL" /app/frontend/.env
    exit 1
fi
echo ""

# Test 4: Guidance Context Endpoint (Mock Project)
echo "Test 4: Guidance Context Endpoint"
echo "Testing with mock project ID: 00000000-0000-0000-0000-000000000001"
CONTEXT_RESPONSE=$(curl -s -w "\n%{http_code}" "https://perfection-v2.onrender.com/api/projects/00000000-0000-0000-0000-000000000001/guidance/context")
HTTP_CODE=$(echo "$CONTEXT_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Context endpoint working (HTTP $HTTP_CODE)"
    echo "Project title: $(echo $CONTEXT_RESPONSE | head -n -1 | jq -r '.project.title' 2>/dev/null)"
else
    echo -e "${YELLOW}⚠️  INFO${NC} - Context endpoint returned HTTP $HTTP_CODE"
    echo "Note: This is expected if the project doesn't exist yet"
fi
echo ""

# Test 5: Project Sync Endpoint
echo "Test 5: Project Sync Endpoint"
TEST_PROJECT='{
  "id": "12345678-1234-1234-1234-123456789012",
  "title": "Test Guidance Project",
  "description": "Testing the guidance feature",
  "difficulty": "intermediate",
  "estimatedTime": "1 week",
  "estimatedCost": "$50",
  "components": ["Arduino", "Sensor"],
  "skills": ["Programming", "Electronics"],
  "steps": ["Step 1", "Step 2"],
  "status": "planning",
  "progress": 0,
  "notes": "",
  "starred": false,
  "tags": ["test"],
  "completed_steps": [],
  "generated_from_params": {},
  "created_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'",
  "updated_at": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"
}'

SYNC_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "https://perfection-v2.onrender.com/api/projects/sync" \
  -H "Content-Type: application/json" \
  -d "$TEST_PROJECT")
HTTP_CODE=$(echo "$SYNC_RESPONSE" | tail -n 1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ PASS${NC} - Project sync working (HTTP $HTTP_CODE)"
else
    echo -e "${RED}❌ FAIL${NC} - Project sync failed (HTTP $HTTP_CODE)"
    echo "Response: $(echo $SYNC_RESPONSE | head -n -1)"
fi
echo ""

# Test 6: Frontend Service Status
echo "Test 6: Frontend Service Status"
if sudo supervisorctl status frontend | grep -q "RUNNING"; then
    echo -e "${GREEN}✅ PASS${NC} - Frontend service is running"
else
    echo -e "${RED}❌ FAIL${NC} - Frontend service is not running"
    sudo supervisorctl status frontend
fi
echo ""

# Test 7: Backend Service Status
echo "Test 7: Backend Service Status"
if sudo supervisorctl status backend | grep -q "RUNNING"; then
    echo -e "${GREEN}✅ PASS${NC} - Backend service is running"
else
    echo -e "${RED}❌ FAIL${NC} - Backend service is not running"
    sudo supervisorctl status backend
fi
echo ""

# Summary
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Local Setup:"
echo "  - Frontend: http://localhost:5173"
echo "  - Backend: Connecting to production (Render)"
echo ""
echo "Production URLs:"
echo "  - Frontend: https://perfection-v4.vercel.app"
echo "  - Backend: https://perfection-v2.onrender.com"
echo ""
echo "Next Steps:"
echo "  1. Update Vercel environment variable VITE_API_BASE_URL"
echo "  2. Redeploy on Vercel"
echo "  3. Run Supabase migrations"
echo "  4. Test the guidance feature in production"
echo ""
echo "Documentation:"
echo "  - Fix Details: /app/GUIDANCE_FEATURE_FIX.md"
echo "  - Deployment Checklist: /app/DEPLOYMENT_CHECKLIST.md"
echo ""
echo "=========================================="
