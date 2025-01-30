# Stage 1: Build, copy nested projct files
FROM node:20.18-alpine3.20 AS build

WORKDIR /usr/src/app

# copy whole monorepo files
COPY . /usr/src/app

RUN yarn install

RUN npx lerna run build --stream

FROM node:20.18-alpine3.20 AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=3000

WORKDIR /usr/src/app

COPY --from=build /usr/src/app .

WORKDIR packages/frontend

EXPOSE 3000

CMD yarn run start