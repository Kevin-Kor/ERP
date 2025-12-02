"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Receipt,
  AlertCircle,
  Calendar,
  FileText,
  Users,
  ArrowRight,
  Clock,
} from "lucide-react";
import { formatCurrency, formatCurrencyCompact, formatDate, getDaysSince } from "@/lib/utils";
import Link from "next/link";

interface DashboardData {
  summary: {
    totalRevenue: number;
    totalExpense: number;
    netProfit: number;
    profitRate: number;
  };
  actions: {
    unpaidCount: number;
    unpaidAmount: number;
    unpaidTransactions: Array<{
      id: string;
      date: string;
      amount: number;
      client: { name: string } | null;
      project: { name: string } | null;
    }>;
    pendingSettlementsCount: number;
    pendingSettlementsAmount: number;
    pendingSettlements: Array<{
      id: string;
      fee: number;
      paymentDueDate: string | null;
      influencer: { name: string; instagramId: string | null };
      project: { name: string };
    }>;
    unissuedInvoicesCount: number;
    unissuedInvoices: Array<{
      id: string;
      name: string;
      client: { name: string };
    }>;
  };
  projects: {
    activeCount: number;
    endingTodayCount: number;
    endingThisWeekCount: number;
    activeProjects: Array<{
      id: string;
      name: string;
      endDate: string;
      status: string;
      client: { name: string };
    }>;
  };
  recentDocuments: Array<{
    id: string;
    type: string;
    docNumber: string;
    issueDate: string;
    amount: number;
    client: { name: string };
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const res = await fetch("/api/dashboard");
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error("Failed to fetch dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboard();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
      </div>
    );
  }

  const currentMonth = new Date().toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground mt-1">{currentMonth} 현황</p>
        </div>
        <Button asChild>
          <Link href="/projects/new">
            새 프로젝트 시작
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 매출
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrencyCompact(data.summary.totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.summary.totalRevenue)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 비용
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrencyCompact(data.summary.totalExpense)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.summary.totalExpense)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              순이익
            </CardTitle>
            {data.summary.netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                data.summary.netProfit >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatCurrencyCompact(data.summary.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(data.summary.netProfit)}
            </p>
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              수익률
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.summary.profitRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              이번 달 마진율
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Items */}
      <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
            <AlertCircle className="h-5 w-5" />
            액션 필요
          </CardTitle>
          <CardDescription>확인이 필요한 항목들입니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 미수금 */}
            {data.actions.unpaidCount > 0 && (
              <Link href="/finance?filter=unpaid" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                      <DollarSign className="h-5 w-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <p className="font-medium">미수금 {data.actions.unpaidCount}건</p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrencyCompact(data.actions.unpaidAmount)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            {/* 인플루언서 미정산 */}
            {data.actions.pendingSettlementsCount > 0 && (
              <Link href="/settlements" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/30">
                      <Users className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        인플루언서 미정산 {data.actions.pendingSettlementsCount}건
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrencyCompact(data.actions.pendingSettlementsAmount)}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            {/* 세금계산서 미발행 */}
            {data.actions.unissuedInvoicesCount > 0 && (
              <Link href="/documents?filter=unissued" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
                      <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <p className="font-medium">
                        세금계산서 미발행 {data.actions.unissuedInvoicesCount}건
                      </p>
                      <p className="text-sm text-muted-foreground">
                        완료된 프로젝트 중 미발행 건
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            {data.actions.unpaidCount === 0 &&
              data.actions.pendingSettlementsCount === 0 &&
              data.actions.unissuedInvoicesCount === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  🎉 모든 항목이 처리되었습니다!
                </p>
              )}
          </div>
        </CardContent>
      </Card>

      {/* Projects and Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Active Projects */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  진행 중 캠페인
                </CardTitle>
                <CardDescription>
                  {data.projects.activeCount}건 진행 중
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/projects">전체 보기</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.projects.endingTodayCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="destructive">오늘 마감</Badge>
                  <span>{data.projects.endingTodayCount}건</span>
                </div>
              )}
              {data.projects.endingThisWeekCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Badge variant="warning">이번 주 마감</Badge>
                  <span>{data.projects.endingThisWeekCount}건</span>
                </div>
              )}
              <div className="space-y-3 mt-4">
                {data.projects.activeProjects.map((project) => (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block"
                  >
                    <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                      <div className="space-y-1">
                        <p className="font-medium text-sm">{project.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.client.name}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {formatDate(project.endDate)}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
                {data.projects.activeProjects.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    진행 중인 캠페인이 없습니다.
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  최근 문서
                </CardTitle>
                <CardDescription>최근 발행된 문서</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/documents">전체 보기</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.recentDocuments.map((doc) => (
                <Link
                  key={doc.id}
                  href={`/documents/${doc.id}`}
                  className="block"
                >
                  <div className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          doc.type === "TAX_INVOICE"
                            ? "default"
                            : doc.type === "QUOTE"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {doc.type === "TAX_INVOICE"
                          ? "세금계산서"
                          : doc.type === "QUOTE"
                          ? "견적서"
                          : doc.type === "CONTRACT"
                          ? "계약서"
                          : "기타"}
                      </Badge>
                      <div>
                        <p className="font-medium text-sm">{doc.client.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.docNumber}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrencyCompact(doc.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(doc.issueDate)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
              {data.recentDocuments.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  최근 발행된 문서가 없습니다.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-16" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              <Skeleton className="h-3 w-20 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


