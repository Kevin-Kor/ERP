import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const projectUpdateSchema = z.object({
    name: z.string().min(1).optional(),
    clientId: z.string().min(1).optional(),
    managerId: z.string().optional(),
    status: z.enum(["QUOTING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    contractAmount: z.number().min(0).optional(),
    platforms: z.string().optional(),
    contentTypes: z.string().optional(),
    memo: z.string().optional(),
});

// GET - Get single project with details
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const project = await prisma.project.findUnique({
            where: { id },
            include: {
                client: true,
                manager: true,
                projectInfluencers: {
                    include: {
                        influencer: true,
                    },
                },
                documents: {
                    orderBy: { issueDate: "desc" },
                },
                transactions: {
                    orderBy: { date: "desc" },
                },
            },
        });

        if (!project) {
            return NextResponse.json(
                { error: "Project not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(project);
    } catch (error) {
        console.error("GET /api/projects/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to fetch project" },
            { status: 500 }
        );
    }
}

// PATCH - Update project
export async function PATCH(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const body = await request.json();
        const validatedData = projectUpdateSchema.parse(body);

        const updateData: any = { ...validatedData };
        if (validatedData.startDate) {
            updateData.startDate = new Date(validatedData.startDate);
        }
        if (validatedData.endDate) {
            updateData.endDate = new Date(validatedData.endDate);
        }
        if (validatedData.managerId === "") {
            updateData.managerId = null;
        }

        const project = await prisma.project.update({
            where: { id },
            data: updateData,
        });

        return NextResponse.json(project);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: "Validation failed", details: error.errors },
                { status: 400 }
            );
        }
        console.error("PATCH /api/projects/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to update project" },
            { status: 500 }
        );
    }
}

// DELETE - Delete project
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        await prisma.project.delete({
            where: { id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("DELETE /api/projects/[id] error:", error);
        return NextResponse.json(
            { error: "Failed to delete project" },
            { status: 500 }
        );
    }
}
