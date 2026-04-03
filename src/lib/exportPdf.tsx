import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const colors = {
  bg: '#0F0F13',
  surface: '#1A1A22',
  primary: '#7CB9F4',
  green: '#69F0AE',
  red: '#CF6679',
  yellow: '#FFD740',
  onSurface: '#E8E8F0',
  onSurfaceVariant: '#9E9EAF',
  outline: '#3A3A4A',
}

const styles = StyleSheet.create({
  page: {
    backgroundColor: colors.bg,
    padding: 48,
    fontFamily: 'Helvetica',
  },
  // Header
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  symbol: { fontSize: 28, fontFamily: 'Helvetica-Bold', color: colors.onSurface },
  companyName: { fontSize: 13, color: colors.onSurfaceVariant, marginTop: 4 },
  headerMeta: { alignItems: 'flex-end' },
  badge: { fontSize: 10, color: colors.primary, backgroundColor: '#7CB9F41A', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 8 },
  date: { fontSize: 11, color: colors.onSurfaceVariant, marginTop: 4 },
  divider: { height: 1, backgroundColor: colors.outline, marginBottom: 24 },
  // Metrics grid
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metricCard: { flex: 1, backgroundColor: colors.surface, borderRadius: 10, padding: 14 },
  metricLabel: { fontSize: 9, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  metricValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: colors.onSurface },
  // Value bridge
  bridgeCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 16, marginBottom: 24 },
  bridgeTitle: { fontSize: 10, color: colors.onSurfaceVariant, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 12 },
  bridgeRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  bridgeLabel: { fontSize: 11, color: colors.onSurfaceVariant },
  bridgeValue: { fontSize: 11, color: colors.onSurface, fontFamily: 'Helvetica' },
  // Report body
  reportCard: { backgroundColor: colors.surface, borderRadius: 10, padding: 20 },
  h1: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: colors.onSurface, marginBottom: 8, marginTop: 16 },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: colors.primary, marginBottom: 6, marginTop: 12 },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: colors.onSurface, marginBottom: 4, marginTop: 8 },
  paragraph: { fontSize: 11, color: colors.onSurfaceVariant, lineHeight: 1.7, marginBottom: 8 },
  bullet: { fontSize: 11, color: colors.onSurfaceVariant, lineHeight: 1.7, marginBottom: 4, paddingLeft: 12 },
  // Footer
  footer: { marginTop: 32, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 9, color: colors.outline },
})

// ── Markdown → PDF elements ───────────────────────────────────────────────────
function parseLine(line: string, idx: number) {
  const clean = (s: string) => s.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*(.+?)\*/g, '$1').replace(/`(.+?)`/g, '$1').trim()

  if (line.startsWith('# '))   return <Text key={idx} style={styles.h1}>{clean(line.slice(2))}</Text>
  if (line.startsWith('## '))  return <Text key={idx} style={styles.h2}>{clean(line.slice(3))}</Text>
  if (line.startsWith('### ')) return <Text key={idx} style={styles.h3}>{clean(line.slice(4))}</Text>
  if (line.startsWith('- ') || line.startsWith('* ')) return <Text key={idx} style={styles.bullet}>• {clean(line.slice(2))}</Text>
  if (line.match(/^\d+\. /)) return <Text key={idx} style={styles.bullet}>{clean(line)}</Text>
  if (line.trim() === '' || line.startsWith('---')) return null
  return <Text key={idx} style={styles.paragraph}>{clean(line)}</Text>
}

function MarkdownBody({ text }: { text: string }) {
  const lines = text.split('\n')
  return <>{lines.map((line, i) => parseLine(line, i))}</>
}

// ── TA Report PDF ─────────────────────────────────────────────────────────────
interface TAReportProps {
  symbol: string
  companyName: string
  period: string
  generatedAt: string
  reportText: string
  modelUsed?: string
}

export function TAReportDocument({ symbol, companyName, period, generatedAt, reportText, modelUsed }: TAReportProps) {
  const date = new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <Document title={`${symbol} — TA Report`} author="Adaptive Market">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.companyName}>{companyName}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.badge}>{period.toUpperCase()} · TA REPORT</Text>
            <Text style={styles.date}>{date}</Text>
            {modelUsed && <Text style={styles.date}>{modelUsed}</Text>}
          </View>
        </View>
        <View style={styles.divider} />
        <View style={styles.reportCard}>
          <MarkdownBody text={reportText} />
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>Adaptive Market — adaptivemarket.app</Text>
          <Text style={styles.footerText}>Not financial advice</Text>
        </View>
      </Page>
    </Document>
  )
}

// ── Valuation Report PDF ──────────────────────────────────────────────────────
interface DCFBridge {
  pvFCFFs: number; pvTerminalValue: number; valueOfOperatingAssets: number
  lessDebt: number; plusCash: number; plusNonOperatingAssets: number; valueOfEquity: number
  wacc: number
}

interface ValuationReportProps {
  symbol: string
  companyName: string
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  reportText: string | null
  dcfBridge?: DCFBridge | null
}

export function ValuationReportDocument({
  symbol, companyName, generatedAt,
  intrinsicValue, currentPrice, marginOfSafety,
  reportText, dcfBridge,
}: ValuationReportProps) {
  const date = new Date(generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const isUnder = marginOfSafety < 0
  const mosAbs = Math.abs(marginOfSafety * 100).toFixed(1)
  const mosLabel = isUnder ? `${mosAbs}% Undervalued` : `${mosAbs}% Overvalued`
  const mosColor = marginOfSafety > 0.2 ? colors.red : marginOfSafety < -0.2 ? colors.green : colors.yellow
  const $M = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}M`

  return (
    <Document title={`${symbol} — Valuation Report`} author="Adaptive Market">
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.symbol}>{symbol}</Text>
            <Text style={styles.companyName}>{companyName}</Text>
          </View>
          <View style={styles.headerMeta}>
            <Text style={styles.badge}>DCF VALUATION</Text>
            <Text style={styles.date}>{date}</Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Key metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Intrinsic Value</Text>
            <Text style={styles.metricValue}>${intrinsicValue.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Price at Analysis</Text>
            <Text style={[styles.metricValue, { color: colors.onSurfaceVariant }]}>${currentPrice.toFixed(2)}</Text>
          </View>
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Assessment</Text>
            <Text style={[styles.metricValue, { fontSize: 13, color: mosColor }]}>{mosLabel}</Text>
          </View>
          {dcfBridge && (
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>WACC</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>{(dcfBridge.wacc * 100).toFixed(1)}%</Text>
            </View>
          )}
        </View>

        {/* Value bridge */}
        {dcfBridge && (
          <View style={styles.bridgeCard}>
            <Text style={styles.bridgeTitle}>Value Bridge</Text>
            {[
              { l: 'PV of FCFFs (Yr 1–10)', v: $M(dcfBridge.pvFCFFs) },
              { l: 'PV of Terminal Value', v: $M(dcfBridge.pvTerminalValue) },
              { l: 'Value of Operating Assets', v: $M(dcfBridge.valueOfOperatingAssets) },
              { l: '− Debt', v: $M(dcfBridge.lessDebt) },
              { l: '+ Cash', v: $M(dcfBridge.plusCash) },
              { l: 'Equity Value', v: $M(dcfBridge.valueOfEquity) },
            ].map(row => (
              <View key={row.l} style={styles.bridgeRow}>
                <Text style={styles.bridgeLabel}>{row.l}</Text>
                <Text style={styles.bridgeValue}>{row.v}</Text>
              </View>
            ))}
          </View>
        )}

        {/* AI report */}
        {reportText && (
          <View style={styles.reportCard}>
            <MarkdownBody text={reportText} />
          </View>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Adaptive Market — adaptivemarket.app</Text>
          <Text style={styles.footerText}>Not financial advice</Text>
        </View>
      </Page>
    </Document>
  )
}
