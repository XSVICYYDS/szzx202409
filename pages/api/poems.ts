import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    const poems = await prisma.poem.findMany({ include: { student: true } })
    return res.status(200).json(poems)
  }
  res.status(405).end()
}
