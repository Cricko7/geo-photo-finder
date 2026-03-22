FROM node:18-alpine

WORKDIR /app

# Установка зависимостей для sharp
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Создание директории для загрузок
RUN mkdir -p uploads && chmod 755 uploads

EXPOSE 5000

CMD ["npm", "start"]