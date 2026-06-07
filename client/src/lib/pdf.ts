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
  element?: HTMLElement | null
}

export async function generateInvoicePdf({ invoice, profile, totalReceived }: BuildOpts) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4', compress: true })
  const pageWidth   = doc.internal.pageSize.getWidth()
  const pageHeight  = doc.internal.pageSize.getHeight()
  const M           = 40               // margin
  const W           = pageWidth - M * 2 // content width
  const RX          = pageWidth - M    // right edge
  let y             = M

  const balance     = Math.max(0, Number(invoice.total) - totalReceived)
  const statusText  = deriveStatus({ total: invoice.total, totalAmountReceived: totalReceived, paymentRecords: invoice.paymentRecords, type: invoice.type })
  const isPaid      = statusText === 'Paid'
  const issuedDate  = invoice.createdAt ? format(new Date(invoice.createdAt), 'MMM d, yyyy') : '—'
  const dueDate     = invoice.dueDate   ? format(new Date(invoice.dueDate),   'MMM d, yyyy') : '—'
  const cur         = invoice.currency ?? ''

  // ── HEADER: logo (left) + company name | invoice # + status (right) ──
  const logo    = await loadLogo()
  const logoH   = 64
  const logoW   = logo ? logoH / (logo.h / logo.w) : 0

  if (logo) {
    doc.addImage(logo.dataUrl, logo.format, M, y, logoW, logoH, undefined, 'FAST')
  }

  // Company name + contact beside the logo
  const nameX = M + logoW + 12
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(INK)
  doc.text('Alhadian Travels Pvt Ltd', nameX, y + 20)
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
  let nameInfoY = y + 32
  for (const e of splitMulti(profile?.email))       { doc.text(e, nameX, nameInfoY); nameInfoY += 10 }
  for (const p of splitMulti(profile?.phoneNumber)) { doc.text(p, nameX, nameInfoY); nameInfoY += 10 }

  // Invoice type + number + badge — right side, same row as logo
  const docType = String(invoice.type ?? 'Invoice').toUpperCase()
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(MUTED)
  doc.text(docType, RX, y + 14, { align: 'right' })
  doc.setFont('helvetica', 'bold').setFontSize(28).setTextColor(INK)
  doc.text(`#${invoice.invoiceNumber ?? '—'}`, RX, y + 42, { align: 'right' })
  drawStatusPill(doc, RX, y + 48, statusText)

  y += Math.max(logoH, nameInfoY - y) + 14
  drawDivider(doc, M, y, RX)
  y += 16

  // ── SECTION: FROM (left) | BILL TO (right) ───────────────────────
  const gap      = 32
  const colW     = (W - gap) / 2
  const fromX    = M
  const billX    = M + colW + gap

  const writeLine = (text: string, x: number, cy: number, maxW: number): number => {
    const lines = doc.splitTextToSize(text, maxW)
    doc.text(lines, x, cy)
    return cy + lines.length * 11
  }

  doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
  doc.text('FROM', fromX, y)
  doc.text('BILL TO', billX, y)
  y += 11

  // FROM name
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(INK)
  const fromName  = profile?.businessName || profile?.name || BRAND_NAME
  const fromLines = doc.splitTextToSize(fromName, colW)
  doc.text(fromLines, fromX, y)
  // BILL TO name
  const billLines = doc.splitTextToSize(invoice.client?.name ?? '—', colW)
  doc.text(billLines, billX, y)

  let fromY = y + Math.max(fromLines.length, 1) * 12 + 2
  let billY = y + Math.max(billLines.length, 1) * 12 + 2

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(MUTED)
  for (const e of splitMulti(profile?.email))         fromY = writeLine(e, fromX, fromY, colW)
  for (const p of splitMulti(profile?.phoneNumber))   fromY = writeLine(p, fromX, fromY, colW)
  if (profile?.contactAddress)                        fromY = writeLine(profile.contactAddress, fromX, fromY, colW)

  for (const e of splitMulti(invoice.client?.email))  billY = writeLine(e, billX, billY, colW)
  for (const p of splitMulti(invoice.client?.phone))  billY = writeLine(p, billX, billY, colW)
  if (invoice.client?.address)                        billY = writeLine(invoice.client.address, billX, billY, colW)

  y = Math.max(fromY, billY) + 14

  // ── SECTION: Invoice meta grid (Issued | Due | Currency | Total) ──
  drawDivider(doc, M, y, RX)
  y += 14

  const metaW   = W / 4
  const metas   = [
    { label: 'ISSUED',   value: issuedDate },
    { label: 'DUE',      value: dueDate },
    { label: 'CURRENCY', value: cur || '—' },
    { label: 'TOTAL',    value: `${cur} ${toCommas(invoice.total)}` },
  ]
  metas.forEach((m, i) => {
    const mx = M + i * metaW
    doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
    doc.text(m.label, mx, y)
    doc.setFontSize(9.5).setFont('helvetica', 'bold').setTextColor(INK)
    doc.text(m.value, mx, y + 13)
  })
  y += 32

  // ── ITEMS TABLE ───────────────────────────────────────────────────
  drawDivider(doc, M, y, RX)
  y += 4
  ensureSpace(doc, y, 80, () => { y = M })

  const items = invoice.items ?? []
  autoTable(doc, {
    startY: y,
    head: [[
      { content: 'ITEM',   styles: { halign: 'left' } },
      { content: 'QTY',    styles: { halign: 'right' } },
      { content: 'PRICE',  styles: { halign: 'right' } },
      { content: 'DISC %', styles: { halign: 'right' } },
      { content: 'AMOUNT', styles: { halign: 'right' } },
    ]],
    body: items.map(it => [
      it.itemName || '—',
      it.quantity  || '0',
      toCommas(it.unitPrice),
      it.discount  || '0',
      toCommas(lineAmount(it)),
    ]),
    theme: 'plain',
    styles: {
      font: 'helvetica', fontSize: 9.5,
      cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
      textColor: INK, lineColor: BORDER, lineWidth: { bottom: 0.5 }, valign: 'middle',
    },
    headStyles: {
      fontSize: 7.5, fontStyle: 'bold',
      fillColor: [248, 250, 252], textColor: MUTED,
      lineColor: BORDER, lineWidth: { bottom: 0.75 },
      cellPadding: { top: 7, bottom: 7, left: 10, right: 10 },
    },
    columnStyles: {
      0: { cellWidth: 'auto', halign: 'left' },
      1: { cellWidth: 50,  halign: 'right' },
      2: { cellWidth: 65,  halign: 'right' },
      3: { cellWidth: 55,  halign: 'right' },
      4: { cellWidth: 80,  halign: 'right' },
    },
    margin: { left: M, right: M },
  })

  // @ts-expect-error -- autotable adds lastAutoTable
  y = (doc.lastAutoTable?.finalY ?? y) + 10

  // ── NOTES ─────────────────────────────────────────────────────────
  if (invoice.notes) {
    ensureSpace(doc, y, 40, () => { y = M })
    doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
    doc.text('NOTES / PAYMENT INFO', M, y)
    y += 11
    doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(INK)
    const noteLines = doc.splitTextToSize(invoice.notes, W)
    doc.text(noteLines, M, y)
    y += noteLines.length * 12 + 10
  }

  // ── SUMMARY ───────────────────────────────────────────────────────
  const ratesNum = Number(invoice.rates) || 0
  type SRow = { label: string; value: string; bold?: boolean; gap?: number }
  const summaryRows: SRow[] = [
    { label: 'Subtotal',            value: `${cur} ${toCommas(invoice.subTotal)}` },
    { label: `VAT (${ratesNum}%)`,  value: `${cur} ${toCommas(invoice.vat)}` },
    { label: 'Total',               value: `${cur} ${toCommas(invoice.total)}`,     bold: true, gap: 6 },
    { label: 'Paid',                value: `${cur} ${toCommas(totalReceived)}` },
    { label: 'Balance due',         value: `${cur} ${toCommas(balance)}`,           bold: true, gap: 6 },
  ]
  ensureSpace(doc, y, summaryRows.length * 16 + 30, () => { y = M })
  y += 6
  const valColW   = 110
  const lblRX     = RX - valColW
  for (const row of summaryRows) {
    if (row.gap) y += row.gap
    doc.setFontSize(row.bold ? 10 : 9)
    doc.setFont('helvetica', row.bold ? 'bold' : 'normal').setTextColor(row.bold ? INK : MUTED)
    doc.text(row.label, lblRX, y, { align: 'right' })
    doc.setFont('helvetica', 'bold').setTextColor(INK)
    doc.text(row.value, RX, y, { align: 'right' })
    y += row.bold ? 16 : 13
  }
  y += 10

  // ── PAYMENT HISTORY ───────────────────────────────────────────────
  if (invoice.paymentRecords?.length) {
    ensureSpace(doc, y, 70, () => { y = M })
    doc.setFontSize(7.5).setFont('helvetica', 'bold').setTextColor(MUTED)
    doc.text(`PAYMENT HISTORY (${invoice.paymentRecords.length})`, M, y)
    y += 6
    autoTable(doc, {
      startY: y,
      head: [[
        { content: 'DATE PAID', styles: { halign: 'left' } },
        { content: 'AMOUNT',    styles: { halign: 'right' } },
        { content: 'METHOD',    styles: { halign: 'left' } },
        { content: 'NOTE',      styles: { halign: 'left' } },
      ]],
      body: invoice.paymentRecords.map((p: PaymentRecord) => [
        p.datePaid ? format(new Date(p.datePaid), 'MMM d, yyyy') : '—',
        toCommas(p.amountPaid),
        p.paymentMethod ?? '—',
        p.note ?? '',
      ]),
      theme: 'plain',
      styles: { font: 'helvetica', fontSize: 9, cellPadding: { top: 5, bottom: 5, left: 10, right: 10 }, textColor: INK, lineColor: BORDER, lineWidth: { bottom: 0.5 }, valign: 'middle' },
      headStyles: { fontSize: 7.5, fontStyle: 'bold', fillColor: [248, 250, 252], textColor: MUTED, lineColor: BORDER, lineWidth: { bottom: 0.75 }, cellPadding: { top: 6, bottom: 6, left: 10, right: 10 } },
      columnStyles: { 1: { halign: 'right' } },
      margin: { left: M, right: M },
    })
  }

  // ── FOOTER (every page) ───────────────────────────────────────────
  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    doc.setDrawColor(BORDER).setLineWidth(0.5)
    doc.line(M, pageHeight - 26, RX, pageHeight - 26)
    doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(MUTED)
    doc.text('Thank you for your business.', M, pageHeight - 14)
    if (totalPages > 1) {
      doc.text(`Page ${p} of ${totalPages}`, RX, pageHeight - 14, { align: 'right' })
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
