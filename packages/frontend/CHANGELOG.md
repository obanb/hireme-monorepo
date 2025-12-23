# Frontend Changelog

## [Unreleased]

### Added
- Next.js 15 frontend application
- Hotel CMS dashboard page
- Room availability calendar component
- API documentation page
- Server component for live data fetching

### Pages
- `/hotel-cms` - Hotel CMS dashboard with calendar and stats
- `/api-docs` - API documentation page
- `/chat` - Chat interface
- `/game` - Pixel art game

### Components
- `HotelSidebar` - Collapsible sidebar navigation
- `RoomCalendar` - Google Calendar-style room booking calendar
- `DashboardStats` - Statistics cards component
- `LiveRates` - Server component fetching from federated backend

### Features
- Modern UI with Tailwind CSS
- Responsive design
- Interactive calendar with week/month views
- Room type filtering
- Color-coded bookings
- Server-side data fetching
- Suspense boundaries for loading states

### Integration
- Fetches data from federated GraphQL backend
- Uses server components for data fetching
- Integrates with `shared-schema` types

### Dependencies
- `next` - Next.js framework
- `react` - React library
- `tailwindcss` - CSS framework
- `framer-motion` - Animation library

