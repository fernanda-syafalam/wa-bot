FROM node:20-alpine AS builder

ENV NODE_ENV=build

RUN apk add --no-cache dumb-init

WORKDIR /usr/src/app

COPY package*.json /usr/src/app

RUN npm ci --only=production --ignore-scripts --prefer-offline

# ---

FROM node:20-alpine

ENV NODE_ENV=production

USER node
WORKDIR /usr/src/app

COPY --from=builder /usr/bin/dumb-init /usr/bin/dumb-init
COPY --from=builder /usr/src/app/node_modules /usr/src/app/node_modules
COPY --chown=node:node . /usr/src/app

CMD ["dumb-init", "node", "src/app.js"]