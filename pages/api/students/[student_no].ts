import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { student_no } = req.query
  if (!student_no || typeof student_no !== 'string') return res.status(400).end()

  const student = await prisma.student.findUnique({ where: { studentNo: student_no }, include: { poems: true } })
  if (!student) return res.status(404).json({ error: 'not found' })
  return res.status(200).json(student)
}
