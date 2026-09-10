import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET) as any
  } catch (e) {
    return null
  }
}

export function getTokenFromReq(req: any) {
  const h = req.headers?.authorization
  if (!h) return null
  const parts = h.split(' ')
  if (parts.length !== 2) return null
  return parts[1]
}
