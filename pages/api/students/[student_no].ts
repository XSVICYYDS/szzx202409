import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'
import { getTokenFromReq, verifyToken } from '../../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { student_no } = req.query
  if (!student_no || typeof student_no !== 'string') return res.status(400).end()

  const token = getTokenFromReq(req)
  const payload = token ? verifyToken(token) : null

  const student = await prisma.student.findUnique({ where: { studentNo: student_no } })
  if (!student) return res.status(404).json({ error: 'not found' })

  // if admin, return all poems; if owner student, return all poems; otherwise only published poems
  if (payload && payload.role === 'admin') {
    const full = await prisma.student.findUnique({ where: { studentNo: student_no }, include: { poems: true } })
    return res.status(200).json(full)
  }

  if (payload && payload.role === 'student' && payload.sub === student.id) {
    const full = await prisma.student.findUnique({ where: { studentNo: student_no }, include: { poems: true } })
    return res.status(200).json(full)
  }

  // public: only published poems
  const limited = await prisma.student.findUnique({ where: { studentNo: student_no }, include: { poems: { where: { status: 'published' } } } })
  if (!limited) return res.status(404).json({ error: 'not found' })
  return res.status(200).json(limited)
}
