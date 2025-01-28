# Stage 1: Build, copy nested projct files
FROM node:20.18-alpine3.20 AS build

WORKDIR /usr/src/app

# copy whole monorepo files
COPY . /usr/src/app

RUN yarn install

RUN yarn nx run-many --target=build --all

FROM node:20.18-alpine3.20 AS production

ARG NODE_ENV=production
ENV NODE_ENV=${NODE_ENV}
ENV PORT=8080

WORKDIR /usr/src/app

COPY --from=build /usr/src/app/packages/api ./api
COPY --from=build /usr/src/app/node_modules ./node_modules
# COPY --from=build /usr/src/app/yarn.lock ./

WORKDIR api

EXPOSE 8080

CMD ["node", "dist/index.js"]