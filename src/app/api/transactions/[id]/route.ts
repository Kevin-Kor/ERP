import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: {
        Client: { select: { id: true, name: true } },
        Project: { select: { id: true, name: true } },
        Influencer: { select: { id: true, name: true } },
      },
    });

    if (!transaction) {
      return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    }

    // Transform to lowercase field names
    const transformedTransaction = {
      ...transaction,
      client: transaction.Client,
      project: transaction.Project,
      influencer: transaction.Influencer,
    };

    return NextResponse.json(transformedTransaction);
  } catch (error) {
    console.error("GET /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction" },
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

    const updateData: Record<string, unknown> = {};

    if (body.date !== undefined) {
      updateData.date = new Date(body.date);
    }
    if (body.type !== undefined) {
      updateData.type = body.type;
    }
    if (body.category !== undefined) {
      updateData.category = body.category;
    }
    if (body.amount !== undefined) {
      updateData.amount = body.amount;
    }
    if (body.paymentStatus !== undefined) {
      updateData.paymentStatus = body.paymentStatus;
    }
    if (body.paymentDate !== undefined) {
      updateData.paymentDate = body.paymentDate ? new Date(body.paymentDate) : null;
    }
    if (body.memo !== undefined) {
      updateData.memo = body.memo;
    }
    if (body.vendorName !== undefined) {
      updateData.vendorName = body.vendorName || null;
    }
    if (body.clientId !== undefined) {
      updateData.clientId = body.clientId || null;
    }
    if (body.projectId !== undefined) {
      updateData.projectId = body.projectId || null;
    }
    if (body.influencerId !== undefined) {
      updateData.influencerId = body.influencerId || null;
    }

    const transaction = await prisma.transaction.update({
      where: { id },
      data: updateData,
      include: {
        Client: { select: { id: true, name: true } },
        Project: { select: { id: true, name: true } },
        Influencer: { select: { id: true, name: true } },
      },
    });

    // Transform to lowercase field names
    const transformedTransaction = {
      ...transaction,
      client: transaction.Client,
      project: transaction.Project,
      influencer: transaction.Influencer,
    };

    return NextResponse.json(transformedTransaction);
  } catch (error) {
    console.error("PATCH /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update transaction" },
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
    await prisma.transaction.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/transactions/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}

