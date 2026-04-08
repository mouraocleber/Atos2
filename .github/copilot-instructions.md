# AI Agent Instructions for Atos2

## Project Overview
Atos2 is a mobile-first messaging application with an integrated digital wallet system. The project consists of a TypeScript/Node.js backend and a React/TypeScript frontend.

## Architecture and Components

### Backend (`/src`)
- **API Layer**: RESTful endpoints in `/routes` with corresponding controllers in `/controllers`
- **Service Layer**: Business logic in `/services` with strict separation of concerns
- **Database**: PostgreSQL with connection pool (`/config/database.ts`)
- **Caching**: Redis for real-time features (`/config/redis.ts`)
- **WebSocket**: Used for real-time messaging and notifications

### Frontend (`/frontend`)
- **Theme**: Dark mode with red (#DC143C) and yellow (#FFD700) accents
- **Components**: Reusable UI components in `/frontend/src/components`
- **Pages**: Route-based components in `/frontend/src/pages`
- **State Management**: Context API (`/frontend/src/utils/themeContext.tsx`)

## Development Workflow

### Environment Setup
1. PostgreSQL 12+ and Redis 6+ required
2. Copy `.env.example` and configure for local development
3. Run database migrations from `/src/config/init-db.sql`

### Running the Project
```bash
# Backend
npm install
npm run dev  # Starts on port 3000

# Frontend
cd frontend
npm install
npm run dev  # Starts on port 5173
```

## Key Patterns and Conventions

### Backend Patterns
- Controllers use service layer for business logic
- Database transactions wrap all financial operations
- WebSocket events follow `{type, payload}` structure
- Authentication via JWT with refresh token rotation

### Frontend Patterns
- Mobile-first responsive design
- Component composition using `Card` and `Button` base components
- CSS modules for component-scoped styling
- Theme context for consistent styling

## Integration Points
- Backend API: `http://localhost:3000/api`
- WebSocket: `ws://localhost:3000/ws`
- Redis pub/sub for real-time features
- ViaCEP integration for address lookup

## Common Tasks
- User authentication flow: `authController.ts` → `userService.ts`
- Transaction processing: `walletController.ts` → `transactionService.ts`
- Real-time messaging: `messageController.ts` → `messageService.ts`
- Product management: `productController.ts` → `productService.ts`