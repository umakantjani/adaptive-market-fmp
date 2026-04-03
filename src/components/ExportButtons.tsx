'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { FileDown, FileText, Loader2 } from 'lucide-react'

// Lazy-load heavy libs so they don't bloat the initial bundle
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then(m => m.PDFDownloadLink),
  { ssr: false, loading: () => null },
)

interface TAReportExportProps {
  type: 'ta'
  symbol: string
  companyName: string
  period: string
  generatedAt: string
  reportText: string
  modelUsed?: string
}

interface ValuationExportProps {
  type: 'valuation'
  symbol: string
  companyName: string
  generatedAt: string
  intrinsicValue: number
  currentPrice: number
  marginOfSafety: number
  reportText: string | null
  dcfBridge?: {
    pvFCFFs: number; pvTerminalValue: number; valueOfOperatingAssets: number
    lessDebt: number; plusCash: number; plusNonOperatingAssets: number
    valueOfEquity: number; wacc: number
  } | null
}

type ExportProps = TAReportExportProps | ValuationExportProps

const btnStyle = (color: string): React.CSSProperties => ({
  display: 'flex', alignItems: 'center', gap: 6,
  padding: '9px 16px', borderRadius: 20,
  background: `${color}14`,
  color,
  border: `1px solid ${color}30`,
  cursor: 'pointer', fontSize: 13, fontWeight: 500,
  textDecoration: 'none',
})

export default function ExportButtons(props: ExportProps) {
  const [docxLoading, setDocxLoading] = useState(false)

  async function handleDocx() {
    setDocxLoading(true)
    try {
      if (props.type === 'ta') {
        const { downloadTAReportDocx } = await import('@/lib/exportDocx')
        await downloadTAReportDocx(props)
      } else {
        const { downloadValuationDocx } = await import('@/lib/exportDocx')
        await downloadValuationDocx(props)
      }
    } finally {
      setDocxLoading(false)
    }
  }

  function getPdfDocument() {
    if (props.type === 'ta') {
      const { TAReportDocument } = require('@/lib/exportPdf')
      return <TAReportDocument {...props} />
    } else {
      const { ValuationReportDocument } = require('@/lib/exportPdf')
      return <ValuationReportDocument {...props} />
    }
  }

  const filename = props.type === 'ta'
    ? `${props.symbol}_TA_Report.pdf`
    : `${props.symbol}_Valuation.pdf`

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      {/* PDF */}
      <PDFDownloadLink document={getPdfDocument()} fileName={filename}>
        {({ loading }) => (
          <span style={btnStyle('#CF6679')}>
            {loading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <FileDown size={14} />}
            {loading ? 'Building PDF…' : 'Download PDF'}
          </span>
        )}
      </PDFDownloadLink>

      {/* DOCX / Google Doc */}
      <button onClick={handleDocx} disabled={docxLoading} style={btnStyle('#69F0AE')}>
        {docxLoading
          ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
          : <FileText size={14} />}
        {docxLoading ? 'Building…' : 'Google Doc (.docx)'}
      </button>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
