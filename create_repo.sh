#!/bin/bash

# Script to create GitHub repository and push code
# Usage: ./create_repo.sh YOUR_GITHUB_TOKEN

GITHUB_TOKEN=${1:-""}
REPO_NAME="financetrack"
USERNAME="Siddhanta22"

if [ -z "$GITHUB_TOKEN" ]; then
    echo "❌ Error: GitHub token required"
    echo ""
    echo "Usage: ./create_repo.sh YOUR_GITHUB_TOKEN"
    echo ""
    echo "To create a token:"
    echo "1. Go to: https://github.com/settings/tokens"
    echo "2. Click 'Generate new token (classic)'"
    echo "3. Give it 'repo' permissions"
    echo "4. Copy the token and run: ./create_repo.sh YOUR_TOKEN"
    exit 1
fi

echo "📦 Creating repository: $REPO_NAME"

# Create repository using GitHub API
RESPONSE=$(curl -s -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/user/repos \
  -d "{\"name\":\"$REPO_NAME\",\"description\":\"AI-powered personal finance dashboard\",\"private\":false}")

# Check if repo was created successfully
if echo "$RESPONSE" | grep -q "already exists"; then
    echo "✅ Repository already exists"
elif echo "$RESPONSE" | grep -q "\"id\""; then
    echo "✅ Repository created successfully!"
else
    echo "❌ Error creating repository:"
    echo "$RESPONSE" | head -5
    exit 1
fi

echo ""
echo "🚀 Pushing code to GitHub..."

# Push to GitHub
git push -u origin main

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Success! Repository pushed to:"
    echo "   https://github.com/$USERNAME/$REPO_NAME"
else
    echo ""
    echo "❌ Error pushing code. Make sure the remote is configured:"
    echo "   git remote add origin https://github.com/$USERNAME/$REPO_NAME.git"
    echo "   git push -u origin main"
fi

