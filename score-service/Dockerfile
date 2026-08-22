FROM node:18-alpine

WORKDIR /app

# Install dependencies first for better caching
COPY package*.json ./
RUN npm install --production

# Copy application source code
COPY . .

EXPOSE 3002

CMD ["node", "server.js"]
