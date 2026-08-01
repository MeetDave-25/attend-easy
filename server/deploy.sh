#!/bin/bash

# Quick Backend Deployment Script for Render

echo "🚀 Preparing backend for deployment..."

# Step 1: Initialize git if not already done
if [ ! -d .git ]; then
    echo "📦 Initializing git repository..."
    git init
fi

# Step 2: Create .gitignore if not exists
if [ ! -f .gitignore ]; then
    echo "📝 Creating .gitignore..."
    cat > .gitignore << EOF
node_modules/
.env
*.log
.DS_Store
EOF
fi

# Step 3: Add and commit files
echo "💾 Committing files..."
git add .
git commit -m "Prepare backend for deployment"

# Step 4: Instructions
echo ""
echo "✅ Backend is ready for deployment!"
echo ""
echo "📋 Next steps:"
echo "1. Create a new repository on GitHub: https://github.com/new"
echo "2. Name it: attendeasy-backend"
echo "3. Run these commands:"
echo ""
echo "   git remote add origin https://github.com/YOUR_USERNAME/attendeasy-backend.git"
echo "   git branch -M main"
echo "   git push -u origin main"
echo ""
echo "4. Go to Render.com and deploy from GitHub"
echo "5. Set environment variables (DATABASE_URL, JWT_SECRET, etc.)"
echo ""
echo "🎉 Your backend will be live in minutes!"
