# AnimeMuseAI Copilot Instructions

## Project Overview
AnimeMuseAI is a sophisticated anime recommendation platform built with **Convex** (real-time backend), **React/TypeScript** (frontend), and **OpenAI** (AI recommendations). The app features personalized anime discovery, mood-based recommendations, comprehensive character analysis with AI enrichment, and admin management tools.

## Core Architecture

### Convex Backend Pattern
- **Queries**: Read-only operations (`query`, `internalQuery`)
- **Mutations**: Database writes (`mutation`, `internalMutation`) 
- **Actions**: External API calls/AI operations (`action`, `internalAction`)
- **Schema**: Strongly typed with `v.` validators in `convex/schema.ts`
- **Real-time**: Database changes automatically sync to frontend via `useQuery`

### Key Database Tables
- `anime`: Core anime data with AI-enriched characters
- `userProfiles`: User preferences, onboarding state, admin flags
- `watchlist`: User's anime tracking with ratings/notes
- `reviews`: Community reviews with voting system
- `aiCache`: 7-day TTL cache for AI responses to reduce token usage
- `changeTracking`: Admin activity audit logs

### AI Integration Patterns
All AI operations use **caching-first** approach in `convex/ai.ts`:
```typescript
// Cache key pattern: "action_type:param1:param2"
const cacheKey = `comprehensive_character:${animeName}:${characterName}`;
const cachedResult = await ctx.runQuery(internal.aiCache.getCache, { key: cacheKey });
```

## Development Workflows

### Running the App
```bash
npm run dev  # Starts both Convex backend and Vite frontend
```

### Testing
```bash
npm test    # Runs Vitest tests for Convex functions
```

### Essential Commands
- `npx convex deploy` - Deploy backend
- `npx convex dev` - Watch mode for backend only
- `vite build` - Production frontend build

## Character Enrichment System

This is a **core feature** - AI automatically enriches anime characters with detailed analysis:

### Enrichment Flow
1. **Trigger**: User views character detail page
2. **Cache Check**: Check `aiCache` for existing enrichment (7-day TTL)
3. **AI Call**: `fetchComprehensiveCharacterDetails` action if cache miss
4. **Database Update**: Save enriched data to anime.characters array
5. **Protection**: Admin-enriched characters have `manuallyEnrichedByAdmin: true`

### Critical Files
- `convex/characterEnrichment.ts` - Batch processing, retry logic
- `convex/ai.ts` - AI prompt engineering and caching
- `src/components/admin/CharacterEnrichmentPage.tsx` - Admin dashboard

### Status Tracking
Characters have `enrichmentStatus`: "pending" | "success" | "failed" | "skipped"

## Mobile Optimization

The app is **heavily optimized for mobile**, especially iOS:
- `useMobileOptimizations` hook detects device capabilities
- iPad-specific layouts in key components
- CSS custom properties for viewport height (`--vh`)
- Touch-optimized UI patterns

## Project-Specific Conventions

### File Organization
- `convex/` - All backend logic (queries, mutations, actions, schema)
- `src/components/animuse/` - Main app components
- `src/components/admin/` - Admin dashboard
- `src/components/auth/` - Authentication flows
- `src/hooks/` - Custom React hooks for mobile/performance

### Error Handling
- **Convex functions**: Always include try/catch with detailed console logs
- **Frontend**: `ConvexErrorBoundary` wraps the entire app
- **AI operations**: Graceful fallbacks with retry logic

### State Management
- **No Redux** - Use Convex `useQuery`/`useMutation` for server state
- **Local state**: React useState/useEffect for UI state only
- **Real-time updates**: Automatic via Convex reactivity

### Authentication
- **Convex Auth** with phone number verification
- Admin privileges controlled via `userProfiles.isAdmin`
- **Two-step verification**: Phone → onboarding flow

## AI Integration Guidelines

### Prompt Engineering
- All AI prompts in `convex/ai.ts` use **comprehensive, detailed instructions**
- Include specific output format requirements (JSON schemas)
- Always specify fallback behavior for API failures

### Cost Optimization
- **7-day caching** for all AI responses
- Batch operations to reduce API calls
- Use cheaper models where appropriate (`OPENAI_MODEL` constant)

### Validation
- All AI responses validated before database storage
- Detailed error logging for failed enrichments
- Retry logic with exponential backoff

## Admin System

### Admin Dashboard
- Character enrichment management (`CharacterEnrichmentPage.tsx`)
- User management with role assignment
- Change tracking and audit logs
- Cache management and statistics

### Admin Actions
- Always use `assertAdmin()` helper for authorization
- Log all changes to `changeTracking` table
- Provide detailed success/error feedback

## External Integrations

### AniList API
- Fetch anime metadata via GraphQL in `convex/externalApis.ts`
- Rate limiting and error handling built-in
- Automatic poster URL enhancement

### Twilio SMS
- Phone verification via `convex/twilioSender.ts`
- Rate limiting and security measures

## Performance Patterns

### Database Queries
- Use appropriate **indexes** (defined in schema)
- Pagination for large datasets
- Search indexes for text search

### Frontend Optimization
- Lazy loading with `React.lazy()` and `Suspense`
- Virtualization for large lists (`react-window`)
- Image optimization and caching

## Common Pitfalls

1. **Don't bypass caching** - Always check `aiCache` before AI calls
2. **Use proper Convex function types** - `query` for reads, `mutation` for writes, `action` for external calls
3. **Mobile-first** - Test on actual devices, not just browser dev tools
4. **Character enrichment locks** - Respect `manuallyEnrichedByAdmin` flags
5. **Schema validation** - Use `v.` validators for all Convex arguments/returns

## Key Dependencies
- `convex` - Real-time backend platform
- `@convex-dev/auth` - Authentication system
- `openai` - AI/ML functionality
- `framer-motion` - Animations
- `tailwindcss` - Styling
- `react-window` - Performance virtualization

This codebase emphasizes **real-time reactivity**, **AI-driven content**, and **mobile-first design**. Always consider caching, performance, and user experience when making changes.
