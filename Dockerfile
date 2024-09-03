FROM node:20-alpine

WORKDIR /usr/src/app

ENV NODE_ENV="production"

COPY package*.json ./

RUN npm ci --only=production --ignore-scripts

COPY . .

EXPOSE 3300

CMD ["node", "src/app.js"]