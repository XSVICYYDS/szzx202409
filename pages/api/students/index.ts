import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret'

function getToken(req: NextApiRequest) {
  const h = req.headers.authorization
  if (!h) return null
  const parts = h.split(' ')
  if (parts.length !== 2) return null
  return parts[1]
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getToken(req)
  try {
    const payload: any = token ? jwt.verify(token, JWT_SECRET) : null
    if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'unauthorized' })
  } catch (e) {
    return res.status(401).json({ error: 'unauthorized' })
  }

  if (req.method === 'GET') {
    const students = await prisma.student.findMany({ select: { id: true, name: true, studentNo: true, bio: true } })
    return res.status(200).json(students)
  }

  res.status(405).end()
}
