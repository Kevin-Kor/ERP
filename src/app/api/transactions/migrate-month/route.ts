import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// POST - Move transactions from one month to another
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromYear, fromMonth, toYear, toMonth, type } = body;

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
        ...(type && { type }), // Add type filter if provided
      },
    });

    if (transactions.length === 0) {
      const typeMsg = type ? ` (type: ${type})` : "";
      return NextResponse.json({
        message: `No transactions found in ${fromYear}-${fromMonth}${typeMsg}`,
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

    const typeMsg = type ? ` ${type.toLowerCase()} transactions` : " transactions";
    return NextResponse.json({
      message: `Successfully moved ${transactions.length}${typeMsg} from ${fromYear}-${fromMonth} to ${toYear}-${toMonth}`,
      movedCount: transactions.length,
      details: {
        fromMonth: `${fromYear}-${String(fromMonth).padStart(2, "0")}`,
        toMonth: `${toYear}-${String(toMonth).padStart(2, "0")}`,
        type: type || "all",
      },
    });
  } catch (error) {
    console.error("POST /api/transactions/migrate-month error:", error);
    return NextResponse.json(
      { error: "Failed to migrate transactions" },
      { status: 500 }
    );
  }
}
