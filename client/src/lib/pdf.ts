import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { format } from 'date-fns'

import { BRAND_LOGO_SRC, BRAND_NAME } from '@/components/BrandLogo'
import type { Invoice, PaymentRecord, Profile } from './types'
import { deriveStatus, lineAmount, splitMulti, toCommas } from './utils'

const INK = '#0f172a'
const MUTED = '#6b7280'
const BORDER = '#e5e7eb'

interface CachedLogo {
  dataUrl: string
  format: 'JPEG' | 'PNG'
  w: number
  h: number
}

let cachedLogo: CachedLogo | null = null

// 1800px wide gives ~2.5x oversampling at A4 full-bleed (~515pt → ~687px),
// which is sharp at 300 DPI print without bloating the file. Logo is drawn
// onto a white background and exported as JPEG for ~10x smaller files.
const RASTER_WIDTH = 1800
const JPEG_QUALITY = 0.92

async function loadLogo(): Promise<CachedLogo | null> {
  if (cachedLogo) return cachedLogo
  try {
    const res = await fetch(BRAND_LOGO_SRC)
    if (!res.ok) return null
    const isSvg =
      BRAND_LOGO_SRC.endsWith('.svg') ||
      (res.headers.get('content-type') ?? '').includes('svg')

    const blob = await res.blob()
    const sourceUrl = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(new Error('logo read failed'))
      r.readAsDataURL(blob)
    })

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('logo decode failed'))
      i.src = sourceUrl
    })

    const aspect = (img.naturalHeight || 1) / (img.naturalWidth || 1)
    const canvas = document.createElement('canvas')
    canvas.width = RASTER_WIDTH
    canvas.height = Math.round(RASTER_WIDTH * aspect)
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.imageSmoothingEnabled = true
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

    if (isSvg) {
      cachedLogo = {
        dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
        format: 'JPEG',
        w: canvas.width,
        h: canvas.height,
      }
    } else {
      cachedLogo = {
        dataUrl: canvas.toDataURL('image/jpeg', JPEG_QUALITY),
        format: 'JPEG',
        w: canvas.width,
        h: canvas.height,
      }
    }
    return cachedLogo
  } catch {
    return null
  }
}

interface BuildOpts {
  invoice: Invoice
  profile?: Profile | null
  totalReceived: number
}

export async function generateInvoicePdf({ invoice, profile, totalReceived }: BuildOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageWidth = doc.internal.pageSize.getWidth()
  const pageHeight = doc.internal.pageSize.getHeight()
  const margin = 40
  const contentWidth = pageWidth - margin * 2
  const rightX = pageWidth - margin
  let y = margin

  const balance = Math.max(0, Number(invoice.total) - totalReceived)
  const statusText = deriveStatus({
    total: invoice.total,
    totalAmountReceived: totalReceived,
    paymentRecords: invoice.paymentRecords,
    type: invoice.type,
  })
  const isPaid = statusText === 'Paid'
  const issuedDate = invoice.createdAt
    ? format(new Date(invoice.createdAt), 'MMM d, yyyy')
    : '—'
  const dueDate = invoice.dueDate ? format(new Date(invoice.dueDate), 'MMM d, yyyy') : '—'

  // ===== Logo (100% width) =====
  const logo = await loadLogo()
  if (logo) {
    const aspect = logo.h / logo.w
    const logoHeight = contentWidth * aspect
    doc.addImage(
      logo.dataUrl,
      logo.format,
      margin,
      y,
      contentWidth,
      logoHeight,
      undefined,
      'FAST',
    )
    y += logoHeight + 16
  } else {
    doc.setFont('helvetica', 'bold').setFontSize(20).setTextColor(INK)
    doc.text(BRAND_NAME, margin, y + 20)
    y += 36
  }

  drawDivider(doc, margin, y, rightX)
  y += 16

  // ===== Title strip: type + number left, dates right =====
  const docType = String(invoice.type ?? 'Invoice').toUpperCase()
  doc.setFont('helvetica', 'bold').setFontSize(16).setTextColor(INK)
  doc.text(docType, margin, y + 2)
  doc.setFont('helvetica', 'normal').setFontSize(9).setTextColor(MUTED)
  doc.text(`No. #${invoice.invoiceNumber ?? '—'}`, margin, y + 14)

  // Right side: ISSUED / DUE in a tight 2-col block above the status pill
  const metaCol1X = rightX - 100
  const metaCol2X = rightX
  doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
  doc.text('ISSUED', metaCol1X, y - 2)
  doc.text('DUE', metaCol1X, y + 11)
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(INK)
  doc.text(issuedDate, metaCol2X, y - 2, { align: 'right' })
  doc.text(dueDate, metaCol2X, y + 11, { align: 'right' })

  // Status pill below the dates, right-aligned
  drawStatusPill(doc, rightX, y + 18, statusText)

  y += 40
  drawDivider(doc, margin, y, rightX)
  y += 14

  // ===== FROM + BILL TO (two columns, equal width) =====
  const colGap = 36
  const colWidth = (contentWidth - colGap) / 2
  const fromX = margin
  const billX = margin + colWidth + colGap

  doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
  doc.text('FROM', fromX, y)
  doc.text('BILL TO', billX, y)
  y += 12

  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(INK)
  const fromName = profile?.businessName || profile?.name || BRAND_NAME
  const fromNameLines = doc.splitTextToSize(fromName, colWidth)
  doc.text(fromNameLines, fromX, y)
  const billNameLines = doc.splitTextToSize(invoice.client?.name ?? '—', colWidth)
  doc.text(billNameLines, billX, y)

  let fromY = y + Math.max(fromNameLines.length, 1) * 13 + 2
  let billY = y + Math.max(billNameLines.length, 1) * 13 + 2

  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(MUTED)

  const writeColLine = (text: string, x: number, currentY: number): number => {
    const wrapped = doc.splitTextToSize(text, colWidth)
    doc.text(wrapped, x, currentY)
    return currentY + wrapped.length * 11
  }

  // FROM contact
  for (const email of splitMulti(profile?.email)) {
    fromY = writeColLine(email, fromX, fromY)
  }
  for (const phone of splitMulti(profile?.phoneNumber)) {
    fromY = writeColLine(phone, fromX, fromY)
  }
  if (profile?.contactAddress) fromY = writeColLine(profile.contactAddress, fromX, fromY)

  // BILL TO contact
  for (const email of splitMulti(invoice.client?.email)) {
    billY = writeColLine(email, billX, billY)
  }
  for (const phone of splitMulti(invoice.client?.phone)) {
    billY = writeColLine(phone, billX, billY)
  }
  if (invoice.client?.address) billY = writeColLine(invoice.client.address, billX, billY)

  y = Math.max(fromY, billY) + 16

  // ===== Balance Due banner =====
  const bannerHeight = 40
  ensureSpace(doc, y, bannerHeight + 100, () => {
    y = margin
  })
  doc.setFillColor(248, 250, 252) // slate-50
  doc.roundedRect(margin, y, contentWidth, bannerHeight, 5, 5, 'F')

  doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
  doc.text(isPaid ? 'PAID IN FULL' : 'BALANCE DUE', margin + 14, y + 16)
  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(MUTED)
  doc.text(
    isPaid ? 'Thank you for your payment.' : `Due by ${dueDate}`,
    margin + 14,
    y + 28,
  )

  doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(INK)
  doc.text(
    `${invoice.currency ?? ''} ${toCommas(isPaid ? invoice.total : balance)}`,
    rightX - 14,
    y + 25,
    { align: 'right' },
  )

  y += bannerHeight + 14

  // ===== Items table =====
  ensureSpace(doc, y, 120, () => {
    y = margin
  })

  const items = invoice.items ?? []
  const body = items.map((it) => [
    it.itemName || '—',
    it.quantity || '0',
    toCommas(it.unitPrice),
    it.discount || '0',
    toCommas(lineAmount(it)),
  ])

  autoTable(doc, {
    startY: y,
    head: [
      [
        { content: 'DESCRIPTION', styles: { halign: 'left' } },
        { content: 'QTY', styles: { halign: 'right' } },
        { content: 'PRICE', styles: { halign: 'right' } },
        { content: 'DISC %', styles: { halign: 'right' } },
        { content: 'AMOUNT', styles: { halign: 'right' } },
      ],
    ],
    body,
    theme: 'plain',
    styles: {
      font: 'helvetica',
      fontSize: 9.5,
      cellPadding: { top: 6, bottom: 6, left: 10, right: 10 },
      textColor: INK,
      lineColor: BORDER,
      lineWidth: { bottom: 0.5 },
      valign: 'middle',
    },
    headStyles: {
      fontSize: 7.5,
      fontStyle: 'bold',
      fillColor: [248, 250, 252],
      textColor: MUTED,
      lineColor: BORDER,
      lineWidth: { bottom: 0.75 },
      cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 50, halign: 'right' },
      2: { cellWidth: 65, halign: 'right' },
      3: { cellWidth: 55, halign: 'right' },
      4: { cellWidth: 80, halign: 'right' },
    },
    margin: { left: margin, right: margin },
  })

  // @ts-expect-error -- autotable adds lastAutoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  // ===== Summary (right-aligned, no dividers) =====
  // Hierarchy comes from bold weight + a small gap before each emphasized
  // row (Total, Balance). The items table's bottom border already separates
  // items from the summary, so no extra lines are needed here.
  const ratesNum = Number(invoice.rates) || 0
  type SummaryRow = {
    label: string
    value: string
    bold?: boolean
    gapAbove?: number
  }
  const summary: SummaryRow[] = [
    { label: 'Subtotal', value: `${invoice.currency ?? ''} ${toCommas(invoice.subTotal)}` },
    { label: `VAT (${ratesNum}%)`, value: `${invoice.currency ?? ''} ${toCommas(invoice.vat)}` },
    {
      label: 'Total',
      value: `${invoice.currency ?? ''} ${toCommas(invoice.total)}`,
      bold: true,
      gapAbove: 6,
    },
    { label: 'Paid', value: `${invoice.currency ?? ''} ${toCommas(totalReceived)}` },
    {
      label: 'Balance due',
      value: `${invoice.currency ?? ''} ${toCommas(balance)}`,
      bold: true,
      gapAbove: 6,
    },
  ]

  ensureSpace(doc, y, 20 + summary.length * 16 + 50, () => {
    y = margin
  })

  // Compact two-column block hugging the right margin. Labels and values are
  // both right-aligned so the entire summary reads as a single tight cluster
  // (no big empty gap between label and value).
  y += 6
  const valueColumnWidth = 95 // enough for "USD 9,999,999.99"
  const labelRightX = rightX - valueColumnWidth
  for (const row of summary) {
    if (row.gapAbove) y += row.gapAbove
    doc.setFontSize(row.bold ? 10.5 : 9.5)
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal')
    doc.setTextColor(row.bold ? INK : MUTED)
    doc.text(row.label, labelRightX, y, { align: 'right' })
    doc.setFont('helvetica', 'bold').setTextColor(INK)
    doc.text(row.value, rightX, y, { align: 'right' })
    y += row.bold ? 16 : 14
  }

  y += 8

  // ===== Notes =====
  if (invoice.notes) {
    ensureSpace(doc, y, 40, () => {
      y = margin
    })
    doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
    doc.text('NOTES', margin, y)
    y += 11
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(INK)
    const wrapped = doc.splitTextToSize(invoice.notes, contentWidth)
    doc.text(wrapped, margin, y)
    y += wrapped.length * 12 + 10
  }

  // ===== Payment history =====
  if (invoice.paymentRecords && invoice.paymentRecords.length > 0) {
    ensureSpace(doc, y, 70, () => {
      y = margin
    })
    doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
    doc.text(`PAYMENT HISTORY (${invoice.paymentRecords.length})`, margin, y)
    y += 6

    autoTable(doc, {
      startY: y,
      head: [
        [
          { content: 'DATE PAID', styles: { halign: 'left' } },
          { content: 'AMOUNT', styles: { halign: 'right' } },
          { content: 'METHOD', styles: { halign: 'left' } },
          { content: 'NOTE', styles: { halign: 'left' } },
        ],
      ],
      body: invoice.paymentRecords.map((p: PaymentRecord) => [
        p.datePaid ? format(new Date(p.datePaid), 'MMM d, yyyy') : '—',
        toCommas(p.amountPaid),
        p.paymentMethod ?? '—',
        p.note ?? '',
      ]),
      theme: 'plain',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        cellPadding: { top: 5, bottom: 5, left: 10, right: 10 },
        textColor: INK,
        lineColor: BORDER,
        lineWidth: { bottom: 0.5 },
        valign: 'middle',
      },
      headStyles: {
        fontSize: 7.5,
        fontStyle: 'bold',
        fillColor: [248, 250, 252],
        textColor: MUTED,
        lineColor: BORDER,
        lineWidth: { bottom: 0.75 },
        cellPadding: { top: 6, bottom: 6, left: 10, right: 10 },
      },
      columnStyles: {
        1: { halign: 'right' },
      },
      margin: { left: margin, right: margin },
    })
  }

  // ===== Footer (every page) =====
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(BORDER).setLineWidth(0.5)
    doc.line(margin, pageHeight - 26, rightX, pageHeight - 26)
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(MUTED)
    doc.text('Thank you for your business.', margin, pageHeight - 14)
    if (totalPages > 1) {
      doc.text(`Page ${p} of ${totalPages}`, rightX, pageHeight - 14, { align: 'right' })
    }
  }

  return doc
}

function drawDivider(doc: jsPDF, x1: number, y: number, x2: number) {
  doc.setDrawColor(BORDER).setLineWidth(0.5)
  doc.line(x1, y, x2, y)
}

function drawStatusPill(doc: jsPDF, anchorRightX: number, y: number, status: string) {
  const colors = pillColors(status)
  const text = status.toUpperCase()
  const padX = 9
  const h = 14

  doc.setFontSize(7.5).setFont('helvetica', 'bold')
  const textWidth = doc.getTextWidth(text)
  const w = textWidth + padX * 2

  doc.setFillColor(colors.bg[0], colors.bg[1], colors.bg[2])
  doc.roundedRect(anchorRightX - w, y, w, h, 7, 7, 'F')
  doc.setTextColor(colors.fg[0], colors.fg[1], colors.fg[2])
  doc.text(text, anchorRightX - w / 2, y + 9.5, { align: 'center' })
  doc.setTextColor(INK)
}

function pillColors(status: string): { bg: [number, number, number]; fg: [number, number, number] } {
  switch (status) {
    case 'Paid':
      return { bg: [220, 252, 231], fg: [21, 128, 61] } // green-100 / green-700
    case 'Partial':
      return { bg: [254, 243, 199], fg: [161, 98, 7] } // amber-100 / amber-700
    case 'Unpaid':
      return { bg: [254, 226, 226], fg: [185, 28, 28] } // red-100 / red-700
    default:
      return { bg: [241, 245, 249], fg: [71, 85, 105] } // slate-100 / slate-600
  }
}

function ensureSpace(doc: jsPDF, currentY: number, needed: number, onNewPage: () => void) {
  const pageHeight = doc.internal.pageSize.getHeight()
  if (currentY + needed > pageHeight - 60) {
    doc.addPage()
    onNewPage()
  }
}

export async function downloadInvoicePdf(opts: BuildOpts) {
  const doc = await generateInvoicePdf(opts)
  const filename = `${opts.invoice.client?.name ?? 'invoice'} - ${
    opts.invoice.createdAt
      ? format(new Date(opts.invoice.createdAt), 'dd-MM-yyyy')
      : format(new Date(), 'dd-MM-yyyy')
  }.pdf`
  doc.save(filename)
}
