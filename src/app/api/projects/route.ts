import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const projectSchema = z.object({
  name: z.string().min(1, "프로젝트명은 필수입니다"),
  clientId: z.string().min(1, "클라이언트는 필수입니다"),
  managerId: z.string().optional(),
  status: z.enum(["QUOTING", "IN_PROGRESS", "COMPLETED", "CANCELLED"]).default("QUOTING"),
  startDate: z.string(),
  endDate: z.string(),
  contractAmount: z.number().min(0),
  platforms: z.string().optional(),
  contentTypes: z.string().optional(),
  memo: z.string().optional(),
});

// GET - List all projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("clientId");
    const search = searchParams.get("search");

    const where: Record<string, unknown> = {};

    if (status && status !== "all") {
      where.status = status;
    }

    if (clientId) {
      where.clientId = clientId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { Client: { name: { contains: search } } },
      ];
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        Client: {
          select: { id: true, name: true },
        },
        User: {
          select: { id: true, name: true },
        },
        _count: {
          select: {
            ProjectInfluencer: true,
            Document: true,
            Transaction: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to lowercase field names for frontend
    const transformedProjects = projects.map(p => ({
      ...p,
      client: p.Client,
      manager: p.User,
      _count: {
        projectInfluencers: p._count.ProjectInfluencer,
        documents: p._count.Document,
        transactions: p._count.Transaction,
      },
    }));

    return NextResponse.json({ projects: transformedProjects });
  } catch (error) {
    console.error("GET /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to fetch projects" },
      { status: 500 }
    );
  }
}

// POST - Create new project
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = projectSchema.parse(body);

    const project = await prisma.project.create({
      data: {
        ...validatedData,
        startDate: new Date(validatedData.startDate),
        endDate: new Date(validatedData.endDate),
        managerId: validatedData.managerId || null,
      },
      include: {
        Client: true,
        User: true,
      },
    });

    // Transform to lowercase field names
    const transformedProject = {
      ...project,
      client: project.Client,
      manager: project.User,
    };

    return NextResponse.json(transformedProject, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("POST /api/projects error:", error);
    return NextResponse.json(
      { error: "Failed to create project" },
      { status: 500 }
    );
  }
}


