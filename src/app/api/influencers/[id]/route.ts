import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const influencer = await prisma.influencer.findUnique({
      where: { id },
      include: {
        projectInfluencers: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
                status: true,
                client: { select: { name: true } },
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

    return NextResponse.json(influencer);
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
  try {
    const { id } = await params;
    const body = await request.json();

    const influencer = await prisma.influencer.update({
      where: { id },
      data: body,
    });

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

