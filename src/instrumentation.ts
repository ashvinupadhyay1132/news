
// This file is used to run code when the Next.js server starts up.
// It's suitable for initializing background tasks like cron jobs.
// Ensure `experimental.instrumentationHook = true` is in next.config.js

import { startCronService } from '@/lib/cron-service';

export async function register() {
  // Check if running on the server side, as instrumentation hooks can run in different environments.
  // For cron jobs, we typically only want them on the main server process.
  // The `NEXT_RUNTIME` variable helps distinguish. 'nodejs' is typical for the server.
  // 'edge-runtime' would be for Edge Functions where long-running processes like cron aren't suitable.
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[Instrumentation] Attempting to register cron service for Node.js runtime.');
    try {
      await startCronService(); // Make sure startCronService and its callees handle their promises correctly
      console.log('[Instrumentation] Cron service registration process initiated.');
    } catch (error) {
      console.error('[Instrumentation] CRITICAL ERROR during cron service registration or initial fetch:', error);
      // Depending on the severity, you might choose to gracefully degrade or re-throw
      // For now, we log it. If this error is fatal to the app's ability to run,
      // the process might still exit if Next.js doesn't handle errors from register() gracefully.
    }
  } else {
    console.log(`[Instrumentation] Skipping cron service registration for runtime: ${process.env.NEXT_RUNTIME || 'unknown (likely client or edge)'}.`);
  }
}
