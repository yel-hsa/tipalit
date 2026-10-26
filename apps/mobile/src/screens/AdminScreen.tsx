import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { campusLabel, timeAgo } from '@tipalit/services/seed'
import type { AnalyticsOverview, AuditEntry, MemberSummary, Report, ReportAction } from '@tipalit/services/types'
import { colors, radius, space, typography } from '../theme'
import { Badge, Button, Card, EmptyState, Loading, Pill, Screen } from '../components/ui'

type Tab = 'reports' | 'members' | 'audit'

const TAB_LABELS: Record<Tab, string> = { reports: 'Reports', members: 'Members', audit: 'Audit' }

const ACTIONS: { value: ReportAction; label: string; note: string }[] = [
  { value: 'remove_listing', label: 'Remove listing', note: 'Removed after review' },
  { value: 'suspend_member', label: 'Suspend member', note: 'Suspended after review' },
  { value: 'dismiss', label: 'Dismiss', note: 'No action needed' },
]

/**
 * Mobile mirror of the web admin console (apps/web/screens/AdminConsole.tsx):
 * charcoal header band with gold accents, white 16px-radius surface cards,
 * soft-tint status badges, 12px uppercase meta headers. Same moderation flows
 * as before — reports queue, member moderation, audit log.
 */
export default function AdminScreen() {
  const [tab, setTab] = useState<Tab>('reports')
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null)
  const [reports, setReports] = useState<Report[] | null>(null)
  const [members, setMembers] = useState<MemberSummary[] | null>(null)
  const [audit, setAudit] = useState<AuditEntry[] | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const [stats, nextReports, nextMembers, nextAudit] = await Promise.all([
        services.analytics.getOverview(),
        services.admin.listReports(),
        services.admin.listMembers(),
        services.admin.listAudit(),
      ])
      setOverview(stats)
      setReports(nextReports)
      setMembers(nextMembers)
      setAudit(nextAudit)
    } catch {
      setError('We could not load the moderation queue.')
      setReports([])
      setMembers([])
      setAudit([])
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const resolve = async (report: Report, action: ReportAction) => {
    const choice = ACTIONS.find((item) => item.value === action)
    if (!choice) return
    setBusyId(report.id)
    try {
      await services.admin.resolveReport(report.id, action, choice.note)
      await load()
    } catch {
      setError('That action did not go through. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  const toggleMember = async (member: MemberSummary) => {
    const next = member.status === 'active' ? 'suspended' : 'active'
    setBusyId(member.userId)
    try {
      await services.admin.setMemberStatus(member.userId, next, `Set to ${next} from the mobile dashboard`)
      await load()
    } catch {
      setError('That change did not go through. Try again.')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Screen>
      {/* charcoal console header, mirroring the web AdminShell band */}
      <View style={styles.consoleHeader}>
        <Text style={styles.consoleKicker}>TIPalit · Office of Student Affairs</Text>
        <Text style={styles.consoleTitle}>Moderation</Text>
        {overview && (
          <View style={styles.stats}>
            <Stat label="Open reports" value={overview.openReports} />
            <Stat label="Members" value={overview.members} />
            <Stat label="Listings" value={overview.activeListings} />
          </View>
        )}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {(['reports', 'members', 'audit'] as Tab[]).map((item) => (
          <Pill
            key={item}
            label={TAB_LABELS[item]}
            active={tab === item}
            onPress={() => setTab(item)}
          />
        ))}
      </ScrollView>
      {error && <Text style={styles.error}>{error}</Text>}

      {tab === 'reports' &&
        (reports === null ? (
          <Loading />
        ) : (
          <FlatList
            data={reports}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowTitle}>{item.target.label}</Text>
                  <Badge label={item.status} tone={item.status === 'open' ? 'warning' : 'neutral'} />
                </View>
                <Text style={styles.sectionLabel}>Report</Text>
                <Text style={styles.meta}>
                  {item.reason} · {campusLabel(item.campus)} · {timeAgo(item.createdAt)}
                </Text>
                {item.details !== '' && <Text style={styles.details}>{item.details}</Text>}
                <Text style={styles.sectionLabel}>People</Text>
                <Text style={styles.meta}>
                  Reported by {item.reporterName} · subject {item.subjectName}
                </Text>
                {item.status === 'open' && (
                  <View style={styles.actions}>
                    {ACTIONS.map((action) => (
                      <View key={action.value} style={styles.action}>
                        <Button
                          label={action.label}
                          variant={action.value === 'dismiss' ? 'secondary' : 'danger'}
                          onPress={() =>
                            action.value === 'dismiss'
                              ? void resolve(item, action.value)
                              : Alert.alert(
                                  action.label + '?',
                                  action.value === 'remove_listing'
                                    ? 'This takes the listing off the feed for good.'
                                    : 'This hides their listings and blocks sign-in until an admin reinstates them.',
                                  [
                                    { text: 'Cancel', style: 'cancel' },
                                    { text: action.label, style: 'destructive', onPress: () => void resolve(item, action.value) },
                                  ],
                                )
                          }
                          busy={busyId === item.id}
                        />
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            )}
            ListEmptyComponent={<EmptyState title="Queue clear" body="No reports are waiting for review." />}
          />
        ))}

      {tab === 'members' &&
        (members === null ? (
          <Loading />
        ) : (
          <FlatList
            data={members}
            keyExtractor={(item) => item.userId}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card style={styles.row}>
                <View style={styles.rowHead}>
                  <Text style={styles.rowTitle}>{item.name}</Text>
                  <Badge label={item.status} tone={item.status === 'active' ? 'accent' : 'danger'} />
                </View>
                <Text style={styles.sectionLabel}>Member</Text>
                <Text style={styles.meta}>{item.email}</Text>
                <Text style={styles.meta}>
                  {item.program} · {item.year} · {item.campus ? campusLabel(item.campus) : 'No campus'}
                </Text>
                <Text style={styles.sectionLabel}>Activity</Text>
                <Text style={styles.meta}>
                  {item.activeListings} listings · {item.openReports} open reports · {item.role}
                </Text>
                <Button
                  label={item.status === 'active' ? 'Suspend' : 'Reinstate'}
                  variant={item.status === 'active' ? 'danger' : 'secondary'}
                  onPress={() =>
                    Alert.alert(
                      item.status === 'active' ? 'Suspend member?' : 'Reinstate member?',
                      `${item.name} will be ${item.status === 'active' ? 'blocked from signing in' : 'able to sign in again'}.`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Confirm', onPress: () => void toggleMember(item) },
                      ],
                    )
                  }
                  busy={busyId === item.userId}
                />
              </Card>
            )}
            ListEmptyComponent={<EmptyState title="No members" body="Members appear here once they sign in." />}
          />
        ))}

      {tab === 'audit' &&
        (audit === null ? (
          <Loading />
        ) : (
          <FlatList
            data={audit}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            renderItem={({ item }) => (
              <Card style={styles.row}>
                <Text style={styles.rowTitle}>{item.summary}</Text>
                <Text style={styles.sectionLabel}>Action</Text>
                <Text style={styles.meta}>
                  {item.action} · {item.actorName} · {timeAgo(item.at)}
                </Text>
                {item.note && <Text style={styles.details}>{item.note}</Text>}
              </Card>
            )}
            ListEmptyComponent={<EmptyState title="No activity" body="Moderation actions are recorded here." />}
          />
        ))}
    </Screen>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  consoleHeader: {
    backgroundColor: colors.brandPrimary,
    paddingHorizontal: space(4),
    paddingTop: space(4),
    paddingBottom: space(4),
    gap: space(2),
  },
  consoleKicker: { ...typography.meta, color: colors.accent, textTransform: 'uppercase', letterSpacing: 1 },
  consoleTitle: { ...typography.page, color: colors.onBrand },
  stats: { flexDirection: 'row', gap: space(2) },
  stat: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.lg,
    padding: space(3),
    gap: 2,
  },
  statValue: { ...typography.metric, color: colors.accent },
  statLabel: { ...typography.meta, color: colors.onBrand, opacity: 0.7 },
  tabs: { paddingHorizontal: space(4), paddingVertical: space(3), gap: space(2) },
  list: { paddingHorizontal: space(4), paddingBottom: space(10), gap: space(3), flexGrow: 1 },
  row: { gap: space(2), padding: space(4) },
  rowHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space(2), alignItems: 'flex-start' },
  rowTitle: { flex: 1, ...typography.cellStrong, color: colors.text },
  sectionLabel: {
    ...typography.meta,
    color: colors.textTertiary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    fontWeight: '500',
    marginTop: space(1),
  },
  meta: { ...typography.meta, color: colors.textSecondary },
  details: { ...typography.inputSm, color: colors.text },
  actions: { flexDirection: 'row', gap: space(2), marginTop: space(1) },
  action: { flex: 1 },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: space(4) },
})
