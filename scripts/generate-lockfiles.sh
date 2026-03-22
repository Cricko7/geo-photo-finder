#!/bin/bash

echo "🔍 Generating package-lock.json files..."

# Функция для генерации lock файла
generate_lock() {
  local dir=$1
  echo "📦 Processing $dir..."
  
  if [ ! -f "$dir/package-lock.json" ]; then
    echo "   Creating package-lock.json in $dir..."
    cd "$dir"
    npm install --package-lock-only
    cd ..
    echo "   ✅ Created $dir/package-lock.json"
  else
    echo "   ✅ $dir/package-lock.json already exists"
  fi
}

# Генерируем для backend и frontend
generate_lock "server"
generate_lock "client"

echo "🎉 All lock files are ready!"