import type { GoogleAccount } from '../types'

type Picker = () => Promise<GoogleAccount | null>

/*
 * Bridge between the mock Google sign-in and the React chooser sheet. The UI
 * registers a picker; resolving it with null means the user closed the sheet.
 */
let picker: Picker | null = null

export const registerAccountPicker = (next: Picker | null) => {
  picker = next
}

export const pickAccount = (): Promise<GoogleAccount | null> => (picker ? picker() : Promise.resolve(null))
