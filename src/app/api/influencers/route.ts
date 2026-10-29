import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import { settlementStatusInput, type SettlementStatus } from "@/lib/settlement-status";

// GET - List all influencers
export async function GET(request: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const category = searchParams.get("category");

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { instagramId: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (category) {
      where.categories = { contains: category };
    }

    const influencers = await prisma.influencer.findMany({
      where,
      include: {
        _count: {
          select: { ProjectInfluencer: true },
        },
        ProjectInfluencer: {
          select: {
            fee: true,
            paymentStatus: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Transform to lowercase field names
    const transformedInfluencers = influencers.map(i => ({
      ...i,
      _count: {
        projectInfluencers: i._count.ProjectInfluencer,
      },
      projectInfluencers: i.ProjectInfluencer,
    }));

    return NextResponse.json({ influencers: transformedInfluencers });
  } catch (error) {
    console.error("GET /api/influencers error:", error);
    return NextResponse.json(
      { error: "Failed to fetch influencers" },
      { status: 500 }
    );
  }
}

// POST - Create new influencer
export async function POST(request: NextRequest) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();
    const { projectAssignments = [], ...influencerData } = body;

    // 정산 상태는 대문자(PENDING/REQUESTED/COMPLETED)로 통일해 저장한다
    const assignments: { projectId: string; fee: number; paymentStatus: SettlementStatus }[] = [];
    for (const assignment of Array.isArray(projectAssignments) ? projectAssignments : []) {
      const status = settlementStatusInput.safeParse(assignment?.paymentStatus);
      if (!status.success) {
        return NextResponse.json({ error: "Invalid paymentStatus" }, { status: 400 });
      }
      assignments.push({
        projectId: assignment.projectId,
        fee: Number(assignment.fee) || 0,
        paymentStatus: status.data,
      });
    }

    const influencer = await prisma.influencer.create({
      data: influencerData,
    });

    if (assignments.length > 0) {
      const now = new Date();
      await prisma.projectInfluencer.createMany({
        data: assignments.map((assignment) => ({
          ...assignment,
          influencerId: influencer.id,
          paymentDate: assignment.paymentStatus === "COMPLETED" ? now : null,
        })),
        skipDuplicates: true,
      });
    }

    return NextResponse.json(influencer, { status: 201 });
  } catch (error) {
    console.error("POST /api/influencers error:", error);
    return NextResponse.json(
      { error: "Failed to create influencer" },
      { status: 500 }
    );
  }
}


