import { db } from './firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy } from 'firebase/firestore';

const COLLECTION = 'floralShops';

export async function getFloralShops() {
  try {
    const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error('Failed to fetch floral shops:', err);
    throw err;
  }
}

export async function createFloralShop(shop) {
  try {
    const docRef = await addDoc(collection(db, COLLECTION), {
      ...shop,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return { id: docRef.id, ...shop };
  } catch (err) {
    console.error('Failed to create floral shop:', err);
    throw err;
  }
}

export async function updateFloralShop(id, shop) {
  try {
    const docRef = doc(db, COLLECTION, id);
    await updateDoc(docRef, {
      ...shop,
      updatedAt: new Date(),
    });
    return { id, ...shop };
  } catch (err) {
    console.error('Failed to update floral shop:', err);
    throw err;
  }
}

export async function deleteFloralShop(id) {
  try {
    await deleteDoc(doc(db, COLLECTION, id));
  } catch (err) {
    console.error('Failed to delete floral shop:', err);
    throw err;
  }
}
