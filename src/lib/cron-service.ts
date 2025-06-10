
'use server'; // Indicate this module can run server-side

import cron from 'node-cron';
import { updateArticlesFromRssAndSaveToDb } from './placeholder-data';

const CRON_SCHEDULE_HOURLY = '0 * * * *'; // Run at the start of every hour

let isInitialUpdateDone = false;

async function runHourlyUpdate() {
  console.log('[Cron Service] Starting hourly article update process...');
  try {
    await updateArticlesFromRssAndSaveToDb();
    console.log('[Cron Service] Hourly article update process completed successfully.');
  } catch (error) {
    console.error('[Cron Service] Error during hourly article update process:', error);
  }
}

async function initializeNewsFetching() {
  if (isInitialUpdateDone) {
    // console.log('[Cron Service] Initial update already performed or in progress.');
    return;
  }
  isInitialUpdateDone = true; // Set flag immediately to prevent multiple initial runs

  console.log('[Cron Service] Performing initial article fetch and save (if database is empty)...');
  try {
    // updateArticlesFromRssAndSaveToDb already handles the logic for initial 150 records if DB is empty.
    await updateArticlesFromRssAndSaveToDb();
    console.log('[Cron Service] Initial article fetch and save process completed.');
  } catch (error) {
    console.error('[Cron Service] Error during initial article fetch and save process:', error);
    isInitialUpdateDone = false; // Reset flag on error to allow retry on next server start
  }

  // Schedule the hourly job after the initial run attempt
  if (cron.validate(CRON_SCHEDULE_HOURLY)) {
    console.log(`[Cron Service] Scheduling hourly article updates with cron expression: ${CRON_SCHEDULE_HOURLY}`);
    cron.schedule(CRON_SCHEDULE_HOURLY, runHourlyUpdate, {
      scheduled: true,
      timezone: "Etc/UTC" // Use UTC or your preferred timezone
    });
    console.log('[Cron Service] Hourly updates scheduled.');
  } else {
    console.error(`[Cron Service] Invalid cron expression: ${CRON_SCHEDULE_HOURLY}. Hourly updates NOT scheduled.`);
  }
}

// Export a function that can be called to start the service
export async function startCronService() {
  console.log('[Cron Service] Initializing news fetching service...');
  // Perform the initial fetch/save.
  // The cron job for hourly updates will be scheduled inside initializeNewsFetching.
  await initializeNewsFetching(); // Ensure this completes before startCronService returns
  console.log('[Cron Service] News fetching service initialization complete.');
}
