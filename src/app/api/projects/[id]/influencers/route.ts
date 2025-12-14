import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const collaboratorSchema = z.object({
    influencerId: z.string().min(1),
    fee: z.number().min(0),
    paymentStatus: z.string().optional().default("pending"),
    paymentDueDate: z.string().nullable().optional(),
    paymentDate: z.string().nullable().optional(),
});

const normalizeStatus = (status?: string) => {
    const value = (status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress" || value === "requested") return "in_progress";
    return "pending";
};

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const parsed = z
            .object({
                collaborators: z.array(collaboratorSchema),
            })
            .parse(body);

        const collaborators = parsed.collaborators.map((collaborator) => ({
            ...collaborator,
            paymentStatus: normalizeStatus(collaborator.paymentStatus),
        }));

        const existingInfluencers = await prisma.projectInfluencer.findMany({
            where: { projectId: id },
            select: { id: true, influencerId: true },
        });

        const incomingIds = new Set(collaborators.map((c) => c.influencerId));

        const upserts = collaborators.map((collaborator) =>
            prisma.projectInfluencer.upsert({
                where: {
                    projectId_influencerId: {
                        projectId: id,
                        influencerId: collaborator.influencerId,
                    },
                },
                update: {
                    fee: collaborator.fee,
                    paymentStatus: collaborator.paymentStatus,
                    paymentDueDate: collaborator.paymentDueDate
                        ? new Date(collaborator.paymentDueDate)
                        : null,
                    paymentDate: collaborator.paymentDate
                        ? new Date(collaborator.paymentDate)
                        : null,
                },
                create: {
                    projectId: id,
                    influencerId: collaborator.influencerId,
                    fee: collaborator.fee,
                    paymentStatus: collaborator.paymentStatus,
                    paymentDueDate: collaborator.paymentDueDate
                        ? new Date(collaborator.paymentDueDate)
                        : null,
                    paymentDate: collaborator.paymentDate
                        ? new Date(collaborator.paymentDate)
                        : null,
                },
            })
        );

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
                    paymentStatus: normalizeStatus(pi.paymentStatus),
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
