import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET - List all influencers
export async function GET(request: NextRequest) {
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
  try {
    const body = await request.json();

    const influencer = await prisma.influencer.create({
      data: body,
    });

    return NextResponse.json(influencer, { status: 201 });
  } catch (error) {
    console.error("POST /api/influencers error:", error);
    return NextResponse.json(
      { error: "Failed to create influencer" },
      { status: 500 }
    );
  }
}


