#!/bin/bash
set -euo pipefail

# Production runs on Vercel. Database and file storage are managed services,
# so there is no server to SSH into and nothing to restart.

cd "$(dirname "$0")"

echo "Building locally first..."
npm run build

echo "Deploying to Vercel production..."
npx --yes vercel deploy --prod --non-interactive

echo
echo "Verifying..."
curl -fsS -o /dev/null -w "https://deeptrading.top -> %{http_code}\n" https://deeptrading.top/
