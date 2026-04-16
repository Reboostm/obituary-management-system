import { collection, addDoc, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from './firebase';
import { Lead } from '@/types/lead';

const LEADS_COLLECTION = 'leads';

export async function addLeadsBatch(leads: Lead[]): Promise<string[]> {
  const ids: string[] = [];
  for (const lead of leads) {
    try {
      const docRef = await addDoc(collection(db, LEADS_COLLECTION), {
        ...lead,
        createdAt: lead.createdAt.toISOString(),
        updatedAt: lead.updatedAt.toISOString(),
      });
      ids.push(docRef.id);
    } catch (error) {
      console.error(`Failed to add ${lead.businessName}:`, error);
    }
  }
  return ids;
}

export async function searchLeads(filters: any = {}, pageSize = 20) {
  try {
    const constraints = [];
    if (filters.county) constraints.push(where('location.county', '==', filters.county));
    if (filters.niche && filters.niche.length > 0) constraints.push(where('niche', 'in', filters.niche));
    if (filters.minQualityScore) constraints.push(where('qualityScore', '>=', filters.minQualityScore));
    
    constraints.push(orderBy('qualityScore', 'desc'));
    constraints.push(limit(pageSize));

    const q = query(collection(db, LEADS_COLLECTION), ...constraints);
    const snap = await getDocs(q);
    
    const leads = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: new Date(doc.data().createdAt),
      updatedAt: new Date(doc.data().updatedAt),
    } as Lead));

    return { leads, hasMore: leads.length >= pageSize };
  } catch (error) {
    console.error('Search error:', error);
    return { leads: [], hasMore: false };
  }
}

export async function getLeadStats(county: string) {
  try {
    const q = query(collection(db, LEADS_COLLECTION), where('location.county', '==', county));
    const snap = await getDocs(q);
    const stats = { total: snap.size, avgScore: 0, byNiche: {}, emailVerified: 0 };
    let totalScore = 0;
    
    snap.forEach(doc => {
      const data = doc.data();
      totalScore += data.qualityScore || 0;
      if (data.emailVerified) stats.emailVerified += 1;
      stats.byNiche[data.niche] = (stats.byNiche[data.niche] || 0) + 1;
    });
    
    stats.avgScore = snap.size > 0 ? totalScore / snap.size : 0;
    return stats;
  } catch (error) {
    return null;
  }
}
