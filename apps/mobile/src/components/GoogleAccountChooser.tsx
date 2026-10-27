import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { initialsOf } from '@tipalit/services/profile'
import type { GoogleAccount } from '@tipalit/services/types'
import { BottomSheet } from './ported/components'
import { Avatar, Button, InputField } from './ported/kit'
import { Icon } from './ported/Icon'
import { colors, cornerPx, spacePx, typography } from './ported/tokens'

type GoogleAccountChooserProps = {
  isOpen: boolean
  accounts: GoogleAccount[]
  onSelect: (account: GoogleAccount) => void
  onClose: () => void
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// bottom sheet for choosing or entering a google account

export default function GoogleAccountChooser({
  isOpen,
  accounts,
  onSelect,
  onClose,
}: GoogleAccountChooserProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitOther = () => {
    const value = email.trim()
    if (!EMAIL_FORMAT.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    onSelect({ name: name.trim(), email: value })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Choose an account"
      subtitle="to continue to TIPalit"
      footer={
        <View style={styles.footerWrap}>
          <Icon name="info" size={12} color={colors.textSecondary} />
          <Text style={styles.footerText}>Demo sign-in · no Google data is used</Text>
        </View>
      }
    >
      <View style={styles.accountList}>
        {accounts.map((account) => (
          <Pressable
            key={account.email}
            onPress={() => onSelect(account)}
            accessibilityLabel={`${account.name}, ${account.email}`}
            style={({ pressed }) => [
              styles.accountRow,
              pressed && styles.accountRowPressed,
            ]}
          >
            <Avatar initials={initialsOf(account.name)} size="medium" />
            <View style={styles.accountDetails}>
              <Text style={styles.accountName} numberOfLines={1}>
                {account.name}
              </Text>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {account.email}
              </Text>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        ))}

        <Pressable
          onPress={() => setAdding((open) => !open)}
          accessibilityRole="button"
          accessibilityLabel="Use another account"
          style={({ pressed }) => [
            styles.accountRow,
            pressed && styles.accountRowPressed,
          ]}
        >
          <View style={styles.userPlusIconWrap}>
            <Icon name="user-plus" size={16} color={colors.text} />
          </View>
          <Text style={styles.accountName}>Use another account</Text>
        </Pressable>
      </View>

      {adding && (
        <View style={styles.form}>
          <InputField
            label="Name"
            placeholder="Juan Dela Cruz"
            value={name}
            onChange={setName}
          />
          <InputField
            label="Email"
            placeholder="you@tip.edu.ph"
            value={email}
            keyboardType="email-address"
            onChange={(val) => {
              setEmail(val)
              if (error) setError(null)
            }}
          />
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Button
            variant="primary"
            label="Continue"
            onPress={submitOther}
          />
        </View>
      )}
    </BottomSheet>
  )
}

const styles = StyleSheet.create({
  errorText: {
    ...typography.labelSm,
    color: colors.danger,
    marginTop: -spacePx.sm,
  },
  footerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacePx.xs,
    paddingVertical: spacePx.xs,
  },
  footerText: {
    ...typography.labelSm,
    fontSize: 11,
    color: colors.textSecondary,
  },
  accountList: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.borderSecondary,
    marginHorizontal: -spacePx.xl,
  },
  accountRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacePx.xl,
    paddingVertical: spacePx.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
  },
  accountRowPressed: {
    backgroundColor: colors.surfaceHover,
  },
  accountDetails: {
    flex: 1,
    marginLeft: spacePx.lg,
  },
  accountName: {
    ...typography.label,
    color: colors.text,
  },
  accountEmail: {
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  userPlusIconWrap: {
    width: 32,
    height: 32,
    borderRadius: cornerPx.full,
    backgroundColor: colors.bgSubtle,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    flexDirection: 'column',
    gap: spacePx.lg,
    paddingTop: spacePx.xl,
  },
})
