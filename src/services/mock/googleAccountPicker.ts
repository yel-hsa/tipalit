import type { GoogleAccount } from '../types'

type Picker = () => Promise<GoogleAccount | null>

// null means the user closed the chooser sheet
let picker: Picker | null = null

export const registerAccountPicker = (next: Picker | null) => {
  picker = next
}

export const pickAccount = (): Promise<GoogleAccount | null> => (picker ? picker() : Promise.resolve(null))
