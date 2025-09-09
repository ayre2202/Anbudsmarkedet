import crypto from 'crypto'

function base32Decode(b32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  const clean = b32.toUpperCase().replace(/[^A-Z2-7]/g, '')
  let bits = ''
  for (const c of clean) {
    const val = alphabet.indexOf(c)
    if (val === -1) continue
    bits += val.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2))
  }
  return Buffer.from(bytes)
}

function hotp(secret: string, counter: number, digits = 6): string {
  const key = base32Decode(secret)
  const buf = Buffer.alloc(8)
  for (let i = 7; i >= 0; i--) {
    buf[i] = counter & 0xff
    counter = Math.floor(counter / 256)
  }
  const h = crypto.createHmac('sha1', key).update(buf).digest()
  const offset = h[h.length - 1] & 0xf
  const code =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff)
  return (code % 10 ** digits).toString().padStart(digits, '0')
}

export function verifyTotp(secret: string, code: string, step = 30, window = 1, digits = 6, t0 = 0): boolean {
  const now = Math.floor(Date.now() / 1000)
  const counter = Math.floor((now - t0) / step)
  const normalized = code.replace(/\s+/g, '')
  for (let w = -window; w <= window; w++) {
    const c = counter + w
    if (hotp(secret, c, digits) === normalized) return true
  }
  return false
}

export function generateBase32Secret(length = 20): string {
  const bytes = crypto.randomBytes(length)
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
  let bits = ''
  for (const b of bytes) bits += b.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5)
    if (chunk.length < 5) break
    out += alphabet[parseInt(chunk, 2)]
  }
  return out
}

export function buildOtpAuthURL(issuer: string, account: string, secret: string): string {
  const label = encodeURIComponent(`${issuer}:${account}`)
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: 'SHA1',
    digits: '6',
    period: '30',
  })
  return `otpauth://totp/${label}?${params.toString()}`
}
