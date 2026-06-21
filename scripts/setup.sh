#!/bin/bash
# One-command setup for CEO Business Operating System
set -e

echo "🚀 CEO Business Operating System — Setup"
echo "========================================="

# 1. Copy env if not exists
if [ ! -f .env ]; then
  echo "📋 Creating .env from .env.example..."
  cp .env.example .env
  echo "⚠️  Please edit .env with your database and API credentials, then run this script again."
  exit 1
fi

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Run migrations
echo "🗄️  Running database migrations..."
npx prisma migrate deploy

# 4. Generate Prisma client
echo "⚙️  Generating Prisma client..."
npx prisma generate

# 5. Seed demo data
echo "🌱 Seeding demo data..."
npx prisma db seed

# 6. Build
echo "🔨 Building application..."
npm run build

echo ""
echo "✅ Setup complete!"
echo ""
echo "Start the server:  npm start"
echo "Development mode:  npm run dev"
echo ""
echo "Demo credentials:"
echo "  CEO:        ceo@acme.com / password123"
echo "  Dept Head:  mike@acme.com / password123"
