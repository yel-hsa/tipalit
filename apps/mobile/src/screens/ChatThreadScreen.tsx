import { useCallback, useEffect, useRef, useState } from 'react'
import { FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from 'react-native'
import { services } from '@tipalit/services'
import { createId } from '@tipalit/services/ids'
import type { ChatItem, Thread } from '@tipalit/services/types'
import { colors, radius, space } from '../theme'
import { Button, Loading, Screen } from '../components/ui'

export default function ChatThreadScreen({ threadId, onBack }: { threadId: string; onBack: () => void }) {
  const [thread, setThread] = useState<Thread | null>(null)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<FlatList<ChatItem>>(null)

  const load = useCallback(async () => {
    try {
      const threads = await services.chat.listThreads()
      setThread(threads.find((item) => item.id === threadId) ?? null)
    } catch {
      setError('We could not load this chat.')
    }
  }, [threadId])

  useEffect(() => {
    void load()
    return services.chat.subscribe((event) => {
      if (event.threadId === threadId) void load()
    })
  }, [load, threadId])

  const send = async () => {
    const body = text.trim()
    if (!body || busy) return
    setBusy(true)
    setError(null)
    try {
      await services.chat.sendMessage(threadId, { id: createId('m'), text: body })
      setText('')
      await load()
    } catch {
      setError('Message not sent. Try again.')
    } finally {
      setBusy(false)
    }
  }

  if (!thread) return <Loading />

  return (
    <Screen>
      <View style={styles.header}>
        <Button label="Back" variant="secondary" onPress={onBack} />
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <FlatList
          ref={listRef}
          data={thread.items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => <Bubble item={item} />}
          ListEmptyComponent={<Text style={styles.empty}>Say hello to start the conversation.</Text>}
        />
        {error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.composer}>
          <TextInput
            value={text}
            onChangeText={setText}
            style={styles.input}
            placeholder="Write a message"
            multiline
          />
          <Button label="Send" onPress={send} disabled={!text.trim()} busy={busy} />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  )
}

function Bubble({ item }: { item: ChatItem }) {
  const mine = item.from === 'me'
  if (item.kind === 'meetup') {
    return (
      <View style={[styles.meetup, mine ? styles.meetupMine : styles.meetupTheirs]}>
        <Text style={styles.meetupTitle}>Meetup {item.status}</Text>
        <Text style={styles.meetupBody}>{item.location}</Text>
        <Text style={styles.meetupBody}>{item.time}</Text>
      </View>
    )
  }
  return (
    <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
      <Text style={[styles.bubbleText, mine && styles.bubbleTextMine]}>{item.text}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { padding: space(3), alignItems: 'flex-start' },
  list: { padding: space(4), gap: space(2), flexGrow: 1 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: space(8) },
  bubble: { maxWidth: '80%', borderRadius: radius.lg, paddingHorizontal: space(3), paddingVertical: space(2) },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: colors.accent },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  bubbleText: { fontSize: 15, color: colors.text },
  bubbleTextMine: { color: '#fff' },
  meetup: { alignSelf: 'center', borderRadius: radius.md, padding: space(3), gap: 2, borderWidth: 1 },
  meetupMine: { backgroundColor: colors.accentSoft, borderColor: colors.accent },
  meetupTheirs: { backgroundColor: colors.warningSoft, borderColor: colors.warning },
  meetupTitle: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', color: colors.text },
  meetupBody: { fontSize: 13, color: colors.text },
  composer: {
    flexDirection: 'row',
    gap: space(2),
    padding: space(3),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space(3),
    paddingVertical: space(2),
    fontSize: 15,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: space(4) },
})
