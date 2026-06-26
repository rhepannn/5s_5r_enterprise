import { Prisma } from '@prisma/client';
import { prisma } from '@/config/prisma';
import type { UserRole } from '@prisma/client';

export interface TrailActor {
  id: string;
  email: string;
  role: UserRole;
}

interface TrailInput {
  entity: string;
  entityId: string;
  action: string;
  fromStatus?: string | null;
  toStatus?: string | null;
  changes?: Record<string, unknown>;
  notes?: string | null;
  actor: TrailActor;
}

/**
 * Catat satu entri audit trail. Dipanggil di setiap transisi status / perubahan penting.
 * userName disimpan denormalized (snapshot) supaya histori tetap utuh walau user berubah/dihapus.
 */
export async function logTrail(input: TrailInput) {
  return prisma.auditTrail.create({
    data: {
      entity: input.entity,
      entityId: input.entityId,
      action: input.action,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      changes: input.changes ? (input.changes as Prisma.InputJsonValue) : Prisma.JsonNull,
      notes: input.notes ?? null,
      userId: input.actor.id,
      userName: input.actor.email,
      userRole: input.actor.role,
    },
  });
}

export async function getTrail(entity: string, entityId: string) {
  return prisma.auditTrail.findMany({
    where: { entity, entityId },
    orderBy: { createdAt: 'desc' },
  });
}
