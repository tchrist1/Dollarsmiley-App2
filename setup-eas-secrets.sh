#!/bin/bash

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         EAS Secrets Setup - Mapbox Token                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Load token from .env
MAPBOX_TOKEN=$(grep RNMAPBOX_MAPS_DOWNLOAD_TOKEN .env | cut -d '=' -f2)

if [ -z "$MAPBOX_TOKEN" ]; then
    echo "❌ Error: Could not find RNMAPBOX_MAPS_DOWNLOAD_TOKEN in .env file"
    exit 1
fi

echo "✅ Found Mapbox download token in .env"
echo "   Token: ${MAPBOX_TOKEN:0:20}..."
echo ""

# Check if logged in
echo "📝 Checking EAS login status..."
if ! npx eas-cli whoami > /dev/null 2>&1; then
    echo "❌ Not logged in to EAS"
    echo ""
    echo "Please login first by running:"
    echo "   npx eas-cli login"
    echo ""
    exit 1
fi

USERNAME=$(npx eas-cli whoami 2>&1 | tail -n1)
echo "✅ Logged in as: $USERNAME"
echo ""

# Add secret
echo "📤 Adding RNMAPBOX_MAPS_DOWNLOAD_TOKEN to EAS secrets..."
echo ""

npx eas-cli secret:create \
    --scope project \
    --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN \
    --value "$MAPBOX_TOKEN" \
    --type string \
    --force

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Secret added successfully!"
    echo ""
    echo "📋 Verifying secrets..."
    npx eas-cli secret:list
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                    ✅ SETUP COMPLETE                        ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo "Next step: Rebuild your app"
    echo "   npx eas-cli build --profile development --platform android"
    echo ""
else
    echo ""
    echo "❌ Failed to add secret"
    echo ""
    echo "Try manually:"
    echo "   npx eas-cli secret:create --scope project --name RNMAPBOX_MAPS_DOWNLOAD_TOKEN --value $MAPBOX_TOKEN --type string"
    echo ""
fi
