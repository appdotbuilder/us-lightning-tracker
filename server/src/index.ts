
import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import { 
  createUserLocationInputSchema, 
  updateUserLocationInputSchema,
  getUserLocationInputSchema,
  zipCodeLookupInputSchema,
  createLightningStrikeInputSchema,
  getNearbyStrikesInputSchema
} from './schema';

// Import handlers
import { createUserLocation } from './handlers/create_user_location';
import { getUserLocation } from './handlers/get_user_location';
import { updateUserLocation } from './handlers/update_user_location';
import { lookupZipCode } from './handlers/lookup_zip_code';
import { createLightningStrike } from './handlers/create_lightning_strike';
import { getNearbyStrikes } from './handlers/get_nearby_strikes';
import { getUserNotifications } from './handlers/get_user_notifications';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  
  // User location management
  createUserLocation: publicProcedure
    .input(createUserLocationInputSchema)
    .mutation(({ input }) => createUserLocation(input)),
    
  getUserLocation: publicProcedure
    .input(getUserLocationInputSchema)
    .query(({ input }) => getUserLocation(input)),
    
  updateUserLocation: publicProcedure
    .input(updateUserLocationInputSchema)
    .mutation(({ input }) => updateUserLocation(input)),
    
  // ZIP code lookup
  lookupZipCode: publicProcedure
    .input(zipCodeLookupInputSchema)
    .query(({ input }) => lookupZipCode(input)),
    
  // Lightning strike management
  createLightningStrike: publicProcedure
    .input(createLightningStrikeInputSchema)
    .mutation(({ input }) => createLightningStrike(input)),
    
  getNearbyStrikes: publicProcedure
    .input(getNearbyStrikesInputSchema)
    .query(({ input }) => getNearbyStrikes(input)),
    
  // Notifications
  getUserNotifications: publicProcedure
    .input(getUserLocationInputSchema)
    .query(({ input }) => getUserNotifications(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`Lightning Tracker TRPC server listening at port: ${port}`);
}

start();
