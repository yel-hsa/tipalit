import { SEED_PROMOTIONS } from '../seed'
import type { CampusId, Promotion, PromotionService } from '../types'
import { hasShape, isArrayOf, read, write } from './storage'

type ClickRecord = { promotionId: string; at: string }

const isPromotions = isArrayOf(
  hasShape<Promotion>({ id: 'string', title: 'string', sponsorName: 'string', destinationUrl: 'string' }),
)
const isClicks = isArrayOf(hasShape<ClickRecord>({ promotionId: 'string', at: 'string' }))

const PROMOTION_KEY = 'promotions'
const CLICK_KEY = 'promotionClicks'

export function createMockPromotions(): PromotionService {
  return {
    async list({ campus }: { campus: CampusId }) {
      return read<Promotion[]>(PROMOTION_KEY, () => structuredClone(SEED_PROMOTIONS), isPromotions).filter(
        (promotion) => promotion.active && (promotion.campus === 'all' || promotion.campus === campus),
      )
    },

    async trackClick(id: string) {
      const clicks = read<ClickRecord[]>(CLICK_KEY, () => [], isClicks)
      clicks.push({ promotionId: id, at: new Date().toISOString() })
      write(CLICK_KEY, clicks)
    },
  }
}
