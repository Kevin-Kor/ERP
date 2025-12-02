import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    const where: Record<string, unknown> = {};
    if (type && type !== "all") {
      where.type = type;
    }

    const transactions = await prisma.transaction.findMany({
      where,
      include: {
        Client: { select: { name: true } },
        Project: { select: { name: true } },
        Influencer: { select: { name: true } },
      },
      orderBy: { date: "desc" },
    });

    // Transform to lowercase field names
    const transformedTransactions = transactions.map(t => ({
      ...t,
      client: t.Client,
      project: t.Project,
      influencer: t.Influencer,
    }));

    return NextResponse.json({ transactions: transformedTransactions });
  } catch (error) {
    console.error("GET /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const transaction = await prisma.transaction.create({
      data: {
        ...body,
        date: new Date(body.date),
        paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
      },
    });

    return NextResponse.json(transaction, { status: 201 });
  } catch (error) {
    console.error("POST /api/transactions error:", error);
    return NextResponse.json(
      { error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}


