import crypto from 'crypto'
import { prisma } from '@/lib/db'

export async function ensureWebhookConfig() {
  const existing = await prisma.crmWebhookConfig.findUnique({ where: { id: 'singleton' } })
  if (existing) return existing
  return prisma.crmWebhookConfig.create({
    data: { id: 'singleton', secret: crypto.randomBytes(24).toString('hex') },
  })
}

export function generateWebhookSecret() {
  return crypto.randomBytes(24).toString('hex')
}
