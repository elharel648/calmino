import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from './firebaseConfig';
import { logger } from '../utils/logger';

export interface WrappedData {
  totalDiapers: number;
  totalSleepHours: number;
  totalFeedings: number;
  longestSleepHours: number;
  firstEventDate: Date | null;
  totalBottleMl: number;
  albumPhotos: string[]; // grabbed from baby.album
}

export const getWrappedData = async (childId: string): Promise<WrappedData | null> => {
  try {
    const q = query(
      collection(db, 'events'),
      where('childId', '==', childId)
    );

    const snapshot = await getDocs(q);

    let totalDiapers = 0;
    let totalSleepSecs = 0;
    let totalFeedings = 0;
    let longestSleepSecs = 0;
    let totalBottleMl = 0;
    let firstEventDate: Date | null = null;

    snapshot.forEach(docSnap => {
      const data = docSnap.data();

      if (data.timestamp) {
        const date = (data.timestamp as Timestamp).toDate();
        if (!firstEventDate || date < firstEventDate) {
          firstEventDate = date;
        }
      }

      if (data.type === 'diaper') {
        totalDiapers++;
      }

      if (data.type === 'sleep' && data.duration && data.duration > 0) {
        totalSleepSecs += data.duration;
        if (data.duration > longestSleepSecs) {
          longestSleepSecs = data.duration;
        }
      }

      if (data.type === 'food') {
        totalFeedings++;
        if (data.subType === 'bottle' && data.amount) {
          totalBottleMl += Number(data.amount) || 0;
        }
      }
    });

    return {
      totalDiapers,
      totalSleepHours: Math.round(totalSleepSecs / 3600),
      totalFeedings,
      longestSleepHours: Math.round(longestSleepSecs / 3600 * 10) / 10,
      firstEventDate,
      totalBottleMl: Math.round(totalBottleMl),
      albumPhotos: [], // caller fills this from baby.album
    };
  } catch (error) {
    logger.error('Failed to fetch wrapped data:', error);
    return null;
  }
};
