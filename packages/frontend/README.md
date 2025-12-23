# Frontend

Next.js frontend application for the Hotel CMS platform.

## Overview

Customer-facing frontend application with hotel management dashboard, room calendar, and API documentation.

## Features

- Hotel CMS dashboard with room availability calendar
- Google Calendar-style booking interface
- Real-time statistics and metrics
- API documentation page
- Server components for data fetching
- Responsive design with Tailwind CSS

## Pages

- `/` - Landing page
- `/hotel-cms` - Hotel CMS dashboard with calendar
- `/api-docs` - API documentation
- `/chat` - Chat interface
- `/game` - Pixel art game

## Components

- `HotelSidebar` - Collapsible navigation sidebar
- `RoomCalendar` - Interactive room booking calendar
- `DashboardStats` - Statistics cards
- `LiveRates` - Server component for federated data

## Getting Started

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build

```bash
npm run build
npm start
```

## Tech Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Framer Motion

## Integration

- Fetches data from federated GraphQL backend (`packages/api`)
- Uses `shared-schema` for type definitions
- Server components for efficient data fetching
