/**
 * Background Tasks Configuration
 * Manages background fetch and task manager operations
 */

import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { BACKGROUND_FETCH_CONFIG, TASK_MANAGER_CONFIG } from '@/config/native-modules';

/**
 * Background fetch task for syncing data
 */
TaskManager.defineTask(
  TASK_MANAGER_CONFIG.backgroundFetchTask,
  async () => {
    try {
      // Perform background sync operations
      console.log('Background fetch task running');

      // Example: Sync notifications, update cache, etc.
      // await syncNotifications();
      // await updateLocalCache();

      return BackgroundFetch.BackgroundFetchResult.NewData;
    } catch (error) {
      console.error('Background fetch error:', error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }
);

/**
 * Register background fetch task
 */
export async function registerBackgroundFetch(): Promise<void> {
  try {
    const status = await BackgroundFetch.getStatusAsync();

    if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
      await BackgroundFetch.registerTaskAsync(
        TASK_MANAGER_CONFIG.backgroundFetchTask,
        {
          minimumInterval: BACKGROUND_FETCH_CONFIG.minimumInterval,
          stopOnTerminate: false,
          startOnBoot: true,
        }
      );
      console.log('Background fetch registered successfully');
    } else {
      console.log('Background fetch not available:', status);
    }
  } catch (error) {
    console.error('Error registering background fetch:', error);
  }
}

/**
 * Unregister background fetch task
 */
export async function unregisterBackgroundFetch(): Promise<void> {
  try {
    await BackgroundFetch.unregisterTaskAsync(
      TASK_MANAGER_CONFIG.backgroundFetchTask
    );
    console.log('Background fetch unregistered');
  } catch (error) {
    console.error('Error unregistering background fetch:', error);
  }
}

/**
 * Check background fetch status
 */
export async function getBackgroundFetchStatus(): Promise<string> {
  const status = await BackgroundFetch.getStatusAsync();

  switch (status) {
    case BackgroundFetch.BackgroundFetchStatus.Available:
      return 'Available';
    case BackgroundFetch.BackgroundFetchStatus.Denied:
      return 'Denied';
    case BackgroundFetch.BackgroundFetchStatus.Restricted:
      return 'Restricted';
    default:
      return 'Unknown';
  }
}

/**
 * Location tracking task (example)
 * Note: Requires expo-location permissions
 */
TaskManager.defineTask(
  TASK_MANAGER_CONFIG.locationTask,
  async ({ data, error }: any) => {
    if (error) {
      console.error('Location task error:', error);
      return;
    }

    if (data) {
      const { locations } = data;
      console.log('Received locations in background:', locations);

      // Process location updates
      // await processLocationUpdate(locations);
    }
  }
);

/**
 * Start location tracking in background
 */
export async function startBackgroundLocationTracking(): Promise<void> {
  try {
    // This is an example - implement based on your needs
    console.log('Start background location tracking');
    // const { Location } = await import('expo-location');
    // await Location.startLocationUpdatesAsync(
    //   TASK_MANAGER_CONFIG.locationTask,
    //   {
    //     accuracy: Location.Accuracy.Balanced,
    //     timeInterval: 10000,
    //     distanceInterval: 100,
    //     showsBackgroundLocationIndicator: true,
    //   }
    // );
  } catch (error) {
    console.error('Error starting background location:', error);
  }
}

/**
 * Stop location tracking in background
 */
export async function stopBackgroundLocationTracking(): Promise<void> {
  try {
    // const { Location } = await import('expo-location');
    // await Location.stopLocationUpdatesAsync(TASK_MANAGER_CONFIG.locationTask);
    console.log('Stopped background location tracking');
  } catch (error) {
    console.error('Error stopping background location:', error);
  }
}

/**
 * Check if task is registered
 */
export async function isTaskRegistered(taskName: string): Promise<boolean> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(taskName);
  return isRegistered;
}

/**
 * Get all registered tasks
 */
export async function getRegisteredTasks(): Promise<string[]> {
  const tasks = await TaskManager.getRegisteredTasksAsync();
  return tasks.map((task) => task.taskName);
}
