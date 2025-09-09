import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    // Nå tar vi også imot phone!
    const { name, email, phone, message } = await req.json()

    // Valider at ALLE felt er utfylt, inkludert phone
    if (!name || !email || !phone || !message) {
      return NextResponse.json({ error: 'Alle felt må fylles ut.' }, { status: 400 })
    }

    // Sjekk at API-nøkkel finnes
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'RESEND_API_KEY mangler i miljøvariabler.' }, { status: 500 })
    }

    // Send epost via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Anbudsmarkedet <noreply@anbudsmarkedet.no>',
        to: ['post@anbudsmarkedet.no'],
        subject: 'Ny henvendelse fra kontaktskjema',
        html: `
          <b>Navn:</b> ${name}<br/>
          <b>E-post:</b> ${email}<br/>
          <b>Telefon:</b> ${phone}<br/>
          <b>Melding:</b><br/>${message.replace(/\n/g, '<br/>')}
        `
      })
    })

    if (!res.ok) {
      let errorText = 'Kunne ikke sende e-post.'
      try {
        const error = await res.json()
        errorText = error.message || errorText
      } catch (e) {}
      return NextResponse.json({ error: errorText }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    // Catch evt. JSON-parsingsfeil og annet
    return NextResponse.json(
      { error: error?.message || 'Ukjent feil, prøv igjen.' },
      { status: 500 }
    )
  }
}
