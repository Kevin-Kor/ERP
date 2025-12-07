import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Move transactions from one month to another
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromYear, fromMonth, toYear, toMonth } = body;

    if (!fromYear || !fromMonth || !toYear || !toMonth) {
      return NextResponse.json(
        { error: "Missing required parameters" },
        { status: 400 }
      );
    }

    // Calculate date ranges
    const fromStartDate = new Date(fromYear, fromMonth - 1, 1);
    const fromEndDate = new Date(fromYear, fromMonth, 0, 23, 59, 59, 999);

    // Find all transactions in the source month
    const transactions = await prisma.transaction.findMany({
      where: {
        date: {
          gte: fromStartDate,
          lte: fromEndDate,
        },
      },
    });

    if (transactions.length === 0) {
      return NextResponse.json({
        message: "No transactions found in the specified month",
        movedCount: 0,
      });
    }

    // Update each transaction to move to the target month
    // Keep the same day, just change month/year
    const updatePromises = transactions.map((tx) => {
      const oldDate = new Date(tx.date);
      const newDate = new Date(
        toYear,
        toMonth - 1,
        Math.min(oldDate.getDate(), new Date(toYear, toMonth, 0).getDate()), // Handle month end dates
        oldDate.getHours(),
        oldDate.getMinutes(),
        oldDate.getSeconds()
      );

      return prisma.transaction.update({
        where: { id: tx.id },
        data: { date: newDate },
      });
    });

    await Promise.all(updatePromises);

    return NextResponse.json({
      message: `Successfully moved ${transactions.length} transactions from ${fromYear}-${fromMonth} to ${toYear}-${toMonth}`,
      movedCount: transactions.length,
    });
  } catch (error) {
    console.error("POST /api/transactions/migrate-month error:", error);
    return NextResponse.json(
      { error: "Failed to migrate transactions" },
      { status: 500 }
    );
  }
}
