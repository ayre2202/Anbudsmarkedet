// src/app/api/verify-recaptcha/route.ts
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { token } = await request.json()
    console.log('Received reCAPTCHA token:', token); // Debug log

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA token is missing' },
        { status: 400 }
      )
    }

    const secretKey = process.env.RECAPTCHA_SECRET_KEY
    if (!secretKey) {
      console.error('RECAPTCHA_SECRET_KEY is not set');
      return NextResponse.json(
        { success: false, error: 'Server configuration error' },
        { status: 500 }
      )
    }

    const verificationUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    const response = await fetch(verificationUrl, { method: 'POST' })
    const data = await response.json()
    console.log('reCAPTCHA verification response:', data); // Debug log

    if (data.success && data.score >= 0.5) {
      return NextResponse.json({ success: true }, { status: 200 })
    } else {
      return NextResponse.json(
        { success: false, error: 'reCAPTCHA verification failed' },
        { status: 400 }
      )
    }
  } catch (error) {
    console.error('reCAPTCHA verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Server error during reCAPTCHA verification' },
      { status: 500 }
    )
  }
}