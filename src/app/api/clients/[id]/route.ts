import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const clientUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  contactName: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  businessNo: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(["ACTIVE", "DORMANT", "TERMINATED"]).optional(),
  memo: z.string().optional(),
});

// GET - Get single client with details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const client = await prisma.client.findUnique({
      where: { id },
      include: {
        projects: {
          orderBy: { createdAt: "desc" },
          include: {
            manager: {
              select: { name: true },
            },
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

    if (!client) {
      return NextResponse.json(
        { error: "Client not found" },
        { status: 404 }
      );
    }

    // Calculate financial summary
    const revenue = client.transactions
      .filter((t) => t.type === "REVENUE")
      .reduce((sum, t) => sum + t.amount, 0);

    const expenses = client.transactions
      .filter((t) => t.type === "EXPENSE")
      .reduce((sum, t) => sum + t.amount, 0);

    const unpaidAmount = client.transactions
      .filter((t) => t.type === "REVENUE" && t.paymentStatus === "PENDING")
      .reduce((sum, t) => sum + t.amount, 0);

    return NextResponse.json({
      ...client,
      financialSummary: {
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        unpaidAmount,
      },
    });
  } catch (error) {
    console.error("GET /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

// PATCH - Update client
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validatedData = clientUpdateSchema.parse(body);

    const client = await prisma.client.update({
      where: { id },
      data: {
        ...validatedData,
        email: validatedData.email || null,
      },
    });

    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Validation failed", details: error.issues },
        { status: 400 }
      );
    }
    console.error("PATCH /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

// DELETE - Delete client
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await prisma.client.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/clients/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}


