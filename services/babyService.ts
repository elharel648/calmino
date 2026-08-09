import { logger } from '../utils/logger';
import { db, auth } from './firebaseConfig';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  Timestamp,
  updateDoc,
  doc,
  arrayUnion,
  arrayRemove,
  getDoc,
  getDocFromCache,
  deleteDoc
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BabyData = {
  id?: string;
  name: string;
  birthDate: any;
  gender: 'boy' | 'girl' | 'other';
  parentId: string;
  photoUrl?: string;
  stats?: {
    height?: string;
    weight?: string;
    headCircumference?: string;
  };
  teeth?: Record<string, any>;
  album?: { [key: number]: string };
  albumNotes?: { [key: number]: string };
  albumDates?: { [key: number]: Timestamp };
  milestones?: { title: string; date: any }[];
  vaccines?: { [key: string]: boolean };
  customVaccines?: { id: string; name: string; isDone: boolean }[];
};

// --- קריאת נתונים ---
export const getBabyData = async (): Promise<BabyData | null> => {
  const user = auth.currentUser;
  if (!user) return null;

  // First try to find baby by current user's UID
  let q = query(collection(db, 'babies'), where('parentId', '==', user.uid));
  let snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const docData = snapshot.docs[0].data();
    return { id: snapshot.docs[0].id, ...docData } as BabyData;
  }

  // If not found, check if user belongs to a family
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const familyId = userDoc.data()?.familyId;

    if (familyId) {
      // Get the family to find the baby ID
      const familyDoc = await getDoc(doc(db, 'families', familyId));
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        const babyId = familyData?.babyId;

        if (babyId) {
          // Fetch baby directly by ID
          const babyDoc = await getDoc(doc(db, 'babies', babyId));
          if (babyDoc.exists()) {
            return { id: babyDoc.id, ...babyDoc.data() } as BabyData;
          }
        }

        // Fallback: find baby by family creator's UID
        const creatorId = familyData?.createdBy;
        if (creatorId && creatorId !== user.uid) {
          q = query(collection(db, 'babies'), where('parentId', '==', creatorId));
          snapshot = await getDocs(q);
          if (!snapshot.empty) {
            const docData = snapshot.docs[0].data();
            return { id: snapshot.docs[0].id, ...docData } as BabyData;
          }
        }
      }
    }
  } catch (e) {
    logger.warn('Error fetching baby data from family:', e);
  }

  return null;
};

// Get baby data by specific child ID
export const getBabyDataById = async (childId: string): Promise<BabyData | null> => {
  try {
    // Try to get from server first
    const babyDoc = await getDoc(doc(db, 'babies', childId));
    if (babyDoc.exists()) {
      return { id: babyDoc.id, ...babyDoc.data() } as BabyData;
    }
    return null;
  } catch (e: any) {
    // Check if this is an offline error - don't log these
    const isOfflineError =
      e?.code === 'unavailable' ||
      e?.code === 'failed-precondition' ||
      e?.message?.includes('offline') ||
      e?.message?.includes('client is offline') ||
      (e?.name === 'FirebaseError' && e?.message?.includes('offline'));

    if (isOfflineError) {
      // Try to get from cache silently
      try {
        const cachedDoc = await getDocFromCache(doc(db, 'babies', childId));
        if (cachedDoc.exists()) {
          return { id: cachedDoc.id, ...cachedDoc.data() } as BabyData;
        }
      } catch (cacheError) {
        // Cache miss is expected, don't log
      }
      // Silent return for offline - don't spam console
      return null;
    }

    // Only log unexpected errors
    logger.error('Error fetching baby data by ID:', e);
    return null;
  }
};

export const updateBabyData = async (babyId: string, dataToUpdate: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, dataToUpdate);
};

// --- פונקציות קיימות (שומרות על מבנה) ---
// NOTE: This function now accepts a Storage URL instead of base64
// Use uploadAlbumPhoto from imageUploadService.ts to upload the image first
export const saveAlbumImage = async (babyId: string, month: number, imageUrl: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    [`album.${month}`]: imageUrl
  });
};

export const addMilestone = async (babyId: string, title: string, date: Date, notes?: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  const milestone: Record<string, any> = { title, date: Timestamp.fromDate(date) };
  if (notes?.trim()) milestone.notes = notes.trim();
  await updateDoc(babyRef, {
    milestones: arrayUnion(milestone)
  });
};

export const removeMilestone = async (babyId: string, milestoneObject: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    milestones: arrayRemove(milestoneObject)
  });
};

export const toggleVaccineStatus = async (babyId: string, currentVaccines: any, vaccineKey: string, date?: Date) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);

  const currentStatus = currentVaccines?.[vaccineKey];
  // Determine if currently done (handles boolean true or object {isDone: true})
  const isDone = typeof currentStatus === 'object' ? currentStatus.isDone : !!currentStatus;

  const newVal = !isDone;

  // If marking as done, save with date. If unmarking, just save false.
  const valueToSave = newVal ? { isDone: true, date: Timestamp.fromDate(date || new Date()) } : false;

  await updateDoc(babyRef, {
    [`vaccines.${vaccineKey}`]: valueToSave
  });
};

export const addCustomVaccine = async (babyId: string, vaccineName: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  const newVaccine = { id: Date.now().toString(), name: vaccineName, isDone: false };
  await updateDoc(babyRef, {
    customVaccines: arrayUnion(newVaccine)
  });
};

export const removeCustomVaccine = async (babyId: string, vaccineObject: any) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);
  await updateDoc(babyRef, {
    customVaccines: arrayRemove(vaccineObject)
  });
};

export const toggleCustomVaccine = async (babyId: string, allCustomVaccines: any[], vaccineId: string) => {
  if (!babyId) return;
  const babyRef = doc(db, 'babies', babyId);

  const updatedList = allCustomVaccines.map(v =>
    v.id === vaccineId ? { ...v, isDone: !v.isDone } : v
  );

  await updateDoc(babyRef, { customVaccines: updatedList });
};

export const checkIfBabyExists = async (): Promise<boolean> => {
  try {
    const babyData = await getBabyData();
    if (babyData !== null) return true;

    // OFFLINE FALLBACK: If Firebase queries yielded nothing (e.g. cache miss when offline), pull from AsyncStorage
    const cached = await AsyncStorage.getItem('offline_childrenList');
    if (cached) {
      let parsed: any;
      try { parsed = JSON.parse(cached); } catch { parsed = null; }
      if (parsed && Array.isArray(parsed) && parsed.length > 0) {
        return true;
      }
    }
  } catch (e) {
    logger.warn('checkIfBabyExists failed, returning fallback false', e);
  }
  
  return false;
};

export const saveBabyProfile = async (name: string, lastName: string, birthDate: Date, gender: string) => {
  const user = auth.currentUser;
  if (!user) throw new Error('No user');
  
  // 1. Save Baby Profile
  const docRef = await addDoc(collection(db, 'babies'), {
    name, lastName, birthDate, gender, parentId: user.uid, createdAt: Timestamp.now(),
    stats: { weight: '0', height: '0', headCircumference: '0' },
    milestones: [],
    album: {},
    vaccines: {},
    customVaccines: []
  });

  // 2. Auto-Mint Family Document
  try {
    const familyName = lastName.trim() ? lastName.trim() : name.trim();
    const { createFamily } = require('./familyService');
    await createFamily(docRef.id, familyName);
  } catch (e) {
    logger.error('Failed to auto-create family doc during onboarding', e);
  }
};

// Delete child completely from database
export const deleteChild = async (childId: string): Promise<void> => {
  if (!childId) throw new Error('Child ID is required');

  try {
    // Delete the baby document
    const babyRef = doc(db, 'babies', childId);
    await deleteDoc(babyRef);
  } catch (error) {
    throw error;
  }
};