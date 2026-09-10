import type { NextApiRequest, NextApiResponse } from 'next'
import prisma from '../../../lib/prisma'
import { getTokenFromReq, verifyToken } from '../../../lib/auth'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const token = getTokenFromReq(req)
  const payload = token ? verifyToken(token) : null
  if (!payload || payload.role !== 'admin') return res.status(401).json({ error: 'unauthorized' })

  if (req.method === 'GET') {
    // pending (draft) poems
    const drafts = await prisma.poem.findMany({ where: { status: 'draft' }, include: { student: true } })
    return res.status(200).json(drafts)
  }

  if (req.method === 'PATCH') {
    const { id, action } = req.body
    if (!id || !action) return res.status(400).json({ error: 'id and action required' })

    if (action === 'publish') {
      const p = await prisma.poem.update({ where: { id }, data: { status: 'published' } })
      return res.status(200).json({ poem: p })
    }

    if (action === 'reject') {
      await prisma.poem.delete({ where: { id } })
      return res.status(200).json({ message: 'poem rejected and deleted' })
    }

    return res.status(400).json({ error: 'unknown action' })
  }

  res.status(405).end()
}
