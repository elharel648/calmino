import { logger } from '../utils/logger';
import { collection, doc, addDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebaseConfig';

export interface UndoableAction {
    eventId: string;
    type: 'create' | 'update' | 'delete';
    data?: any;
    timestamp: Date;
}

class UndoService {
    private lastAction: UndoableAction | null = null;
    private undoTimeout: NodeJS.Timeout | null = null;

    setLastAction(action: UndoableAction) {
        this.lastAction = action;
        // Auto clear after 10 seconds
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }
        this.undoTimeout = setTimeout(() => {
            this.lastAction = null;
        }, 10000);
    }

    getLastAction(): UndoableAction | null {
        return this.lastAction;
    }

    async undo(): Promise<boolean> {
        if (!this.lastAction) return false;

        try {
            if (this.lastAction.type === 'create') {
                // Delete the created event
                const eventRef = doc(db, 'events', this.lastAction.eventId);
                await deleteDoc(eventRef);
            } else if (this.lastAction.type === 'delete' && this.lastAction.data) {
                // Restore the deleted event from stored data
                await addDoc(collection(db, 'events'), this.lastAction.data);
            } else if (this.lastAction.type === 'delete') {
                // No data stored — cannot restore
                logger.warn('Undo for delete: no event data stored, cannot restore');
                return false;
            }

            this.lastAction = null;
            if (this.undoTimeout) {
                clearTimeout(this.undoTimeout);
            }
            return true;
        } catch (error) {
            logger.error('Undo failed:', error);
            return false;
        }
    }

    clear() {
        this.lastAction = null;
        if (this.undoTimeout) {
            clearTimeout(this.undoTimeout);
        }
    }
}

export const undoService = new UndoService();

