import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const REVIEW_COUNT_KEY = '@calmparent_review_action_count';
const HAS_REVIEWED_KEY = '@calmparent_has_prompted_review';

export const storeReviewService = {
  /**
   * Call this function whenever the user completes a "positive" action.
   * Examples: Saving a feeding, a sleep session, or checking growth.
   */
  async trackPositiveActionAndRequestReview() {
    try {
      // 1. Check if we've already concluded our prompt lifecycle
      const hasPrompted = await AsyncStorage.getItem(HAS_REVIEWED_KEY);
      if (hasPrompted === 'true') {
        return;
      }

      // 2. Increment action count
      const countStr = await AsyncStorage.getItem(REVIEW_COUNT_KEY);
      let count = countStr ? parseInt(countStr, 10) : 0;
      count += 1;
      
      await AsyncStorage.setItem(REVIEW_COUNT_KEY, count.toString());

      // 3. Trigger review prompt at specific milestones (5, 20, 50)
      if (count === 5 || count === 20 || count === 50) {
        if (await StoreReview.hasAction()) {
          logger.log(`🌟 [StoreReview] Requesting App Store Review at positive action count: ${count}`);
          await StoreReview.requestReview();
          
          // Stop asking altogether after 50 actions to respect user peace
          if (count === 50) {
             await AsyncStorage.setItem(HAS_REVIEWED_KEY, 'true');
          }
        } else {
          logger.log(`⚠️ [StoreReview] Platform does not support StoreReview at this time.`);
        }
      }
    } catch (error) {
      logger.warn('Failed to execute store review logic:', error);
    }
  }
};
