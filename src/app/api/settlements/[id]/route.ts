import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const normalizeStatus = (status?: string) => {
  const value = (status || "").toLowerCase();
  if (value === "completed") return "completed";
  if (value === "in_progress" || value === "requested") return "in_progress";
  return "pending";
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const settlement = await prisma.projectInfluencer.update({
      where: { id },
      data: {
        paymentStatus: normalizeStatus(body.paymentStatus),
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      },
    });

    return NextResponse.json(settlement);
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


