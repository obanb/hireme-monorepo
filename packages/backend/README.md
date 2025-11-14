# Backend (GraphQL Federation Subgraph)

This package exposes a lightweight Apollo Federation subgraph that models hotels for the CMS experience. It can be composed with other subgraphs via Apollo Router/Gateway or run independently for local testing.

## Features

- Apollo Server 4 with `@apollo/subgraph`
- Federation v2 compliant schema (includes `@key` + shareable fields)
- Express middleware with CORS + JSON parsing
- Sample dataset for hotels exposed via `Query.hotels`, `Query.hotel`, and `Query.featuredHotels`

## Scripts

| Script  | Description                                   |
| ------- | --------------------------------------------- |
| `dev`   | Starts the subgraph with `ts-node-dev`        |
| `build` | Compiles TypeScript sources to `dist/`        |
| `start` | Runs the compiled build (`node dist/index.js`)|

## Running Locally

```bash
cd packages/backend
npm install
npm run dev
```

The GraphQL endpoint will be available at `http://localhost:4001/graphql`.

## Example Query

```graphql
query FeaturedHotels {
  featuredHotels(limit: 2) {
    id
    name
    city
    rating
  }
}
```

