/** Client-generated ids, so optimistic items can be matched with the server copy. */
export const createId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
