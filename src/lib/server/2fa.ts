import crypto from 'crypto'

const SECRET = process.env.ADMIN_2FA_SECRET || 'dev-secret-change-me'
const IS_PROD = process.env.NODE_ENV === 'production'

type Payload = { uid: string; ip: string; exp: number }

function b64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}
function b64urlJson(obj: any) {
  return b64url(JSON.stringify(obj))
}

export function normalizeIp(ip: string | null | undefined) {
  if (!ip) return '127.0.0.1'
  let v = ip.trim()
  // Ta første IP hvis XFF-liste
  if (v.includes(',')) v = v.split(',')[0].trim()
  if (v === '::1') return '127.0.0.1'
  if (v.startsWith('::ffff:')) return v.slice(7)
  return v
}

export function signTrustToken(uid: string, ip: string, days = 14) {
  const exp = Math.floor(Date.now() / 1000) + days * 24 * 3600
  const header = b64urlJson({ alg: 'HS256', typ: 'JWT' })
  // I dev ignorerer vi IP-binding; i prod binder vi til normalisert IP
  const ipClaim = IS_PROD ? normalizeIp(ip) : 'dev'
  const payload = b64urlJson({ uid, ip: ipClaim, exp } as Payload)
  const data = `${header}.${payload}`
  const sig = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
  return `${data}.${sig}`
}

export function verifyTrustToken(token: string | null | undefined, ip: string) {
  try {
    if (!token) return null
    const [h, p, s] = token.split('.')
    if (!h || !p || !s) return null
    const data = `${h}.${p}`
    const expected = crypto.createHmac('sha256', SECRET).update(data).digest('base64url')
    if (!crypto.timingSafeEqual(Buffer.from(s), Buffer.from(expected))) return null
    const payload = JSON.parse(Buffer.from(p, 'base64url').toString()) as Payload
    if (payload.exp < Math.floor(Date.now() / 1000)) return null

    if (IS_PROD) {
      const nowIp = normalizeIp(ip)
      if (payload.ip !== nowIp) return null
    } else {
      // i dev: ingen IP-sjekk
    }
    return payload
  } catch {
    return null
  }
}
