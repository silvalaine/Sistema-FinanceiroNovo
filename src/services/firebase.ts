import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  GoogleAuthProvider, 
  onAuthStateChanged,
  User 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  collection, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  writeBatch,
  getDocFromServer,
  query,
  getDocs,
  where
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Category, CreditCard, Transaction } from '../types/finance';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// CRITICAL: Must pass firestoreDatabaseId
const databaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId || 'ai-studio-finanplancontrol-a5be9731-cacb-45cc-b7af-bcb4ee42d8b0';
export const db = getFirestore(app, databaseId);
export const auth = getAuth(app);

// Google Workspace Scopes
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope(DRIVE_SCOPE);

// In-memory OAuth access token cache (required: never store in localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let isSigningIn = false;

// Clear cached token when user logs out
onAuthStateChanged(auth, (user) => {
  if (!user) {
    cachedAccessToken = null;
  }
});

// Error Handling Specification
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map((p) => ({
        providerId: p.providerId,
        email: p.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection check on boot
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or initializing.');
    }
  }
}
testConnection();

// Authentication helpers
export const loginWithGoogle = async (): Promise<User> => {
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
    }

    // Ensure user profile document exists
    if (result.user) {
      const userDocRef = doc(db, 'users', result.user.uid);
      try {
        await setDoc(userDocRef, {
          uid: result.user.uid,
          email: result.user.email || '',
          displayName: result.user.displayName || '',
          photoURL: result.user.photoURL || '',
          lastLogin: new Date().toISOString(),
        }, { merge: true });
      } catch (e) {
        console.warn('Error saving user profile doc:', e);
      }
    }
    return result.user;
  } finally {
    isSigningIn = false;
  }
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
  cachedAccessToken = null;
};

/**
 * Retrieves the OAuth access token for Google Drive API.
 * If not present in memory, prompts user sign-in/consent popup.
 */
export const getDriveAccessToken = async (promptIfMissing = true): Promise<string | null> => {
  if (cachedAccessToken) {
    return cachedAccessToken;
  }
  if (!promptIfMissing) {
    return null;
  }
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (credential?.accessToken) {
      cachedAccessToken = credential.accessToken;
      return cachedAccessToken;
    }
    return null;
  } catch (error) {
    console.error('Error getting Drive access token:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getCachedDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const clearCachedDriveAccessToken = (): void => {
  cachedAccessToken = null;
};

// Database Realtime Sync
export interface SyncCallbacks {
  onCategories: (categories: Category[]) => void;
  onCards: (cards: CreditCard[]) => void;
  onTransactions: (transactions: Transaction[]) => void;
}

export const subscribeToUserData = (userId: string, callbacks: SyncCallbacks) => {
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const cardsRef = collection(db, 'users', userId, 'cards');
  const transactionsRef = collection(db, 'users', userId, 'transactions');

  const unsubCategories = onSnapshot(categoriesRef, (snap) => {
    const items: Category[] = [];
    snap.forEach((d) => items.push(d.data() as Category));
    callbacks.onCategories(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/categories`);
  });

  const unsubCards = onSnapshot(cardsRef, (snap) => {
    const items: CreditCard[] = [];
    snap.forEach((d) => items.push(d.data() as CreditCard));
    callbacks.onCards(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/cards`);
  });

  const unsubTransactions = onSnapshot(transactionsRef, (snap) => {
    const items: Transaction[] = [];
    snap.forEach((d) => items.push(d.data() as Transaction));
    // Sort transactions by date desc
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    callbacks.onTransactions(items);
  }, (error) => {
    handleFirestoreError(error, OperationType.GET, `users/${userId}/transactions`);
  });

  return () => {
    unsubCategories();
    unsubCards();
    unsubTransactions();
  };
};

// Utility to sanitize undefined values which Firestore forbids
export function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object') {
    const res: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(data as Record<string, unknown>)) {
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res as T;
  }
  return data;
}

// Batch seed initial data if remote is empty
export const initializeCloudDataIfEmpty = async (
  userId: string,
  localData: { categories: Category[]; cards: CreditCard[]; transactions: Transaction[] }
) => {
  const categoriesRef = collection(db, 'users', userId, 'categories');
  const snap = await getDocs(categoriesRef);

  if (snap.empty) {
    const batch = writeBatch(db);
    
    // Seed categories
    localData.categories.forEach((cat) => {
      const ref = doc(db, 'users', userId, 'categories', cat.id);
      batch.set(ref, sanitizeForFirestore({ ...cat, userId }));
    });

    // Seed cards
    localData.cards.forEach((card) => {
      const ref = doc(db, 'users', userId, 'cards', card.id);
      batch.set(ref, sanitizeForFirestore({ ...card, userId }));
    });

    // Seed transactions (up to 400 in initial batch)
    localData.transactions.slice(0, 400).forEach((tx) => {
      const ref = doc(db, 'users', userId, 'transactions', tx.id);
      batch.set(ref, sanitizeForFirestore({ ...tx, userId }));
    });

    await batch.commit();
  }
};

// CRUD Operations
export const saveCategoryCloud = async (userId: string, category: Category) => {
  const path = `users/${userId}/categories/${category.id}`;
  try {
    const ref = doc(db, 'users', userId, 'categories', category.id);
    await setDoc(ref, sanitizeForFirestore({ ...category, userId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteCategoryCloud = async (userId: string, categoryId: string) => {
  const path = `users/${userId}/categories/${categoryId}`;
  try {
    const ref = doc(db, 'users', userId, 'categories', categoryId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveCardCloud = async (userId: string, card: CreditCard) => {
  const path = `users/${userId}/cards/${card.id}`;
  try {
    const ref = doc(db, 'users', userId, 'cards', card.id);
    await setDoc(ref, sanitizeForFirestore({ ...card, userId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const deleteCardCloud = async (userId: string, cardId: string) => {
  const path = `users/${userId}/cards/${cardId}`;
  try {
    const ref = doc(db, 'users', userId, 'cards', cardId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const saveTransactionCloud = async (userId: string, transaction: Transaction) => {
  const path = `users/${userId}/transactions/${transaction.id}`;
  try {
    const ref = doc(db, 'users', userId, 'transactions', transaction.id);
    await setDoc(ref, sanitizeForFirestore({ ...transaction, userId }));
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
};

export const saveMultipleTransactionsCloud = async (userId: string, transactions: Transaction[]) => {
  try {
    const batch = writeBatch(db);
    transactions.forEach((tx) => {
      const ref = doc(db, 'users', userId, 'transactions', tx.id);
      batch.set(ref, sanitizeForFirestore({ ...tx, userId }));
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}/transactions`);
  }
};

export const deleteTransactionCloud = async (userId: string, transactionId: string) => {
  const path = `users/${userId}/transactions/${transactionId}`;
  try {
    const ref = doc(db, 'users', userId, 'transactions', transactionId);
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
};

export const deleteInstallmentGroupCloud = async (userId: string, groupId: string) => {
  try {
    const q = query(
      collection(db, 'users', userId, 'transactions'),
      where('installment.groupId', '==', groupId)
    );
    const snap = await getDocs(q);
    const batch = writeBatch(db);
    snap.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${userId}/transactions`);
  }
};
