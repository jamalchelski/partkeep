import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Part, StockLog } from './types';
import { initialParts } from './data';

const partsCollectionRef = collection(db, 'parts');

// Helper to convert Firestore timestamps to Date objects
const convertTimestamps = (data: any) => {
  const convertedData = { ...data };
  for (const key in convertedData) {
    if (convertedData[key] instanceof Timestamp) {
      convertedData[key] = convertedData[key].toDate();
    }
    if (key === 'stockHistory' && Array.isArray(convertedData[key])) {
       convertedData[key] = convertedData[key].map(log => ({
           ...log,
           date: log.date instanceof Timestamp ? log.date.toDate() : log.date
       }))
    }
  }
  return convertedData;
};


// One-time seeding of the database if it's empty
export const seedDatabase = async () => {
  const snapshot = await getDocs(partsCollectionRef);
  if (snapshot.empty) {
    console.log('Database is empty, seeding with initial data...');
    const batch = writeBatch(db);
    initialParts.forEach((part) => {
      const docRef = doc(partsCollectionRef); // Firestore will generate the ID
      batch.set(docRef, {
        ...part,
        id: docRef.id, // we'll update this post-creation if needed, but firestore handles it
        stockHistory: part.stockHistory.map(log => ({
            ...log,
            date: Timestamp.fromDate(new Date(log.date))
        }))
      });
    });
    await batch.commit();
    console.log('Database seeded successfully.');
  }
};


export const getParts = async (): Promise<Part[]> => {
    await seedDatabase(); // Ensure DB is seeded if empty
    const snapshot = await getDocs(partsCollectionRef);
    return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }) as Part);
};


export const addPart = async (partData: Omit<Part, 'id' | 'stockHistory'>): Promise<string> => {
  const docRef = await addDoc(partsCollectionRef, {
      ...partData,
      stockHistory: []
  });
  return docRef.id;
};

export const updatePart = async (partId: string, partData: Partial<Omit<Part, 'id'>>) => {
  const partRef = doc(db, 'parts', partId);
  await updateDoc(partRef, partData);
};

export const updatePartStock = async (partId: string, newQuantity: number, stockHistory: StockLog[]) => {
    const partRef = doc(db, 'parts', partId);
    
    const historyWithTimestamps = stockHistory.map(log => ({
        ...log,
        date: Timestamp.fromDate(new Date(log.date))
    }));

    await updateDoc(partRef, {
        quantity: newQuantity,
        stockHistory: historyWithTimestamps
    });
};
