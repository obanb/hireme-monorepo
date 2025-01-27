# Stage 1: Build
FROM node:20.18-alpine3.20 AS stage1

WORKDIR /usr/src/app

COPY package*.json ./

RUN yarn install

COPY ../../packages/api .

RUN yarn run build

# Stage 2: Production
FROM node:20.18-alpine3.20 AS stage2

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=8080

WORKDIR /usr/src/app

COPY package*.json ./
RUN yarn install --production=true

# Copy build from stage1
COPY --from=stage1 /usr/src/app/dist ./dist

EXPOSE 8080

CMD ["node", "dist/index.js"]