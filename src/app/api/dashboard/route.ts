import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Get this month's revenue
    const revenueResult = await prisma.transaction.aggregate({
      where: {
        type: "REVENUE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    // Get this month's expenses
    const expenseResult = await prisma.transaction.aggregate({
      where: {
        type: "EXPENSE",
        date: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const totalRevenue = revenueResult._sum.amount || 0;
    const totalExpense = expenseResult._sum.amount || 0;
    const netProfit = totalRevenue - totalExpense;
    const profitRate = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Get unpaid transactions (미수금)
    const unpaidTransactions = await prisma.transaction.findMany({
      where: {
        type: "REVENUE",
        paymentStatus: "PENDING",
      },
      include: {
        Client: true,
        Project: true,
      },
      orderBy: {
        date: "asc",
      },
    });

    // Get pending settlements (인플루언서 미정산)
    const pendingSettlements = await prisma.projectInfluencer.findMany({
      where: {
        paymentStatus: {
          in: ["PENDING", "REQUESTED"],
        },
      },
      include: {
        Influencer: true,
        Project: true,
      },
      orderBy: {
        paymentDueDate: "asc",
      },
    });

    // Get unissued tax invoices (세금계산서 미발행 - projects that are completed but don't have tax invoice)
    const completedProjectsWithoutInvoice = await prisma.project.findMany({
      where: {
        status: "COMPLETED",
        Document: {
          none: {
            type: "TAX_INVOICE",
          },
        },
      },
      include: {
        Client: true,
      },
    });

    // Get active projects
    const activeProjects = await prisma.project.findMany({
      where: {
        status: "IN_PROGRESS",
      },
      include: {
        Client: true,
        User: true,
      },
      orderBy: {
        endDate: "asc",
      },
    });

    // Get projects ending today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const projectsEndingToday = activeProjects.filter((p) => {
      const endDate = new Date(p.endDate);
      endDate.setHours(0, 0, 0, 0);
      return endDate.getTime() === today.getTime();
    });

    // Get projects ending this week
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);

    const projectsEndingThisWeek = activeProjects.filter((p) => {
      const endDate = new Date(p.endDate);
      return endDate > today && endDate <= endOfWeek;
    });

    // Get recent activities
    const recentActivities = await prisma.activity.findMany({
      take: 10,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        User: true,
      },
    });

    // Get recent documents
    const recentDocuments = await prisma.document.findMany({
      take: 5,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        Client: true,
      },
    });

    // Transform data to use lowercase field names for frontend
    const transformedUnpaidTransactions = unpaidTransactions.map(t => ({
      ...t,
      client: t.Client,
      project: t.Project,
    }));

    const transformedPendingSettlements = pendingSettlements.map(s => ({
      ...s,
      influencer: s.Influencer,
      project: s.Project,
    }));

    const transformedCompletedProjects = completedProjectsWithoutInvoice.map(p => ({
      ...p,
      client: p.Client,
    }));

    const transformedActiveProjects = activeProjects.map(p => ({
      ...p,
      client: p.Client,
      manager: p.User,
    }));

    const transformedActivities = recentActivities.map(a => ({
      ...a,
      user: a.User,
    }));

    const transformedDocuments = recentDocuments.map(d => ({
      ...d,
      client: d.Client,
    }));

    return NextResponse.json({
      summary: {
        totalRevenue,
        totalExpense,
        netProfit,
        profitRate,
      },
      actions: {
        unpaidCount: transformedUnpaidTransactions.length,
        unpaidAmount: transformedUnpaidTransactions.reduce((sum, t) => sum + t.amount, 0),
        unpaidTransactions: transformedUnpaidTransactions,
        pendingSettlementsCount: transformedPendingSettlements.length,
        pendingSettlementsAmount: transformedPendingSettlements.reduce(
          (sum, s) => sum + s.fee,
          0
        ),
        pendingSettlements: transformedPendingSettlements,
        unissuedInvoicesCount: transformedCompletedProjects.length,
        unissuedInvoices: transformedCompletedProjects,
      },
      projects: {
        activeCount: transformedActiveProjects.length,
        endingTodayCount: projectsEndingToday.length,
        endingThisWeekCount: projectsEndingThisWeek.length,
        activeProjects: transformedActiveProjects.slice(0, 5),
      },
      recentActivities: transformedActivities,
      recentDocuments: transformedDocuments,
    });
  } catch (error) {
    console.error("Dashboard API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}


