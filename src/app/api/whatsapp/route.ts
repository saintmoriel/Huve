import { NextRequest, NextResponse } from 'next/server'

// This route simulates sending a WhatsApp message.
// Once a Twilio (or 360dialog) account is verified, replace the
// "SIMULATED SEND" block below with a real API call — everything
// else (the calling code, the data shape) stays the same.

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { to, message } = body

  if (!to || !message) {
    return NextResponse.json({ error: 'Missing "to" or "message"' }, { status: 400 })
  }

  // ---- SIMULATED SEND (swap this for real Twilio call later) ----
  console.log('--- WhatsApp message (simulated) ---')
  console.log('To:', to)
  console.log('Message:', message)
  console.log('-------------------------------------')

  // Example of what the real Twilio call will look like, for reference:
  //
  // const client = require('twilio')(accountSid, authToken)
  // await client.messages.create({
  //   from: 'whatsapp:+14155238886', // Twilio sandbox number
  //   to: `whatsapp:${to}`,
  //   body: message,
  // })

  return NextResponse.json({ success: true, simulated: true, to, message })
}
