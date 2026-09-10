import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { studentNo } = req.body
  if (!studentNo) return res.status(400).json({ error: 'studentNo required' })

  const student = await prisma.student.findUnique({ where: { studentNo } })
  if (!student) return res.status(401).json({ error: '未找到该学号' })

  const token = jwt.sign({ sub: student.id, role: 'student' }, JWT_SECRET, { expiresIn: '7d' })
  res.status(200).json({ token })
}
