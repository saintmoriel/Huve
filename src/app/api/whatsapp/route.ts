import { NextRequest, NextResponse } from 'next/server'
import twilio from 'twilio'

// Sends a WhatsApp message via Twilio.
// For the demo this uses the Twilio WhatsApp Sandbox: the recipient must first
// send the "join <code>" message to the sandbox number once from their phone.
// Once a full WhatsApp Business (WABA) sender is approved, only the
// TWILIO_WHATSAPP_FROM value changes — this code stays the same.

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { to, message, mediaUrl } = body

  if (!to || !message) {
    return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 })
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM // e.g. "whatsapp:+14155238886"

  // If credentials aren't configured, fall back to simulation so the app
  // never breaks (invoice generation should still succeed without WhatsApp).
  if (!accountSid || !authToken || !fromNumber) {
    console.log('--- WhatsApp message (simulated — Twilio not configured) ---')
    console.log('To:', to)
    console.log('Message:', message)
    if (mediaUrl) console.log('Media:', mediaUrl)
    console.log('-----------------------------------------------------------')
    return NextResponse.json({ success: true, simulated: true, to, message })
  }

  // Normalise the recipient into WhatsApp E.164 format: whatsapp:+234...
  const cleaned = String(to).replace(/\s+/g, '')
  const toWhatsApp = cleaned.startsWith('whatsapp:') ? cleaned : `whatsapp:${cleaned}`

  try {
    const client = twilio(accountSid, authToken)
    const payload: {
      from: string
      to: string
      body: string
      mediaUrl?: string[]
    } = {
      from: fromNumber,
      to: toWhatsApp,
      body: message,
    }
    // Attach the PDF (or any media) if a public URL was provided
    if (mediaUrl) payload.mediaUrl = [mediaUrl]

    const result = await client.messages.create(payload)

    return NextResponse.json({ success: true, simulated: false, sid: result.sid, status: result.status })
  } catch (err: unknown) {
    const messageText = err instanceof Error ? err.message : 'Unknown error sending WhatsApp message'
    console.error('Twilio WhatsApp send failed:', messageText)
    // Return 200 with success:false so the caller can decide what to do —
    // invoice generation treats a failed notification as non-fatal.
    return NextResponse.json({ success: false, error: messageText }, { status: 200 })
  }
}