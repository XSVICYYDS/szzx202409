import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import { getTokenFromReq, verifyToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH') return res.status(405).end()

  const token = getTokenFromReq(req)
  const payload = token ? verifyToken(token) : null
  if (!payload || payload.role !== 'student') return res.status(401).json({ error: 'unauthorized' })

  const { currentPassword, newPassword } = req.body
  if (!newPassword) return res.status(400).json({ error: 'newPassword required' })

  const student = await prisma.student.findUnique({ where: { id: payload.sub } })
  if (!student) return res.status(404).json({ error: 'student not found' })

  // If student has a passwordHash, require currentPassword to match
  if (student.passwordHash) {
    if (!currentPassword) return res.status(400).json({ error: 'currentPassword required' })
    const valid = await bcrypt.compare(currentPassword, student.passwordHash)
    if (!valid) return res.status(403).json({ error: 'current password incorrect' })
  }

  const hash = await bcrypt.hash(newPassword, 10)
  await prisma.student.update({ where: { id: student.id }, data: { passwordHash: hash, mustChangePassword: false } })

  return res.status(200).json({ message: '密码已更新' })
}
