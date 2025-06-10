
// This file is used to run code when the Next.js server starts up.
// It's suitable for initializing background tasks like cron jobs.
// Ensure `experimental.instrumentationHook = true` is in next.config.js

import { startCronService } from '@/lib/cron-service';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Attempting to register cron service for Node.js runtime.');
    try {
      await startCronService(); 
      console.log('[Instrumentation] Cron service registration process initiated.');
    } catch (error) {
      console.error('[Instrumentation] CRITICAL ERROR during cron service registration or initial fetch:', error);
    }
  } else {
    // console.log(`[Instrumentation] Skipping cron service registration for runtime: ${process.env.NEXT_RUNTIME || 'unknown (likely client or edge)'}.`);
  }
}
