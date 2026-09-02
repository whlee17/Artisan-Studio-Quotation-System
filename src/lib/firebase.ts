import { initializeApp } from 'firebase/app';
import { 
  initializeFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  getDocFromServer,
  onSnapshot, 
  deleteDoc, 
  query, 
  where,
  persistentLocalCache,
  persistentMultipleTabManager,
  setLogLevel
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Quotation, QuotationStatus, UserAccount, QuoteSettings, StandardItem, CalendarEvent, ProjectTemplate, DOrder } from '../types';
import { DEFAULT_CATEGORIES, DEFAULT_STANDARD_ITEMS, DEFAULT_SETTINGS } from '../defaults';

// Set Firebase log level to silent to suppress internal connection retry noise in offline/reconnecting mode
setLogLevel('silent');

// Helper to identify offline/network-availability errors that are handled gracefully by local fallback
export const isOfflineError = (error: any): boolean => {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  const errMsg = (error?.message || error?.toString() || '').toLowerCase();
  const errCode = (error?.code || '').toLowerCase();
  return errMsg.includes('offline') || 
         errMsg.includes('failed to get document') ||
         errMsg.includes('could not reach cloud firestore') ||
         errMsg.includes('operation could not be completed') ||
         errCode === 'unavailable' ||
         errCode === 'failed-precondition';
};

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
    })
  },
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Test Firestore backend connection gracefully
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'shared_data', 'connection_test'));
  } catch (error: any) {
    if (isOfflineError(error)) {
      console.warn("Firestore client is currently running in offline cached mode.");
    }
  }
}
testFirestoreConnection();

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

// Helper to normalize and sanitize any quotation document from Firestore/cache
export const normalizeQuotation = (data: any, docId?: string): Quotation | null => {
  if (!data || typeof data !== 'object') return null;
  const id = (typeof data.id === 'string' && data.id.trim()) || (typeof docId === 'string' && docId.trim()) || '';
  if (!id) return null; // Reject orphaned documents without a valid ID
  
  return {
    ...data,
    id,
    customerName: typeof data.customerName === 'string' ? data.customerName : '',
    phone: typeof data.phone === 'string' ? data.phone : '',
    address: typeof data.address === 'string' ? data.address : '',
    date: typeof data.date === 'string' ? data.date : '',
    status: (data.status as QuotationStatus) || 'pending',
    version: typeof data.version === 'string' ? data.version : 'v1.0',
    items: Array.isArray(data.items) ? data.items : [],
    remarks: typeof data.remarks === 'string' ? data.remarks : '',
    discount: typeof data.discount === 'number' ? data.discount : 0,
    depositPercent: typeof data.depositPercent === 'number' ? data.depositPercent : 35,
    progressPercent: typeof data.progressPercent === 'number' ? data.progressPercent : 20,
    balancePercent: typeof data.balancePercent === 'number' ? data.balancePercent : 15,
    paymentStages: Array.isArray(data.paymentStages) ? data.paymentStages : [],
    assignedTo: typeof data.assignedTo === 'string' ? data.assignedTo : '',
    designer: typeof data.designer === 'string' ? data.designer : '',
    meetingRecords: typeof data.meetingRecords === 'string' ? data.meetingRecords : '',
    draftRemarks: typeof data.draftRemarks === 'string' ? data.draftRemarks : '',
    internalNumber: typeof data.internalNumber === 'string' ? data.internalNumber : '',
    receivedDeposit: typeof data.receivedDeposit === 'number' ? data.receivedDeposit : 0,
    isLocked: Boolean(data.isLocked),
    isArchived: Boolean(data.isArchived),
    editingLock: (data.editingLock && typeof data.editingLock === 'object' && typeof data.editingLock.username === 'string' && data.editingLock.username.trim())
      ? {
          username: data.editingLock.username.trim(),
          displayName: typeof data.editingLock.displayName === 'string' ? data.editingLock.displayName : data.editingLock.username.trim(),
          lockedAt: Number(data.editingLock.lockedAt) || Date.now()
        }
      : null,
    variationOrders: Array.isArray(data.variationOrders) ? data.variationOrders : []
  };
};

// --- CRUD FOR QUOTATIONS ---
export const listenToQuotations = (role: string, username: string, callback: (quotes: Quotation[]) => void) => {
  const quotesRef = collection(db, 'quotations');
  return onSnapshot(quotesRef, (snapshot) => {
    const allQuotes: Quotation[] = [];
    snapshot.forEach((docSnap) => {
      const normalized = normalizeQuotation(docSnap.data(), docSnap.id);
      if (normalized) {
        allQuotes.push(normalized);
      }
    });
    
    // Perform filtering based on role
    let filtered: Quotation[] = [];
    if (role === 'admin') {
      filtered = allQuotes;
    } else {
      // Staff / Normal user: only see assigned quotations
      const userNorm = (username || '').trim().toLowerCase();
      filtered = allQuotes.filter(q => (q.assignedTo || '').trim().toLowerCase() === userNorm);
    }
    
    // Sort by updatedAt or ID desc
    filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    callback(filtered);
  }, (err) => {
    console.error('listenToQuotations error', err);
  });
};

export const saveQuotationToFirestore = async (quotation: Quotation) => {
  if (!quotation || !quotation.id) return;
  const docRef = doc(db, 'quotations', quotation.id.trim());
  const sanitized = sanitizeObject({
    ...quotation,
    id: quotation.id.trim(),
    updatedAt: Date.now()
  });
  await setDoc(docRef, sanitized);
};

export const deleteQuotationFromFirestore = async (id: string) => {
  if (!id || typeof id !== 'string' || !id.trim()) return;
  const docRef = doc(db, 'quotations', id.trim());
  await deleteDoc(docRef);
};

// Check if a quotation has an active edit lock by another user (default 15 minutes validity)
export const isQuoteLockActive = (
  lock?: { username: string; displayName?: string; lockedAt: number } | null | any,
  currentUsername?: string,
  maxAgeMs: number = 15 * 60 * 1000
): boolean => {
  if (!lock || typeof lock !== 'object' || typeof lock.username !== 'string' || !lock.username.trim()) {
    return false;
  }
  if (currentUsername && typeof currentUsername === 'string' && lock.username.trim().toLowerCase() === currentUsername.trim().toLowerCase()) {
    return false; // Owned by current user
  }
  const age = Date.now() - (Number(lock.lockedAt) || 0);
  return age >= 0 && age < maxAgeMs;
};

// Lock a quotation for editing by the current user
export const lockQuotationForEditing = async (
  quoteId: string, 
  user: { username: string; displayName?: string }
) => {
  try {
    if (!quoteId || typeof quoteId !== 'string' || !quoteId.trim()) return;
    const docRef = doc(db, 'quotations', quoteId.trim());
    const lockData = {
      username: (user?.username || 'user').trim(),
      displayName: (user?.displayName || user?.username || 'user').trim(),
      lockedAt: Date.now()
    };
    await setDoc(docRef, { editingLock: lockData }, { merge: true });
  } catch (error) {
    if (!isOfflineError(error)) {
      console.warn('lockQuotationForEditing warning:', error);
    }
  }
};

// Unlock a quotation when exiting editing or saving
export const unlockQuotation = async (quoteId: string) => {
  try {
    if (!quoteId || typeof quoteId !== 'string' || !quoteId.trim()) return;
    const docRef = doc(db, 'quotations', quoteId.trim());
    await setDoc(docRef, { editingLock: null }, { merge: true });
  } catch (error) {
    if (!isOfflineError(error)) {
      console.warn('unlockQuotation warning:', error);
    }
  }
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
  if (isOfflineError(error)) {
    console.warn(`Firestore is in offline/reconnecting mode for ${operationType} on '${path}'. Local cache will be used.`);
    return;
  }
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
  dataJson?: string;
  size: number;
  createdBy: string;
  isPermanent?: boolean;
  isMonthlyArchive?: boolean;
  isSmartSlimmed?: boolean;
  backupType?: 'daily_31d' | 'monthly_archive' | 'manual_31d' | 'manual_full';
  dateRange?: string;
  stats?: {
    quotationsCount: number;
    usersCount: number;
    calendarEventsCount: number;
    dOrdersCount: number;
    cleanedZeroItemsCount?: number;
    originalEstimatedSize?: number;
    savedSizePercent?: number;
  };
}

// Helper: Filter out invalid/empty/zero-value quotation items
export const isNonZeroOrValidQuoteItem = (item: any): boolean => {
  if (!item) return false;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const remark = typeof item.remark === 'string' ? item.remark.trim() : '';
  const hasQty = typeof item.quantity === 'number' && item.quantity > 0;
  const hasPrice = typeof item.unitPrice === 'number' && item.unitPrice > 0;
  const hasAmount = typeof item.amount === 'number' && item.amount > 0;

  if (!name && !remark) return false;
  // If quantity is 0 AND unitPrice is 0 AND amount is 0 and no remark, it's an empty placeholder
  if (item.quantity === 0 && item.unitPrice === 0 && (!item.amount || item.amount === 0) && !remark) {
    return false;
  }
  return true;
};

// Helper: Smart Slimming for a single Quotation
export const slimQuotationRecord = (q: any, defaultTermsText?: string): { quotation: any; cleanedItems: number } => {
  let cleanedCount = 0;
  const origItems = Array.isArray(q.items) ? q.items : [];
  const filteredItems = origItems.filter((it: any) => {
    const valid = isNonZeroOrValidQuoteItem(it);
    if (!valid) cleanedCount++;
    return valid;
  });

  // Clean variation orders items if any
  let filteredVos: any[] = [];
  if (Array.isArray(q.variationOrders)) {
    filteredVos = q.variationOrders.map((vo: any) => {
      const voItems = Array.isArray(vo.items) ? vo.items : [];
      const cleanVoItems = voItems.filter((it: any) => {
        const valid = isNonZeroOrValidQuoteItem(it);
        if (!valid) cleanedCount++;
        return valid;
      });
      return {
        ...vo,
        items: cleanVoItems
      };
    });
  }

  // Handle Terms template version mapping
  let termsVer = q.termsTemplateVersion || 'v1.0';
  let remarksText = q.remarks || '';
  
  // If remarks text is default or matches default terms text, replace with template reference to save KB
  const isDefaultTermsMatch = !remarksText || 
    remarksText.trim() === '' || 
    (defaultTermsText && remarksText.trim() === defaultTermsText.trim()) ||
    remarksText.startsWith('1. 此合約不包括單位的水火險及第三者保險。');

  if (isDefaultTermsMatch) {
    termsVer = q.termsTemplateVersion || 'v1.0';
    remarksText = ''; // Omit duplicate contract text, rendering engine resolves version v1.0
  }

  const slimmed: any = {
    ...q,
    items: filteredItems,
    remarks: remarksText,
    termsTemplateVersion: termsVer
  };

  if (filteredVos.length > 0) {
    slimmed.variationOrders = filteredVos;
  }

  return { quotation: slimmed, cleanedItems: cleanedCount };
};

export const createFirebaseBackup = async (
  createdBy: string = 'system',
  options?: {
    isMonthlyArchive?: boolean;
    isManual?: boolean;
    isSmartSlimmed?: boolean;
    backupType?: 'daily_31d' | 'monthly_archive' | 'manual_31d' | 'manual_full';
  }
): Promise<{ filename: string; backupId: string; isMonthlyArchive: boolean; size: number; isSmartSlimmed: boolean }> => {
  try {
    const isMonthlyArchive = options?.isMonthlyArchive === true || options?.backupType === 'monthly_archive';
    const isFullManual = options?.backupType === 'manual_full';
    const isSmartSlimmed = options?.isSmartSlimmed !== false; // default to true for high efficiency
    const now = Date.now();
    const thirtyOneDaysAgo = now - 31 * 24 * 60 * 60 * 1000;

    const collectionsToBackup = [
      'users',
      'quotations',
      'shared_data',
      'calendar_events',
      'project_templates',
      'd_orders'
    ];

    const backupData: Record<string, any[]> = {};
    let quotationsCount = 0;
    let usersCount = 0;
    let calendarEventsCount = 0;
    let dOrdersCount = 0;
    let totalCleanedZeroItems = 0;

    // Fetch shared settings to compare default terms
    let defaultTermsText = '';
    try {
      const setDoc = await getDoc(doc(db, 'shared_data', 'settings'));
      if (setDoc.exists()) {
        defaultTermsText = setDoc.data()?.defaultTerms || '';
      }
    } catch (_) {}

    for (const colName of collectionsToBackup) {
      const colRef = collection(db, colName);
      const snapshot = await getDocs(colRef);
      const docs: any[] = [];

      snapshot.forEach((docSnap) => {
        let docData = docSnap.data();
        if (!docData) return;

        // Apply 31-day scope filtering for dynamic collections unless it's a Monthly Archive or Full Manual Export
        if (!isMonthlyArchive && !isFullManual) {
          if (colName === 'quotations') {
            const q = docData as any;
            const quoteTimestamp = q.updatedAt || (q.date ? new Date(q.date).getTime() : 0);
            const isRecent = quoteTimestamp >= thirtyOneDaysAgo;
            const isActive = q.status && q.status !== 'completed' && q.status !== 'cancelled';
            // Only keep if created/updated within 31 days or currently actively in-progress
            if (!isRecent && !isActive) {
              return;
            }
          } else if (colName === 'calendar_events') {
            const ev = docData as any;
            const eventTimestamp = ev.createdAt || ev.updatedAt || (ev.date ? new Date(ev.date).getTime() : 0);
            const isRecentOrFuture = eventTimestamp >= (thirtyOneDaysAgo - 24 * 3600 * 1000);
            if (!isRecentOrFuture) {
              return;
            }
          } else if (colName === 'd_orders') {
            const d = docData as any;
            const dTimestamp = d.updatedAt || d.createdAt || 0;
            const isRecent = dTimestamp >= thirtyOneDaysAgo;
            const isOngoing = !d.isCompleted;
            if (!isRecent && !isOngoing) {
              return;
            }
          }
        }

        // VO Sanitization & normalization for quotations
        if (colName === 'quotations') {
          let q = docData as any;
          const hasVos = q.variationOrders && Array.isArray(q.variationOrders) && q.variationOrders.length > 0;
          const hasLegacy = q.hasVO || (q.voItems && Array.isArray(q.voItems) && q.voItems.length > 0);
          if (!hasVos && hasLegacy) {
            const vo1 = {
              id: 'vo-1',
              title: q.voTitle || '後加工程 1',
              items: q.voItems || [],
              paymentStages: q.voPaymentStages || [
                { name: '後加第一期', percent: 100, remark: '後加工程完工驗收' }
              ],
              remarks: q.voRemarks || '',
              discount: q.voDiscount || 0,
              createdAt: q.updatedAt || Date.now()
            };
            q = {
              ...q,
              variationOrders: [vo1]
            };
          } else if (hasVos) {
            const firstVo = q.variationOrders[0];
            q = {
              ...q,
              hasVO: q.hasVO ?? true,
              voItems: q.voItems || firstVo.items,
              voPaymentStages: q.voPaymentStages || firstVo.paymentStages,
              voRemarks: q.voRemarks || firstVo.remarks,
              voDiscount: q.voDiscount || firstVo.discount,
              voTitle: q.voTitle || firstVo.title,
            };
          }

          if (isSmartSlimmed) {
            const { quotation: slimmedQ, cleanedItems } = slimQuotationRecord(q, defaultTermsText);
            docData = slimmedQ;
            totalCleanedZeroItems += cleanedItems;
          } else {
            docData = q;
          }
          quotationsCount++;
        } else if (colName === 'users') {
          // Centralize standardItems: Strip redundant huge per-user standardItems dictionary
          if (isSmartSlimmed && docData.profile?.standardItems) {
            const cleanProfile = { ...docData.profile };
            delete cleanProfile.standardItems; // shared_data.library serves as global standard library
            docData = {
              ...docData,
              profile: cleanProfile
            };
          }
          usersCount++;
        } else if (colName === 'calendar_events') {
          calendarEventsCount++;
        } else if (colName === 'd_orders') {
          dOrdersCount++;
        }

        docs.push({
          id: docSnap.id,
          data: docData
        });
      });

      backupData[colName] = docs;
    }

    const backupStats = {
      quotationsCount,
      usersCount,
      calendarEventsCount,
      dOrdersCount,
      cleanedZeroItemsCount: totalCleanedZeroItems
    };

    // Metadata payload wrapper
    const fullBackupPayload = {
      version: '3.2',
      backupType: isMonthlyArchive ? 'monthly_archive' : (options?.backupType || 'daily_31d'),
      isMonthlyArchive,
      isPermanent: isMonthlyArchive,
      isSmartSlimmed,
      dateRange: isMonthlyArchive ? 'full_monthly_archive' : 'last_31_days',
      createdAt: now,
      createdAtIso: new Date(now).toISOString(),
      createdBy,
      stats: backupStats,
      ...backupData
    };

    // Use compact JSON formatting
    const dataJson = JSON.stringify(fullBackupPayload);
    const backupId = isMonthlyArchive ? `arch_${now}` : `bk_${now}`;
    
    // Formatting filename
    const dateStamp = new Date(now).toISOString().split('T')[0];
    const timeStamp = new Date(now).toTimeString().split(' ')[0].replace(/:/g, '-');
    const filename = isMonthlyArchive 
      ? `monthly_archive_${dateStamp}${isSmartSlimmed ? '_slim' : ''}.json`
      : `backup_31d_${dateStamp}_${timeStamp}${isSmartSlimmed ? '_slim' : ''}.json`;

    // 1. Save lightweight header doc in backups collection (saves read/download quota for backups listing)
    await setDoc(doc(db, 'backups', backupId), {
      id: backupId,
      filename,
      createdAt: now,
      size: dataJson.length,
      createdBy,
      isPermanent: isMonthlyArchive,
      isMonthlyArchive,
      isSmartSlimmed,
      backupType: isMonthlyArchive ? 'monthly_archive' : (options?.backupType || 'daily_31d'),
      dateRange: isMonthlyArchive ? 'full_monthly_archive' : 'last_31_days',
      stats: backupStats
    });

    // 2. Save JSON payload in a separate subdocument, loaded only on restoration or download
    await setDoc(doc(db, 'backups', backupId, 'payload', 'data'), {
      dataJson
    });

    // Run auto-cleanup for rolling backups (permanent monthly archives are protected)
    await cleanupOldBackups().catch(err => console.error('Cleanup old backups failed:', err));

    return {
      filename,
      backupId,
      isMonthlyArchive,
      size: dataJson.length,
      isSmartSlimmed
    };
  } catch (error) {
    console.error('Failed to create backup:', error);
    throw error;
  }
};

export const getBackupDataJson = async (backupId: string): Promise<string> => {
  const rootDoc = await getDoc(doc(db, 'backups', backupId));
  if (!rootDoc.exists()) {
    throw new Error('找不到指定的備份檔案');
  }
  const rootData = rootDoc.data();
  if (rootData?.dataJson) {
    return rootData.dataJson;
  }

  const payloadDoc = await getDoc(doc(db, 'backups', backupId, 'payload', 'data'));
  if (!payloadDoc.exists()) {
    throw new Error('備份數據不存在或已損毀');
  }
  return payloadDoc.data()?.dataJson || '';
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

    const docsToRestore = backupData[colName];
    if (!Array.isArray(docsToRestore)) continue;

    // Delete existing documents in this collection for a clean restore
    const colRef = collection(db, colName);
    const currentSnapshot = await getDocs(colRef);
    
    for (const docSnap of currentSnapshot.docs) {
      await deleteDoc(doc(db, colName, docSnap.id));
    }

    // Restore documents directly from JSON structure
    for (const d of docsToRestore) {
      if (!d) continue;
      const docId = d.id || (typeof d === 'object' && d.username ? d.username : undefined);
      const docPayload = d.data !== undefined ? d.data : d;
      
      if (docId && docPayload) {
        await setDoc(doc(db, colName, docId), docPayload);
      }
    }
  }
};

export const restoreFirebaseBackup = async (backupId: string): Promise<void> => {
  try {
    const dataJson = await getBackupDataJson(backupId);
    if (!dataJson) {
      throw new Error('無法讀取備份資料');
    }
    const backupData = JSON.parse(dataJson);
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
      const data = docSnap.data();
      backups.push({
        id: docSnap.id,
        filename: data.filename,
        createdAt: data.createdAt,
        size: data.size || (data.dataJson ? data.dataJson.length : 0),
        createdBy: data.createdBy,
        isPermanent: data.isPermanent || data.isMonthlyArchive || data.filename?.startsWith('monthly_archive') || data.filename?.startsWith('archive_'),
        isMonthlyArchive: data.isMonthlyArchive || data.filename?.startsWith('monthly_archive') || data.filename?.startsWith('archive_'),
        isSmartSlimmed: data.isSmartSlimmed || data.filename?.includes('_slim'),
        backupType: data.backupType,
        dateRange: data.dateRange,
        stats: data.stats,
        dataJson: data.dataJson
      });
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
    await deleteDoc(doc(db, 'backups', id, 'payload', 'data')).catch(() => {});
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
      
      // Monthly Archive is permanently preserved! Never auto-delete
      const isPermanent = data.isPermanent === true || 
                          data.isMonthlyArchive === true || 
                          (data.filename && (data.filename.startsWith('monthly_archive') || data.filename.startsWith('archive_')));

      if (isPermanent) {
        continue;
      }

      // Rolling regular 31-day backups older than 7 days are cleaned up
      if (data.createdAt && data.createdAt < sevenDaysAgo) {
        await deleteDoc(doc(db, 'backups', docSnap.id, 'payload', 'data')).catch(() => {});
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

// --- ONE-TIME FETCH HELPERS FOR OPTIMIZED / PERIODIC SYNC ---

export const fetchUsers = async (): Promise<UserAccount[]> => {
  const usersRef = collection(db, 'users');
  const snapshot = await getDocs(usersRef);
  const users: UserAccount[] = [];
  snapshot.forEach((docSnap) => {
    users.push(docSnap.data() as UserAccount);
  });
  users.sort((a, b) => {
    if (a.username === 'whlee') return -1;
    if (b.username === 'whlee') return 1;
    return a.username.localeCompare(b.username);
  });
  return users;
};

export const fetchCurrentUser = async (username: string): Promise<UserAccount | null> => {
  const normUsername = username.trim().toLowerCase();
  const userRef = doc(db, 'users', normUsername);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    return snapshot.data() as UserAccount;
  }
  return null;
};

export const fetchQuotations = async (role: string, username: string): Promise<Quotation[]> => {
  const quotesRef = collection(db, 'quotations');
  const snapshot = await getDocs(quotesRef);
  const allQuotes: Quotation[] = [];
  snapshot.forEach((docSnap) => {
    const normalized = normalizeQuotation(docSnap.data(), docSnap.id);
    if (normalized) {
      allQuotes.push(normalized);
    }
  });
  let filtered: Quotation[] = [];
  if (role === 'admin') {
    filtered = allQuotes;
  } else {
    const userNorm = (username || '').trim().toLowerCase();
    filtered = allQuotes.filter(q => (q.assignedTo || '').trim().toLowerCase() === userNorm);
  }
  filtered.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return filtered;
};

export const fetchSharedData = async () => {
  const docRefs = {
    categories: doc(db, 'shared_data', 'categories'),
    library: doc(db, 'shared_data', 'library'),
    settings: doc(db, 'shared_data', 'settings'),
  };
  const [catSnap, libSnap, setSnap] = await Promise.all([
    getDoc(docRefs.categories),
    getDoc(docRefs.library),
    getDoc(docRefs.settings)
  ]);
  const categories = catSnap.exists() ? (catSnap.data()?.list || DEFAULT_CATEGORIES) : DEFAULT_CATEGORIES;
  const library = libSnap.exists() ? (libSnap.data()?.data || DEFAULT_STANDARD_ITEMS) : DEFAULT_STANDARD_ITEMS;
  const categoryOrder = libSnap.exists() ? (libSnap.data()?.categoryOrder || DEFAULT_CATEGORIES) : DEFAULT_CATEGORIES;
  const settings = setSnap.exists() ? { ...DEFAULT_SETTINGS, ...setSnap.data() } : DEFAULT_SETTINGS;
  return { categories, library, categoryOrder, settings: settings as QuoteSettings };
};

export const fetchCalendarEvents = async (): Promise<CalendarEvent[]> => {
  const eventsRef = collection(db, 'calendar_events');
  const snapshot = await getDocs(eventsRef);
  const events: CalendarEvent[] = [];
  snapshot.forEach((docSnap) => {
    events.push(docSnap.data() as CalendarEvent);
  });
  events.sort((a, b) => {
    const dateA = a.date || '';
    const dateB = b.date || '';
    const dateCompare = dateA.localeCompare(dateB);
    if (dateCompare !== 0) return dateCompare;
    const timeA = a.time || '';
    const timeB = b.time || '';
    return timeA.localeCompare(timeB);
  });
  return events;
};

export const fetchProjectTemplates = async (): Promise<ProjectTemplate[]> => {
  const templatesRef = collection(db, 'project_templates');
  const snapshot = await getDocs(templatesRef);
  const templates: ProjectTemplate[] = [];
  snapshot.forEach((docSnap) => {
    templates.push(docSnap.data() as ProjectTemplate);
  });
  templates.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return templates;
};

export const fetchDOrders = async (): Promise<DOrder[]> => {
  const ordersRef = collection(db, 'd_orders');
  const snapshot = await getDocs(ordersRef);
  const orders: DOrder[] = [];
  snapshot.forEach((docSnap) => {
    orders.push(docSnap.data() as DOrder);
  });
  orders.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return orders;
};

export const fetchBackups = async (): Promise<FirebaseBackup[]> => {
  const backupsRef = collection(db, 'backups');
  const snapshot = await getDocs(backupsRef);
  const backups: FirebaseBackup[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    backups.push({
      id: docSnap.id,
      filename: data.filename,
      createdAt: data.createdAt,
      size: data.size || (data.dataJson ? data.dataJson.length : 0),
      createdBy: data.createdBy,
      dataJson: data.dataJson
    });
  });
  backups.sort((a, b) => b.createdAt - a.createdAt);
  return backups;
};



