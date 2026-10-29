import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/api-auth";
import {
  normalizeSettlementStatus,
  settlementStatusInput,
  type SettlementStatus,
} from "@/lib/settlement-status";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        ProjectInfluencer: {
          include: {
            Project: {
              select: {
                id: true,
                name: true,
                status: true,
                Client: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!influencer) {
      return NextResponse.json({ error: "Influencer not found" }, { status: 404 });
    }

    // Transform to lowercase field names
    const transformedInfluencer = {
      ...influencer,
      projectInfluencers: influencer.ProjectInfluencer.map(pi => ({
        ...pi,
        paymentStatus: normalizeSettlementStatus(pi.paymentStatus),
        project: {
          ...pi.Project,
          client: pi.Project.Client,
        },
      })),
    };

    return NextResponse.json(transformedInfluencer);
  } catch (error) {
    console.error("GET /api/influencers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch influencer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    const body = await request.json();
    const { projectAssignments, ...influencerData } = body;

    // 배정 정보 검증을 먼저 한다 (잘못된 상태값이면 아무것도 저장하지 않음)
    const assignments: {
      projectId: string;
      fee: number;
      paymentStatus: SettlementStatus;
      // undefined면 기존 마감일 유지 (수정 화면은 마감일을 보내지 않는다)
      paymentDueDate: Date | null | undefined;
    }[] = [];
    if (Array.isArray(projectAssignments)) {
      for (const assignment of projectAssignments) {
        const status = settlementStatusInput.safeParse(assignment?.paymentStatus);
        if (!status.success) {
          return NextResponse.json({ error: "Invalid paymentStatus" }, { status: 400 });
        }
        assignments.push({
          projectId: assignment.projectId,
          fee: Number(assignment.fee) || 0,
          paymentStatus: status.data,
          paymentDueDate:
            assignment.paymentDueDate === undefined
              ? undefined
              : assignment.paymentDueDate
                ? new Date(assignment.paymentDueDate)
                : null,
        });
      }
    }

    const influencer = await prisma.influencer.update({
      where: { id },
      data: influencerData,
    });

    if (Array.isArray(projectAssignments)) {
      const existing = await prisma.projectInfluencer.findMany({
        where: { influencerId: id },
        select: { projectId: true, paymentDate: true },
      });
      const paidProjectIds = new Set(
        existing.filter((pi) => pi.paymentDate).map((pi) => pi.projectId)
      );
      const now = new Date();

      const projectIds = assignments.map((assignment) => assignment.projectId);

      const deletionWhere =
        projectIds.length > 0
          ? { influencerId: id, projectId: { notIn: projectIds } }
          : { influencerId: id };

      await prisma.$transaction([
        prisma.projectInfluencer.deleteMany({
          where: deletionWhere,
        }),
        ...assignments.map((assignment) =>
          prisma.projectInfluencer.upsert({
            where: {
              projectId_influencerId: {
                projectId: assignment.projectId,
                influencerId: id,
              },
            },
            update: {
              fee: assignment.fee,
              paymentStatus: assignment.paymentStatus,
              paymentDueDate: assignment.paymentDueDate,
              // 완료로 바뀌었는데 정산일이 없으면 오늘로 기록 (기존 정산일은 유지)
              ...(assignment.paymentStatus === "COMPLETED" &&
                !paidProjectIds.has(assignment.projectId) && { paymentDate: now }),
            },
            create: {
              projectId: assignment.projectId,
              influencerId: id,
              fee: assignment.fee,
              paymentStatus: assignment.paymentStatus,
              paymentDueDate: assignment.paymentDueDate ?? null,
              paymentDate: assignment.paymentStatus === "COMPLETED" ? now : null,
            },
          })
        ),
      ]);
    }

    return NextResponse.json(influencer);
  } catch (error) {
    console.error("PATCH /api/influencers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update influencer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireSession();
  if (auth.response) return auth.response;

  try {
    const { id } = await params;
    await prisma.influencer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/influencers/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete influencer" },
      { status: 500 }
    );
  }
}

