import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export const saveStandardLibraryToFirebase = async (data: any, categoryOrder: string[]) => {
  try {
    await setDoc(doc(db, 'shared_data', 'library'), {
      data,
      categoryOrder
    });
  } catch (error) {
    console.error('Error saving library:', error);
    throw error;
  }
};

export const loadStandardLibraryFromFirebase = async () => {
  try {
    const docRef = doc(db, 'shared_data', 'library');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error loading library:', error);
    throw error;
  }
};
