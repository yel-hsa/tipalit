import { useCallback, useEffect, useState } from 'react'
import { Alert, FlatList, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { campusLabel, timeAgo } from '@tipalit/services/seed'
import type { AnalyticsOverview, AuditEntry, MemberSummary, Report, ReportAction } from '@tipalit/services/types'
import { colors, radius, space } from '../theme'
import { Badge, Button, Card, EmptyState, Loading, Pill, Screen } from '../components/ui'

type Tab = 'reports' | 'members' | 'audit'

const ACTIONS: { value: ReportAction; label: string; note: string }[] = [
  { value: 'remove_listing', label: 'Remove listing', note: 'Removed after review' },
  { value: 'suspend_member', label: 'Suspend member', note: 'Suspended after review' },
  { value: 'dismiss', label: 'Dismiss', note: 'No action needed' },
]

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
      <View style={styles.header}>
        <Text style={styles.heading}>Moderation</Text>
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
          <Pill key={item} label={item[0].toUpperCase() + item.slice(1)} active={tab === item} onPress={() => setTab(item)} />
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
              <Card style={styles.report}>
                <View style={styles.reportHead}>
                  <Text style={styles.reportTitle}>{item.target.label}</Text>
                  <Badge label={item.status} tone={item.status === 'open' ? 'warning' : 'neutral'} />
                </View>
                <Text style={styles.meta}>
                  {item.reason} · {campusLabel(item.campus)} · {timeAgo(item.createdAt)}
                </Text>
                {item.details !== '' && <Text style={styles.details}>{item.details}</Text>}
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
                          onPress={() => resolve(item, action.value)}
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
              <Card style={styles.report}>
                <View style={styles.reportHead}>
                  <Text style={styles.reportTitle}>{item.name}</Text>
                  <Badge label={item.status} tone={item.status === 'active' ? 'accent' : 'danger'} />
                </View>
                <Text style={styles.meta}>{item.email}</Text>
                <Text style={styles.meta}>
                  {item.program} · {item.year} · {item.campus ? campusLabel(item.campus) : 'No campus'}
                </Text>
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
              <View style={styles.auditRow}>
                <Text style={styles.reportTitle}>{item.summary}</Text>
                <Text style={styles.meta}>
                  {item.action} · {item.actorName} · {timeAgo(item.at)}
                </Text>
                {item.note && <Text style={styles.details}>{item.note}</Text>}
              </View>
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
  header: { paddingHorizontal: space(4), paddingTop: space(4), gap: space(3) },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  stats: { flexDirection: 'row', gap: space(2) },
  stat: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(3),
    gap: 2,
  },
  statValue: { fontSize: 20, fontWeight: '700', color: colors.text },
  statLabel: { fontSize: 11, color: colors.muted },
  tabs: { paddingHorizontal: space(4), paddingVertical: space(3), gap: space(2) },
  list: { paddingHorizontal: space(4), paddingBottom: space(10), gap: space(3), flexGrow: 1 },
  report: { gap: space(2) },
  reportHead: { flexDirection: 'row', justifyContent: 'space-between', gap: space(2), alignItems: 'flex-start' },
  reportTitle: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  details: { fontSize: 14, color: colors.text },
  actions: { flexDirection: 'row', gap: space(2), marginTop: space(1) },
  action: { flex: 1 },
  auditRow: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(3),
    gap: 2,
  },
  error: { color: colors.danger, fontSize: 13, paddingHorizontal: space(4) },
})
