import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'
import { getTokenFromReq, verifyToken } from '../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const token = getTokenFromReq(req)
    const payload = token ? verifyToken(token) : null
    if (payload && payload.role === 'admin') {
      const poems = await prisma.poem.findMany({ include: { student: true } })
      return res.status(200).json(poems)
    }
    const poems = await prisma.poem.findMany({ where: { status: 'published' }, include: { student: true } })
    return res.status(200).json(poems)
  }

  if (req.method === 'POST') {
    const token = getTokenFromReq(req)
    const payload = token ? verifyToken(token) : null
    if (!payload || payload.role !== 'student') return res.status(401).json({ error: 'unauthorized' })

    const { title, content, studentNo } = req.body
    if (!content || !studentNo) return res.status(400).json({ error: 'title/content/studentNo required' })

    const student = await prisma.student.findUnique({ where: { studentNo } })
    if (!student) return res.status(400).json({ error: 'student not found' })
    if (student.id !== payload.sub) return res.status(403).json({ error: 'forbidden' })

    const poem = await prisma.poem.create({
      data: {
        title: title || '未命名',
        content,
        studentId: student.id,
        status: 'draft'
      }
    })

    return res.status(200).json({ poem, message: '提交成功，等待管理员审核' })
  }

  res.status(405).end()
}
