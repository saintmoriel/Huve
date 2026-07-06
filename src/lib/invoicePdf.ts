import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export type InvoicePdfData = {
  invoiceLabel: string
  createdAt: string
  dueDate: string | null
  total: number
  business: {
    name: string
    address?: string | null
    phone?: string | null
    email?: string | null
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
  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  const { width } = page.getSize()
  const margin = 50
  const dark = rgb(0.04, 0.08, 0.06)
  const gray = rgb(0.45, 0.45, 0.45)
  const green = rgb(0.086, 0.639, 0.290)

  let y = 780

  page.drawText(data.business.name || 'Your Business', { x: margin, y, size: 20, font: bold, color: dark })
  page.drawText('INVOICE', { x: width - margin - 92, y, size: 20, font: bold, color: green })
  y -= 18

  const contactBits = [data.business.address, data.business.phone, data.business.email].filter(Boolean).join('  ·  ')
  if (contactBits) {
    page.drawText(contactBits, { x: margin, y, size: 9, font, color: gray })
  }
  y -= 40

  page.drawText('BILL TO', { x: margin, y, size: 8, font: bold, color: gray })
  page.drawText(`Invoice #: ${data.invoiceLabel}`, { x: width - margin - 170, y, size: 9, font, color: dark })
  y -= 14
  page.drawText(data.clientName || 'Client', { x: margin, y, size: 11, font: bold, color: dark })
  page.drawText(`Date: ${fmtDate(data.createdAt)}`, { x: width - margin - 170, y, size: 9, font, color: dark })
  y -= 14
  page.drawText(`Due: ${fmtDate(data.dueDate)}`, { x: width - margin - 170, y, size: 9, font, color: dark })
  y -= 40

  page.drawRectangle({ x: margin, y: y - 4, width: width - margin * 2, height: 22, color: rgb(0.96, 0.98, 0.96) })
  page.drawText('DESCRIPTION', { x: margin + 8, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('QTY', { x: width - margin - 210, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('UNIT PRICE', { x: width - margin - 165, y: y + 2, size: 8, font: bold, color: gray })
  page.drawText('AMOUNT', { x: width - margin - 65, y: y + 2, size: 8, font: bold, color: gray })
  y -= 28

  let computed = 0
  for (const it of data.lineItems) {
    const amount = it.quantity * it.unit_price
    computed += amount
    const desc = it.description.length > 48 ? it.description.slice(0, 47) + '…' : it.description
    page.drawText(desc, { x: margin + 8, y, size: 10, font, color: dark })
    page.drawText(String(it.quantity), { x: width - margin - 210, y, size: 10, font, color: dark })
    page.drawText(naira(it.unit_price), { x: width - margin - 165, y, size: 10, font, color: dark })
    page.drawText(naira(amount), { x: width - margin - 65, y, size: 10, font, color: dark })
    y -= 22
    if (y < 120) break
  }

  const totalToShow = data.total || computed
  y -= 8
  page.drawLine({ start: { x: width - margin - 210, y }, end: { x: width - margin, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) })
  y -= 20
  page.drawText('TOTAL', { x: width - margin - 210, y, size: 11, font: bold, color: dark })
  page.drawText(naira(totalToShow), { x: width - margin - 100, y, size: 12, font: bold, color: green })
  y -= 46

  page.drawText('Payment details', { x: margin, y, size: 9, font: bold, color: dark })
  y -= 14
  page.drawText('Please pay by bank transfer to the account on file and quote your invoice number.', { x: margin, y, size: 9, font, color: gray })
  y -= 30
  page.drawText(`Thank you for your business — ${data.business.name || ''}`, { x: margin, y, size: 9, font, color: gray })

  return await doc.save()
}