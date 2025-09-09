import crypto from 'crypto'

const RAW_KEY = process.env.ADMIN_2FA_SECRET || 'dev-secret-change-me'
const KEY = crypto.createHash('sha256').update(RAW_KEY).digest() // 32 bytes

type EncPayload = { v: 1; iv: string; ct: string; tag: string }

export function encryptText(plain: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  const payload: EncPayload = { v: 1, iv: iv.toString('base64'), ct: ct.toString('base64'), tag: tag.toString('base64') }
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

export function decryptText(token: string): string {
  const payload = JSON.parse(Buffer.from(token, 'base64').toString('utf8')) as EncPayload
  const iv = Buffer.from(payload.iv, 'base64')
  const ct = Buffer.from(payload.ct, 'base64')
  const tag = Buffer.from(payload.tag, 'base64')
  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(tag)
  const pt = Buffer.concat([decipher.update(ct), decipher.final()])
  return pt.toString('utf8')
}
