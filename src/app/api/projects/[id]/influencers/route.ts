import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { z } from "zod";
import { normalizeSettlementStatus, settlementStatusInput } from "@/lib/settlement-status";

const collaboratorSchema = z.object({
    influencerId: z.string().min(1),
    fee: z.number().min(0),
    paymentStatus: settlementStatusInput,
    paymentDueDate: z.string().nullable().optional(),
    paymentDate: z.string().nullable().optional(),
});

// undefined면 기존 값을 유지하고(undefined 반환), null/""이면 비운다
function toDateUpdate(value: string | null | undefined): Date | null | undefined {
    if (value === undefined) return undefined;
    return value ? new Date(value) : null;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const auth = await requireSession();
    if (auth.response) return auth.response;

    try {
        const { id } = await params;
        const body = await request.json();
        const { collaborators } = z
            .object({
                collaborators: z.array(collaboratorSchema),
            })
            .parse(body);

        const existingInfluencers = await prisma.projectInfluencer.findMany({
            where: { projectId: id },
            select: { id: true, influencerId: true, paymentDate: true },
        });
        const existingByInfluencer = new Map(
            existingInfluencers.map((existing) => [existing.influencerId, existing])
        );

        const incomingIds = new Set(collaborators.map((c) => c.influencerId));
        const now = new Date();

        const upserts = collaborators.map((collaborator) => {
            const existing = existingByInfluencer.get(collaborator.influencerId);
            let paymentDate = toDateUpdate(collaborator.paymentDate);
            // 화면은 정산일을 보내지 않는다. 완료로 바뀌었는데 정산일이 없을 때만 오늘로 기록
            // (예전에는 저장할 때마다 정산일이 null로 지워졌다)
            if (
                paymentDate === undefined &&
                collaborator.paymentStatus === "COMPLETED" &&
                !existing?.paymentDate
            ) {
                paymentDate = now;
            }

            return prisma.projectInfluencer.upsert({
                where: {
                    projectId_influencerId: {
                        projectId: id,
                        influencerId: collaborator.influencerId,
                    },
                },
                update: {
                    fee: collaborator.fee,
                    paymentStatus: collaborator.paymentStatus,
                    paymentDueDate: toDateUpdate(collaborator.paymentDueDate),
                    paymentDate,
                },
                create: {
                    projectId: id,
                    influencerId: collaborator.influencerId,
                    fee: collaborator.fee,
                    paymentStatus: collaborator.paymentStatus,
                    paymentDueDate: toDateUpdate(collaborator.paymentDueDate) ?? null,
                    paymentDate: paymentDate ?? null,
                },
            });
        });

        const deletions = existingInfluencers
            .filter((existing) => !incomingIds.has(existing.influencerId))
            .map((existing) =>
                prisma.projectInfluencer.delete({
                    where: { id: existing.id },
                })
            );

        await prisma.$transaction([...upserts, ...deletions]);

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                ProjectInfluencer: {
                    include: {
                        Influencer: true,
                    },
                },
            },
        });

        return NextResponse.json({
            projectInfluencers:
                project?.ProjectInfluencer.map((pi) => ({
                    ...pi,
                    paymentStatus: normalizeSettlementStatus(pi.paymentStatus),
                    influencer: pi.Influencer,
                })) || [],
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.issues },
                { status: 400 }
            );
        }
        console.error("POST /api/projects/[id]/influencers error:", error);
        return NextResponse.json(
            { error: "Failed to update collaborators" },
            { status: 500 }
        );
    }
}
