import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { username, password } = req.body
  if (!username || !password) return res.status(400).json({ error: 'username/password required' })

  const student = await prisma.student.findUnique({ where: { username } })
  if (!student) return res.status(401).json({ error: '未找到该学生账号' })

  if (!student.passwordHash) return res.status(500).json({ error: '学生密码未设置' })

  const valid = await bcrypt.compare(password, student.passwordHash)
  if (!valid) return res.status(401).json({ error: '密码错误' })

  const token = jwt.sign({ sub: student.id, role: 'student' }, JWT_SECRET, { expiresIn: '7d' })
  res.status(200).json({ token, mustChangePassword: student.mustChangePassword, studentNo: student.studentNo })
}
