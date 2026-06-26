import { z } from 'zod';
import { prisma } from '@/config/prisma';
import { AppError } from '@/middlewares/errorHandler';
import type { Prisma, KaizenStatus } from '@prisma/client';

export const createIdeaSchema = z.object({
  title: z.string().min(3, 'Judul minimal 3 karakter'),
  description: z.string().min(5, 'Deskripsi wajib diisi'),
  divisionId: z.string().min(1, 'Divisi wajib dipilih'),
  estimatedSaving: z.number().nonnegative().optional(),
});
export type CreateIdeaInput = z.infer<typeof createIdeaSchema>;

const scope = (companyId: string): Prisma.KaizenIdeaWhereInput => ({ division: { department: { plant: { companyId } } } });

export async function listIdeas(companyId: string, userId: string, filters: { status?: string; divisionId?: string }) {
  const ideas = await prisma.kaizenIdea.findMany({
    where: {
      ...scope(companyId),
      ...(filters.status && { status: filters.status as KaizenStatus }),
      ...(filters.divisionId && { divisionId: filters.divisionId }),
    },
    include: { division: { select: { name: true } }, submittedBy: { select: { name: true } } },
    orderBy: [{ voteCount: 'desc' }, { createdAt: 'desc' }],
  });

  const myVotes = await prisma.kaizenVote.findMany({
    where: { userId, ideaId: { in: ideas.map((i) => i.id) } },
    select: { ideaId: true },
  });
  const voted = new Set(myVotes.map((v) => v.ideaId));
  return ideas.map((i) => ({ ...i, hasVoted: voted.has(i.id) }));
}

export async function createIdea(companyId: string, userId: string, input: CreateIdeaInput) {
  const div = await prisma.division.findFirst({ where: { id: input.divisionId, department: { plant: { companyId } } } });
  if (!div) throw new AppError('Divisi tidak ditemukan', 404);
  return prisma.kaizenIdea.create({
    data: {
      title: input.title, description: input.description, divisionId: input.divisionId,
      submittedById: userId, estimatedSaving: input.estimatedSaving ?? null,
    },
  });
}

/** Toggle vote (1 suara per user). */
export async function toggleVote(ideaId: string, companyId: string, userId: string) {
  const idea = await prisma.kaizenIdea.findFirst({ where: { id: ideaId, ...scope(companyId) } });
  if (!idea) throw new AppError('Ide tidak ditemukan', 404);

  const existing = await prisma.kaizenVote.findUnique({ where: { ideaId_userId: { ideaId, userId } } });
  if (existing) {
    await prisma.$transaction([
      prisma.kaizenVote.delete({ where: { id: existing.id } }),
      prisma.kaizenIdea.update({ where: { id: ideaId }, data: { voteCount: { decrement: 1 } } }),
    ]);
    return { voted: false, voteCount: idea.voteCount - 1 };
  }
  await prisma.$transaction([
    prisma.kaizenVote.create({ data: { ideaId, userId } }),
    prisma.kaizenIdea.update({ where: { id: ideaId }, data: { voteCount: { increment: 1 } } }),
  ]);
  return { voted: true, voteCount: idea.voteCount + 1 };
}

/** Adopsi ide menjadi proyek QCC. */
export async function adoptIdea(ideaId: string, companyId: string) {
  const idea = await prisma.kaizenIdea.findFirst({
    where: { id: ideaId, ...scope(companyId) },
    include: { submittedBy: { select: { name: true } } },
  });
  if (!idea) throw new AppError('Ide tidak ditemukan', 404);
  if (idea.status === 'ADOPTED') throw new AppError('Ide sudah diadopsi', 400);

  const target = new Date();
  target.setDate(target.getDate() + 30);

  const qcc = await prisma.qCCProject.create({
    data: {
      title: idea.title,
      divisionId: idea.divisionId,
      problemDesc: idea.description,
      members: [idea.submittedBy.name],
      startDate: new Date(),
      targetDate: target,
      savingCost: idea.estimatedSaving,
      status: 'PLAN',
    },
  });
  await prisma.kaizenIdea.update({ where: { id: ideaId }, data: { status: 'ADOPTED', qccProjectId: qcc.id } });
  return { idea: { ...idea, status: 'ADOPTED' as const, qccProjectId: qcc.id }, qccProject: qcc };
}

export async function rejectIdea(ideaId: string, companyId: string) {
  const idea = await prisma.kaizenIdea.findFirst({ where: { id: ideaId, ...scope(companyId) } });
  if (!idea) throw new AppError('Ide tidak ditemukan', 404);
  return prisma.kaizenIdea.update({ where: { id: ideaId }, data: { status: 'REJECTED' } });
}

export async function deleteIdea(ideaId: string, companyId: string) {
  const idea = await prisma.kaizenIdea.findFirst({ where: { id: ideaId, ...scope(companyId) } });
  if (!idea) throw new AppError('Ide tidak ditemukan', 404);
  await prisma.kaizenVote.deleteMany({ where: { ideaId } });
  return prisma.kaizenIdea.delete({ where: { id: ideaId } });
}
