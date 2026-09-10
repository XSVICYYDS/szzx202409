import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username/password required' })

  const admin = await prisma.admin.findUnique({ where: { username } })
  if (!admin) return res.status(401).json({ error: '管理员不存在' })

  const valid = await bcrypt.compare(password, admin.passwordHash)
  if (!valid) return res.status(401).json({ error: '密码错误' })

  const token = jwt.sign({ sub: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
  res.status(200).json({ token })
}
