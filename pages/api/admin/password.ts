import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import bcrypt from 'bcryptjs'
import { getTokenFromReq, verifyToken } from '../../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).end()

  const token = getTokenFromReq(req)
  const payload = token ? verifyToken(token) : null
  if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'unauthorized' })

  const { currentPassword, newPassword } = req.body
  if (!currentPassword || !newPassword) return res.status(400).json({ error: 'currentPassword and newPassword required' })

  const admin = await prisma.admin.findUnique({ where: { id: payload.sub } })
  if (!admin) return res.status(404).json({ error: 'admin not found' })

  const valid = await bcrypt.compare(currentPassword, admin.passwordHash)
  if (!valid) return res.status(403).json({ error: 'current password incorrect' })

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: hash } })

  return res.status(200).json({ message: '密码已更新' })
}
