import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    // 기본 필드
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = body.paymentStatus;
    }
    if (body.paymentDueDate !== undefined) {
      updateData.paymentDueDate = body.paymentDueDate
        ? new Date(body.paymentDueDate)
        : null;
    }
    if (body.fee !== undefined) {
      updateData.fee = body.fee;
    }

    // 협업 일정 필드
    if (body.shootingDate !== undefined) {
      updateData.shootingDate = body.shootingDate
        ? new Date(body.shootingDate)
        : null;
    }
    if (body.draftDeliveryDate !== undefined) {
      updateData.draftDeliveryDate = body.draftDeliveryDate
        ? new Date(body.draftDeliveryDate)
        : null;
    }
    if (body.uploadDate !== undefined) {
      updateData.uploadDate = body.uploadDate
        ? new Date(body.uploadDate)
        : null;
    }
    if (body.paymentDate !== undefined) {
      updateData.paymentDate = body.paymentDate
        ? new Date(body.paymentDate)
        : null;
    }

    const settlement = await prisma.projectInfluencer.update({
      where: { id },
      data: updateData,
      include: {
        Influencer: {
          select: {
            id: true,
            name: true,
            instagramId: true,
            bankAccount: true,
          },
        },
        Project: {
          select: {
            id: true,
            name: true,
            Client: {
              select: { name: true },
            },
          },
        },
      },
    });

    return NextResponse.json({
      ...settlement,
      influencer: settlement.Influencer,
      project: {
        ...settlement.Project,
        client: settlement.Project.Client,
      },
    });
  } catch (error) {
    console.error("PATCH /api/settlements/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update settlement" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.projectInfluencer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/settlements/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete settlement" },
      { status: 500 }
    );
  }
}


