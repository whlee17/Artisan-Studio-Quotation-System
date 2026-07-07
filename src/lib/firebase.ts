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
import { Quotation, UserAccount, QuoteSettings, StandardItem } from '../types';

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

export const saveUserAccount = async (account: UserAccount) => {
  const usernameNorm = account.username.trim().toLowerCase();
  const userRef = doc(db, 'users', usernameNorm);
  await setDoc(userRef, {
    ...account,
    username: account.username.trim() // preserve original casing for display
  });
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
  await setDoc(docRef, {
    ...quotation,
    updatedAt: Date.now()
  });
};

export const deleteQuotationFromFirestore = async (id: string) => {
  const docRef = doc(db, 'quotations', id);
  await deleteDoc(docRef);
};

// --- SHARED DATA REALTIME SYNC ---
export const listenToSharedData = (
  callback: (data: { categories: string[]; library: Record<string, StandardItem[]>; settings: QuoteSettings }) => void
) => {
  const docRefs = {
    categories: doc(db, 'shared_data', 'categories'),
    library: doc(db, 'shared_data', 'library'),
    settings: doc(db, 'shared_data', 'settings'),
  };

  let categories: string[] | null = null;
  let library: Record<string, StandardItem[]> | null = null;
  let settings: QuoteSettings | null = null;

  const triggerIfComplete = () => {
    if (categories && library && settings) {
      callback({ categories, library, settings });
    }
  };

  const unsubCat = onSnapshot(docRefs.categories, (snapshot) => {
    if (snapshot.exists()) {
      categories = snapshot.data().list || [];
      triggerIfComplete();
    }
  });

  const unsubLib = onSnapshot(docRefs.library, (snapshot) => {
    if (snapshot.exists()) {
      library = snapshot.data().data || {};
      triggerIfComplete();
    }
  });

  const unsubSet = onSnapshot(docRefs.settings, (snapshot) => {
    if (snapshot.exists()) {
      settings = snapshot.data() as QuoteSettings;
      triggerIfComplete();
    }
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
  await setDoc(docRef, { list });
};

export const saveSharedLibrary = async (data: Record<string, StandardItem[]>) => {
  const docRef = doc(db, 'shared_data', 'library');
  await setDoc(docRef, { data });
};

export const saveSharedSettings = async (settings: QuoteSettings) => {
  const docRef = doc(db, 'shared_data', 'settings');
  await setDoc(docRef, settings);
};
