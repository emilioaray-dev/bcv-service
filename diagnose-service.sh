#!/bin/bash

echo "==================================="
echo "BCV Service - Diagnostic Script"
echo "==================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if service is running
echo -e "${YELLOW}1. Checking if BCV service is running...${NC}"
if docker ps | grep -q bcv-service; then
    echo -e "${GREEN}✓ BCV service container is running${NC}"
    CONTAINER_NAME=$(docker ps --filter "name=bcv-service" --format "{{.Names}}")
    echo "   Container name: $CONTAINER_NAME"
else
    echo -e "${RED}✗ BCV service container is NOT running${NC}"
    echo "   Run: docker-compose up -d"
    exit 1
fi

echo ""

# Check environment variables
echo -e "${YELLOW}2. Checking critical environment variables...${NC}"

# Function to check if env var exists in container
check_env_var() {
    local var_name=$1
    local var_value=$(docker exec $CONTAINER_NAME printenv $var_name 2>/dev/null)

    if [ -z "$var_value" ]; then
        echo -e "${RED}✗ $var_name: NOT SET${NC}"
        return 1
    else
        if [ "$var_name" == "WEBHOOK_URL" ] || [ "$var_name" == "MONGODB_URI" ] || [ "$var_name" == "REDIS_PASSWORD" ]; then
            echo -e "${GREEN}✓ $var_name: SET (***MASKED***)${NC}"
        else
            echo -e "${GREEN}✓ $var_name: $var_value${NC}"
        fi
        return 0
    fi
}

# Check essential variables
check_env_var "NODE_ENV"
check_env_var "PORT"
check_env_var "CRON_SCHEDULE"
check_env_var "SAVE_TO_DATABASE"
check_env_var "WEBHOOK_URL"
check_env_var "MONGODB_URI"
check_env_var "REDIS_HOST"
check_env_var "CACHE_ENABLED"

echo ""

# Check logs for cron execution
echo -e "${YELLOW}3. Checking recent cron job executions (last 50 lines)...${NC}"
docker logs $CONTAINER_NAME --tail 50 2>&1 | grep -i "tarea programada\|scheduled\|cron\|rate update" | tail -10
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   No recent cron job logs found${NC}"
fi

echo ""

# Check for webhook notifications
echo -e "${YELLOW}4. Checking webhook notifications (last 50 lines)...${NC}"
docker logs $CONTAINER_NAME --tail 50 2>&1 | grep -i "webhook" | tail -10
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   No webhook-related logs found${NC}"
fi

echo ""

# Check MongoDB connection
echo -e "${YELLOW}5. Checking MongoDB connection...${NC}"
docker logs $CONTAINER_NAME --tail 100 2>&1 | grep -i "mongodb\|database" | tail -5
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   No MongoDB connection logs found${NC}"
fi

echo ""

# Check Redis connection
echo -e "${YELLOW}6. Checking Redis connection...${NC}"
docker logs $CONTAINER_NAME --tail 100 2>&1 | grep -i "redis\|cache" | tail -5
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}   No Redis connection logs found${NC}"
fi

echo ""

# Check for errors
echo -e "${YELLOW}7. Checking for errors (last 20 lines)...${NC}"
docker logs $CONTAINER_NAME --tail 100 2>&1 | grep -i "error\|failed\|exception" | tail -20
if [ $? -ne 0 ]; then
    echo -e "${GREEN}✓ No recent errors found${NC}"
fi

echo ""

# Service health check
echo -e "${YELLOW}8. Testing service health endpoint...${NC}"
CONTAINER_PORT=$(docker port $CONTAINER_NAME 3000 2>/dev/null | cut -d: -f2)
if [ -n "$CONTAINER_PORT" ]; then
    HEALTH_RESPONSE=$(curl -s http://localhost:$CONTAINER_PORT/health)
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Health endpoint responded${NC}"
        echo "   Response: $HEALTH_RESPONSE" | jq '.' 2>/dev/null || echo "   Response: $HEALTH_RESPONSE"
    else
        echo -e "${RED}✗ Health endpoint did not respond${NC}"
    fi
else
    echo -e "${YELLOW}   Could not determine container port${NC}"
fi

echo ""

# Recommendations
echo -e "${YELLOW}==================================="
echo "Recommendations:"
echo "===================================${NC}"

# Check if WEBHOOK_URL is set
WEBHOOK_SET=$(docker exec $CONTAINER_NAME printenv WEBHOOK_URL 2>/dev/null)
if [ -z "$WEBHOOK_SET" ]; then
    echo -e "${RED}⚠ WEBHOOK_URL is not set - Webhook notifications will NOT work${NC}"
    echo "   Solution: Set WEBHOOK_URL in your .env file or docker-compose.yml"
fi

# Check if SAVE_TO_DATABASE is true
SAVE_DB=$(docker exec $CONTAINER_NAME printenv SAVE_TO_DATABASE 2>/dev/null)
if [ "$SAVE_DB" != "true" ]; then
    echo -e "${YELLOW}⚠ SAVE_TO_DATABASE is not 'true' - Running in console-only mode${NC}"
    echo "   Solution: Set SAVE_TO_DATABASE=true in your .env file"
fi

# Check CRON_SCHEDULE
CRON_VALUE=$(docker exec $CONTAINER_NAME printenv CRON_SCHEDULE 2>/dev/null)
if [ -z "$CRON_VALUE" ]; then
    echo -e "${YELLOW}⚠ CRON_SCHEDULE not set - Using default schedule${NC}"
else
    echo -e "${GREEN}✓ CRON_SCHEDULE set to: $CRON_VALUE${NC}"
fi

echo ""
echo -e "${GREEN}Diagnostic complete!${NC}"
echo ""
echo "To view live logs, run:"
echo "  docker logs -f $CONTAINER_NAME"
echo ""
echo "To restart the service, run:"
echo "  docker-compose restart bcv-service"
