import { addDoc, collection, getDocs, query, where } from 'firebase/firestore'
import { SEED_PROMOTIONS } from '../seed'
import type { CampusId, Promotion, PromotionService } from '../types'
import { getFirebaseDb, isFirebaseConfigured } from './config'

const isCampus = (value: unknown): value is CampusId | 'all' =>
  value === 'manila' || value === 'qc' || value === 'all'

function toPromotion(id: string, data: Record<string, any>): Promotion | null {
  if (!data.title || !data.sponsorName || !data.destinationUrl) return null
  const campus = isCampus(data.campus) ? data.campus : 'all'
  return {
    id,
    title: data.title,
    description: data.description || '',
    imageUrl: typeof data.imageUrl === 'string' ? data.imageUrl : undefined,
    destinationUrl: data.destinationUrl,
    sponsorName: data.sponsorName,
    type: data.type === 'perk' ? 'perk' : 'sponsor',
    campus,
    active: data.active !== false,
  }
}

export function createFirebasePromotions(): PromotionService {
  const db = getFirebaseDb()

  return {
    async list({ campus }: { campus: CampusId }): Promise<Promotion[]> {
      if (!isFirebaseConfigured()) {
        return structuredClone(SEED_PROMOTIONS).filter(
          (promotion) => promotion.active && (promotion.campus === 'all' || promotion.campus === campus),
        )
      }

      try {
        // rules only expose active promos and require the filter in the query
        const snapshot = await getDocs(query(collection(db, 'promotions'), where('active', '==', true)))
        const promotions: Promotion[] = []
        snapshot.forEach((docSnap) => {
          const promotion = toPromotion(docSnap.id, docSnap.data() as Record<string, any>)
          if (promotion && (promotion.campus === 'all' || promotion.campus === campus)) {
            promotions.push(promotion)
          }
        })
        // the collection may not be seeded yet
        if (promotions.length > 0) return promotions
        return structuredClone(SEED_PROMOTIONS).filter(
          (promotion) => promotion.active && (promotion.campus === 'all' || promotion.campus === campus),
        )
      } catch (err) {
        console.warn('[TIPalit Firebase Promotions] Error listing, falling back to seed:', err)
        return structuredClone(SEED_PROMOTIONS).filter(
          (promotion) => promotion.active && (promotion.campus === 'all' || promotion.campus === campus),
        )
      }
    },

    async trackClick(id: string): Promise<void> {
      if (!isFirebaseConfigured()) return
      try {
        // tracking failures must never block navigation
        await addDoc(collection(db, 'promotion_clicks'), {
          promotion_id: id,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('[TIPalit Firebase Promotions] Error tracking click:', err)
      }
    },
  }
}
