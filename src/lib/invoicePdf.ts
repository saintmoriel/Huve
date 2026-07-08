import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type InvoicePdfData = {
  invoiceLabel: string
  issueDate: string | null      // ISO date
  dueDate: string | null        // ISO date
  total: number
  amountPaid: number            // sum of payments so far
  business: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
    paymentInstructions?: string | null
  }
  clientName: string
  lineItems: { description: string; quantity: number; unit_price: number }[]
}

function naira(n: number): string {
  return `NGN ${Number(n).toLocaleString()}`
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export async function generateInvoicePdf(data: InvoicePdfData): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  const page = doc.addPage([595, 842]) // A4
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const { width } = page.getSize()
  const margin = 50
  const dark = rgb(0.04, 0.08, 0.06)
  const gray = rgb(0.45, 0.45, 0.45)
  const green = rgb(0.086, 0.639, 0.290)

  let y = 780

  // Header
  page.drawText(data.business.name || 'Your Business', { x: margin, y, size: 18, font: bold, color: dark })
  page.drawText('INVOICE', { x: width - margin - 92, y, size: 18, font: bold, color: green })
  y -= 16

  const contactBits = [data.business.address, data.business.phone, data.business.email].filter(Boolean).join('  ·  ')
  if (contactBits) {
    page.drawText(contactBits, { x: margin, y, size: 8, font, color: gray })
  }
  y -= 36

  // Bill to + meta
  page.drawText('BILL TO', { x: margin, y, size: 8, font: bold, color: gray })
  page.drawText(`Invoice #: ${data.invoiceLabel}`, { x: width - margin - 175, y, size: 9, font, color: dark })
  y -= 13
  page.drawText(data.clientName || 'Client', { x: margin, y, size: 11, font: bold, color: dark })
  page.drawText(`Issue date: ${fmtDate(data.issueDate)}`, { x: width - margin - 175, y, size: 9, font, color: dark })
  y -= 13
  page.drawText(`Due date: ${fmtDate(data.dueDate)}`, { x: width - margin - 175, y, size: 9, font, color: dark })
  y -= 34

  // Table header
  page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 22, color: rgb(0.96, 0.98, 0.96) })
  page.drawText('DESCRIPTION', { x: margin + 8, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('QTY', { x: width - margin - 210, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('UNIT PRICE', { x: width - margin - 165, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('AMOUNT', { x: width - margin - 65, y: y + 2, size: 8, font: bold, color: gray })
  y -= 26

  // Line items
  let computed = 0
  for (const it of data.lineItems) {
    const amount = it.quantity * it.unit_price
    computed += amount
    const desc = it.description.length > 46 ? it.description.slice(0, 45) + '…' : it.description
    page.drawText(desc, { x: margin + 8, y, size: 10, font, color: dark })
    page.drawText(String(it.quantity), { x: width - margin - 210, y, size: 10, font, color: dark })
    page.drawText(naira(it.unit_price), { x: width - margin - 165, y, size: 10, font, color: dark })
    page.drawText(naira(amount), { x: width - margin - 65, y, size: 10, font, color: dark })
    y -= 20
    if (y < 160) break
  }

  const total = data.total || computed
  const amountDue = Math.max(0, total - (data.amountPaid || 0))

  y -= 6
  page.drawLine({ start: { x: width - margin - 210, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
  y -= 18

  // Summary: subtotal, amount paid, balance due
  page.drawText('Subtotal', { x: width - margin - 210, y, size: 9, font, color: gray })
  page.drawText(naira(total), { x: width - margin - 95, y, size: 9, font, color: dark })
  y -= 15

  if (data.amountPaid > 0) {
    page.drawText('Amount paid', { x: width - margin - 210, y, size: 9, font, color: gray })
    page.drawText(naira(data.amountPaid), { x: width - margin - 95, y, size: 9, font, color: dark })
    y -= 17
  }

  page.drawText(data.amountPaid > 0 ? 'BALANCE DUE' : 'TOTAL DUE', { x: width - margin - 210, y, size: 11, font: bold, color: dark })
  page.drawText(naira(amountDue), { x: width - margin - 95, y, size: 12, font: bold, color: green })
  y -= 40

  // Payment instructions
  if (data.business.paymentInstructions) {
    page.drawText('Payment details', { x: margin, y, size: 9, font: bold, color: dark })
    y -= 13
    // Wrap long payment instructions across lines if needed
    const words = data.business.paymentInstructions.split(' ')
    let line = ''
    for (const w of words) {
      if ((line + ' ' + w).length > 90) {
        page.drawText(line, { x: margin, y, size: 9, font, color: gray })
        y -= 12
        line = w
      } else {
        line = line ? `${line} ${w}` : w
      }
    }
    if (line) { page.drawText(line, { x: margin, y, size: 9, font, color: gray }); y -= 12 }
    y -= 12
  }

  page.drawText(`Thank you for your business — ${data.business.name || ''}`, { x: margin, y, size: 9, font, color: gray })

  return await doc.save()
}