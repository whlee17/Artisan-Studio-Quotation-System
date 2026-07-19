import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  onSnapshot, 
  deleteDoc, 
  query, 
  where,
  persistentLocalCache,
  persistentMultipleTabManager
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Quotation, UserAccount, QuoteSettings, StandardItem, CalendarEvent, ProjectTemplate, DOrder } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_STANDARD_ITEMS, DEFAULT_SETTINGS } from '../defaults';

// Recursive object sanitizer to strip undefined fields (which Firestore setDoc doesn't accept)
export const sanitizeObject = <T>(obj: T): T => {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item)) as any;
  }
  if (typeof obj === 'object') {
    const newObj: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        newObj[key] = sanitizeObject(val);
      }
    }
    return newObj as T;
  }
  return obj;
};

// Initialize Firebase with the config and custom firestoreDatabaseId
const app = initializeApp(firebaseConfig);

export const db = initializeFirestore(
  app,
  {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager()
    }),
    experimentalForceLongPolling: true
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Helper to identify offline/network-availability errors that are handled gracefully by local fallback
const isOfflineError = (error: any): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const errMsg = error?.message || error?.toString() || '';
  const errCode = error?.code || '';
  return errMsg.toLowerCase().includes('offline') || 
         errMsg.toLowerCase().includes('failed to get document') ||
         errCode === 'unavailable' ||
         errCode === 'failed-precondition';
};

// Ensure default Admin users exist in Firestore
export const initDefaultAdmin = async () => {
  try {
    const adminsToInit = [
      { username: 'whlee', password: '1122', displayName: '管理員 whlee' },
      { username: 'king', password: '0608', displayName: '管理員 king' },
      { username: 'mat', password: '0608', displayName: '管理員 mat' }
    ];

    for (const admin of adminsToInit) {
      const userRef = doc(db, 'users', admin.username);
      const userDoc = await getDoc(userRef);
      if (!userDoc.exists()) {
        await setDoc(userRef, {
          username: admin.username,
          password: admin.password,
          role: 'admin',
          displayName: admin.displayName,
          createdAt: new Date().toISOString()
        });
        console.log(`Default admin ${admin.username} created in Firestore`);
      }
    }
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.log('Skipping default admin initialization: client is currently offline/cached mode.');
    } else {
      console.error('Error initializing default admin in Firestore:', error);
    }
  }
};

// Ensure default shared config exists in Firestore
export const initSharedDataIfEmpty = async (
  defaultCategories: string[],
  defaultLibrary: Record<string, StandardItem[]>,
  defaultSettings: QuoteSettings
) => {
  try {
    // 1. Categories
    const catRef = doc(db, 'shared_data', 'categories');
    const catDoc = await getDoc(catRef);
    if (!catDoc.exists()) {
      await setDoc(catRef, { list: defaultCategories });
    }

    // 2. Library
    const libRef = doc(db, 'shared_data', 'library');
    const libDoc = await getDoc(libRef);
    if (!libDoc.exists()) {
      await setDoc(libRef, { data: defaultLibrary });
    }

    // 3. Settings
    const setRef = doc(db, 'shared_data', 'settings');
    const setDocVal = await getDoc(setRef);
    if (!setDocVal.exists()) {
      await setDoc(setRef, defaultSettings);
    }
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.log('Skipping shared data initialization: client is currently offline/cached mode.');
    } else {
      console.error('Error initializing shared data in Firestore:', error);
    }
  }
};

// Auth helper
export const authenticateFirestoreUser = async (username: string, passwordText: string): Promise<UserAccount | null> => {
  const normUsername = username.trim().toLowerCase();
  
  try {
    // Ensure default admins exist first
    if (normUsername === 'whlee' || normUsername === 'king' || normUsername === 'mat') {
      await initDefaultAdmin().catch(err => console.warn('Skipped admin check:', err));
    }
    
    const userRef = doc(db, 'users', normUsername);
    const userDoc = await getDoc(userRef);
    if (userDoc.exists()) {
      const userData = userDoc.data() as UserAccount;
      if (userData.password === passwordText) {
        return userData;
      }
    }
  } catch (error: any) {
    const isOffline = isOfflineError(error);
    
    if (isOffline) {
      console.log('Client is offline, validating credentials against local and offline fallback.');
      
      // Fallback 1: Pre-seeded admin whlee / 1122, king / 0608, mat / 0608
      if (normUsername === 'whlee' && passwordText === '1122') {
        return {
          username: 'whlee',
          password: '1122',
          role: 'admin',
          displayName: '管理員 whlee (離線登入)',
          createdAt: new Date().toISOString()
        };
      }
      if (normUsername === 'king' && passwordText === '0608') {
        return {
          username: 'king',
          password: '0608',
          role: 'admin',
          displayName: '管理員 king (離線登入)',
          createdAt: new Date().toISOString()
        };
      }
      if (normUsername === 'mat' && passwordText === '0608') {
        return {
          username: 'mat',
          password: '0608',
          role: 'admin',
          displayName: '管理員 mat (離線登入)',
          createdAt: new Date().toISOString()
        };
      }
      
      // Fallback 2: Check locally cached accounts
      try {
        const cachedAccountsStr = localStorage.getItem('artisan_accounts');
        if (cachedAccountsStr) {
          const cachedAccounts = JSON.parse(cachedAccountsStr);
          const matchedUser = cachedAccounts.find((a: any) => 
            a.username.trim().toLowerCase() === normUsername && 
            a.password === passwordText
          );
          if (matchedUser) {
            return {
              username: matchedUser.username,
              password: matchedUser.password,
              role: matchedUser.role,
              displayName: `${matchedUser.displayName || matchedUser.username} (離線登入)`,
              createdAt: matchedUser.createdAt || new Date().toISOString()
            };
          }
        }
      } catch (localErr) {
        console.warn('Local accounts fallback check failed:', localErr);
      }
    } else {
      console.error('authenticateFirestoreUser Firestore error:', error);
    }
    
    // If not offline error or login failed, rethrow the error so UI can display it
    throw error;
  }
  return null;
};

// --- CRUD FOR USER ACCOUNTS ---
export const listenToUsers = (callback: (users: UserAccount[]) => void) => {
  const usersRef = collection(db, 'users');
  return onSnapshot(usersRef, (snapshot) => {
    const users: UserAccount[] = [];
    snapshot.forEach((doc) => {
      users.push(doc.data() as UserAccount);
    });
    // Sort so admin/whlee is at top
    users.sort((a, b) => {
      if (a.username === 'whlee') return -1;
      if (b.username === 'whlee') return 1;
      return a.username.localeCompare(b.username);
    });
    callback(users);
  }, (err) => {
    console.error('listenToUsers error', err);
  });
};

export const listenToCurrentUser = (username: string, callback: (user: UserAccount) => void) => {
  const normUsername = username.trim().toLowerCase();
  const userRef = doc(db, 'users', normUsername);
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as UserAccount);
    }
  });
};

export const saveUserAccount = async (account: UserAccount) => {
  const usernameNorm = account.username.trim().toLowerCase();
  const userRef = doc(db, 'users', usernameNorm);
  const sanitized = sanitizeObject({
    ...account,
    username: account.username.trim() // preserve original casing for display
  });
  await setDoc(userRef, sanitized);
};

export const deleteUserAccount = async (username: string) => {
  const usernameNorm = username.trim().toLowerCase();
  const userRef = doc(db, 'users', usernameNorm);
  await deleteDoc(userRef);
};

// --- CRUD FOR QUOTATIONS ---
export const listenToQuotations = (role: string, username: string, callback: (quotes: Quotation[]) => void) => {
  const quotesRef = collection(db, 'quotations');
  return onSnapshot(quotesRef, (snapshot) => {
    const allQuotes: Quotation[] = [];
    snapshot.forEach((doc) => {
      allQuotes.push(doc.data() as Quotation);
    });
    
    // Perform filtering based on role
    let filtered: Quotation[] = [];
    if (role === 'admin') {
      filtered = allQuotes;
    } else {
      // Staff / Normal user: only see assigned quotations
      filtered = allQuotes.filter(q => q.assignedTo?.trim().toLowerCase() === username.trim().toLowerCase());
    }
    
    // Sort by updatedAt or ID desc
    filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(filtered);
  }, (err) => {
    console.error('listenToQuotations error', err);
  });
};

export const saveQuotationToFirestore = async (quotation: Quotation) => {
  const docRef = doc(db, 'quotations', quotation.id);
  const sanitized = sanitizeObject({
    ...quotation,
    updatedAt: Date.now()
  });
  await setDoc(docRef, sanitized);
};

export const deleteQuotationFromFirestore = async (id: string) => {
  const docRef = doc(db, 'quotations', id);
  await deleteDoc(docRef);
};

// --- SHARED DATA REALTIME SYNC ---
export const listenToSharedData = (
  callback: (data: { categories: string[]; library: Record<string, StandardItem[]>; categoryOrder: string[]; settings: QuoteSettings }) => void
) => {
  const docRefs = {
    categories: doc(db, 'shared_data', 'categories'),
    library: doc(db, 'shared_data', 'library'),
    settings: doc(db, 'shared_data', 'settings'),
  };

  let categories: string[] = [];
  let library: Record<string, StandardItem[]> = {};
  let categoryOrder: string[] = [];
  let settings: any = {};

  let catEmitted = false;
  let libEmitted = false;
  let setEmitted = false;

  const triggerIfComplete = () => {
    if (catEmitted && libEmitted && setEmitted) {
      callback({
        categories,
        library,
        categoryOrder,
        settings: settings as QuoteSettings
      });
    }
  };

  const unsubCat = onSnapshot(docRefs.categories, (snapshot) => {
    if (snapshot.exists()) {
      categories = snapshot.data().list || [];
    } else {
      categories = DEFAULT_CATEGORIES;
    }
    catEmitted = true;
    triggerIfComplete();
  }, (err) => {
    console.error('onSnapshot categories error', err);
    categories = DEFAULT_CATEGORIES;
    catEmitted = true; // don't block
    triggerIfComplete();
  });

  const unsubLib = onSnapshot(docRefs.library, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      library = data.data || {};
      categoryOrder = data.categoryOrder || [];
    } else {
      library = DEFAULT_STANDARD_ITEMS;
      categoryOrder = DEFAULT_CATEGORIES;
    }
    libEmitted = true;
    triggerIfComplete();
  }, (err) => {
    console.error('onSnapshot library error', err);
    library = DEFAULT_STANDARD_ITEMS;
    categoryOrder = DEFAULT_CATEGORIES;
    libEmitted = true; // don't block
    triggerIfComplete();
  });

  const unsubSet = onSnapshot(docRefs.settings, (snapshot) => {
    if (snapshot.exists()) {
      settings = { ...DEFAULT_SETTINGS, ...snapshot.data() };
    } else {
      settings = DEFAULT_SETTINGS;
    }
    setEmitted = true;
    triggerIfComplete();
  }, (err) => {
    console.error('onSnapshot settings error', err);
    settings = DEFAULT_SETTINGS;
    setEmitted = true; // don't block
    triggerIfComplete();
  });

  // Return a single unsubscribe function that unsubscribes from all three listeners
  return () => {
    unsubCat();
    unsubLib();
    unsubSet();
  };
};

export const saveSharedCategories = async (list: string[]) => {
  const docRef = doc(db, 'shared_data', 'categories');
  const sanitized = sanitizeObject({ list });
  await setDoc(docRef, sanitized);
};

export const saveSharedLibrary = async (data: Record<string, StandardItem[]>, categoryOrder: string[]) => {
  const docRef = doc(db, 'shared_data', 'library');
  const sanitized = sanitizeObject({ data, categoryOrder });
  await setDoc(docRef, sanitized);
};

export const saveSharedSettings = async (settings: QuoteSettings) => {
  const docRef = doc(db, 'shared_data', 'settings');
  const sanitized = sanitizeObject(settings);
  await setDoc(docRef, sanitized);
};

// --- ERROR HANDLING & SANITIZATION UTILITIES FOR FIRESTORE ---

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
      userId: 'whlee-auth-id',
      email: 'whlee17@gmail.com',
      emailVerified: true,
      isAnonymous: false,
      tenantId: null,
      providerInfo: []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- CRUD FOR CALENDAR EVENTS ---
export const listenToCalendarEvents = (callback: (events: CalendarEvent[]) => void) => {
  const eventsRef = collection(db, 'calendar_events');
  return onSnapshot(eventsRef, (snapshot) => {
    const events: CalendarEvent[] = [];
    snapshot.forEach((doc) => {
      events.push(doc.data() as CalendarEvent);
    });
    // Sort by date then time safely
    events.sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      const dateCompare = dateA.localeCompare(dateB);
      if (dateCompare !== 0) return dateCompare;
      
      const timeA = a.time || '';
      const timeB = b.time || '';
      return timeA.localeCompare(timeB);
    });
    callback(events);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'calendar_events');
  });
};

export const saveCalendarEventToFirestore = async (event: CalendarEvent) => {
  const path = `calendar_events/${event.id}`;
  try {
    const docRef = doc(db, 'calendar_events', event.id);
    const sanitized = sanitizeObject({
      ...event,
      updatedAt: Date.now()
    });
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteCalendarEventFromFirestore = async (id: string) => {
  const path = `calendar_events/${id}`;
  try {
    const docRef = doc(db, 'calendar_events', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// --- CRUD FOR PROJECT TEMPLATES ---
export const listenToProjectTemplates = (callback: (templates: ProjectTemplate[]) => void) => {
  const templatesRef = collection(db, 'project_templates');
  return onSnapshot(templatesRef, (snapshot) => {
    const templates: ProjectTemplate[] = [];
    snapshot.forEach((doc) => {
      templates.push(doc.data() as ProjectTemplate);
    });
    templates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(templates);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'project_templates');
  });
};

export const saveProjectTemplateToFirestore = async (template: ProjectTemplate) => {
  const path = `project_templates/${template.id}`;
  try {
    const docRef = doc(db, 'project_templates', template.id);
    const sanitized = sanitizeObject({
      ...template,
      updatedAt: Date.now()
    });
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteProjectTemplateFromFirestore = async (id: string) => {
  const path = `project_templates/${id}`;
  try {
    const docRef = doc(db, 'project_templates', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// --- CRUD FOR D-ORDER PROGRESS TRACKER (D單進度表) ---
export const listenToDOrders = (callback: (orders: DOrder[]) => void) => {
  const ordersRef = collection(db, 'd_orders');
  return onSnapshot(ordersRef, (snapshot) => {
    const orders: DOrder[] = [];
    snapshot.forEach((doc) => {
      orders.push(doc.data() as DOrder);
    });
    // Sort by updatedAt desc
    orders.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(orders);
  }, (err) => {
    handleFirestoreError(err, OperationType.GET, 'd_orders');
  });
};

export const saveDOrderToFirestore = async (order: DOrder) => {
  const path = `d_orders/${order.id}`;
  try {
    const docRef = doc(db, 'd_orders', order.id);
    const sanitized = sanitizeObject({
      ...order,
      updatedAt: Date.now()
    });
    await setDoc(docRef, sanitized);
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, path);
  }
};

export const deleteDOrderFromFirestore = async (id: string) => {
  const path = `d_orders/${id}`;
  try {
    const docRef = doc(db, 'd_orders', id);
    await deleteDoc(docRef);
  } catch (err) {
    handleFirestoreError(err, OperationType.DELETE, path);
  }
};

// --- FIREBASE BACKUP MANAGEMENT ---

export interface FirebaseBackup {
  id: string;
  filename: string;
  createdAt: number;
  dataJson: string;
  size: number;
  createdBy: string;
}

export const createFirebaseBackup = async (createdBy: string = 'system'): Promise<string> => {
  try {
    const collectionsToBackup = [
      'users',
      'quotations',
      'shared_data',
      'calendar_events',
      'project_templates',
      'd_orders'
    ];

    const backupData: Record<string, any[]> = {};

    for (const colName of collectionsToBackup) {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docs: any[] = [];
      snapshot.forEach((docSnap) => {
        docs.push({
          id: docSnap.id,
          data: docSnap.data()
        });
      });
      backupData[colName] = docs;
    }

    const dataJson = JSON.stringify(backupData);
    const backupId = `bk_${Date.now()}`;
    const filename = `backup_${new Date().toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-')}.json`;

    await setDoc(doc(db, 'backups', backupId), {
      id: backupId,
      filename,
      createdAt: Date.now(),
      dataJson,
      size: dataJson.length,
      createdBy
    });

    // Also run auto-cleanup as part of creation to keep it clean
    await cleanupOldBackups().catch(err => console.error('Cleanup old backups failed:', err));

    return filename;
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
};

export const restoreFirebaseBackupDataDirectly = async (backupData: any): Promise<void> => {
  const collectionsToRestore = [
    'users',
    'quotations',
    'shared_data',
    'calendar_events',
    'project_templates',
    'd_orders'
  ];

  for (const colName of collectionsToRestore) {
    if (!backupData[colName]) continue;

    // First, get all current documents in this collection
    const colRef = collection(db, colName);
    const currentSnapshot = await getDocs(colRef);
    
    // Delete existing documents in this collection to make it a clean restore
    for (const docSnap of currentSnapshot.docs) {
      await deleteDoc(doc(db, colName, docSnap.id));
    }

    // Restore documents
    const docsToRestore = backupData[colName];
    for (const d of docsToRestore) {
      await setDoc(doc(db, colName, d.id), d.data);
    }
  }
};

export const restoreFirebaseBackup = async (backupId: string): Promise<void> => {
  try {
    const backupDoc = await getDoc(doc(db, 'backups', backupId));
    if (!backupDoc.exists()) {
      throw new Error('找不到指定的備份檔案');
    }

    const backup = backupDoc.data() as FirebaseBackup;
    const backupData = JSON.parse(backup.dataJson);
    await restoreFirebaseBackupDataDirectly(backupData);
  } catch (error) {
    console.error('Failed to restore backup:', error);
    throw error;
  }
};

export const listenToBackups = (callback: (backups: FirebaseBackup[]) => void) => {
  const backupsRef = collection(db, 'backups');
  return onSnapshot(backupsRef, (snapshot) => {
    const backups: FirebaseBackup[] = [];
    snapshot.forEach((docSnap) => {
      backups.push(docSnap.data() as FirebaseBackup);
    });
    // Sort by createdAt desc
    backups.sort((a, b) => b.createdAt - a.createdAt);
    callback(backups);
  }, (err) => {
    console.error('listenToBackups error', err);
  });
};

export const deleteFirebaseBackup = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, 'backups', id));
  } catch (error) {
    console.error('Failed to delete backup:', error);
    throw error;
  }
};

export const cleanupOldBackups = async (): Promise<number> => {
  try {
    const backupsRef = collection(db, 'backups');
    const snapshot = await getDocs(backupsRef);
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    let deleteCount = 0;

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      if (data.createdAt && data.createdAt < sevenDaysAgo) {
        await deleteDoc(doc(db, 'backups', docSnap.id));
        deleteCount++;
      }
    }
    return deleteCount;
  } catch (error) {
    console.error('Failed to cleanup old backups:', error);
    throw error;
  }
};


