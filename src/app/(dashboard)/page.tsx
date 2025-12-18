"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Trash2,
  CheckCircle,
  Loader2,
  Banknote,
  ListTodo,
  Megaphone,
} from "lucide-react";
import { formatCurrency, formatCurrencyCompact, formatDate, getDaysSince } from "@/lib/utils";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";

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
      category: string;
      memo: string | null;
      client: { id: string; name: string } | null;
      project: { id: string; name: string } | null;
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

async function fetchDashboard(): Promise<DashboardData> {
  const res = await fetch("/api/dashboard", {
    next: { revalidate: 30 }, // 30초 캐싱
  });
  if (!res.ok) {
    throw new Error("Failed to fetch dashboard");
  }
  const json = await res.json();
  if (json.error || !json.summary) {
    throw new Error(json.error || "Invalid dashboard data");
  }
  return json;
}

interface TodoData {
  columns: string[];
  members: Array<{
    id: string;
    name: string;
    tasks: { [key: number]: Array<{ id: string; text: string; completed: boolean }> };
  }>;
}

async function fetchTodos(): Promise<TodoData> {
  const res = await fetch("/api/team-todo");
  if (!res.ok) {
    throw new Error("Failed to fetch todos");
  }
  return res.json();
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["dashboard"],
    queryFn: fetchDashboard,
    staleTime: 30 * 1000, // 30초간 fresh 상태 유지
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
    refetchOnWindowFocus: false, // 포커스 시 자동 리페치 비활성화
  });

  const { data: todoData, refetch: refetchTodos } = useQuery({
    queryKey: ["team-todo"],
    queryFn: fetchTodos,
    staleTime: 30 * 1000,
  });

  // 미완료 투두 개수 계산
  const pendingTodoCount = todoData?.members.reduce((total, member) => {
    return total + Object.values(member.tasks).flat().filter(task => !task.completed).length;
  }, 0) || 0;

  // 광고업체 정보 추출 헬퍼 함수
  const extractAdvertiserInfo = (memo: string | null): string | null => {
    if (!memo) return null;
    // [광고업체: XXX] 또는 [광고주:XXX] 패턴 찾기
    const match = memo.match(/\[광고(?:업체|주)\s*:\s*([^\]]+)\]/);
    return match ? match[1].trim() : null;
  };

  // 카테고리 라벨 가져오기
  const getCategoryLabel = (category: string): string => {
    const categories = [
      { value: "FIXED_MANAGEMENT", label: "고정 관리업체" },
      { value: "PROJECT_MANAGEMENT", label: "건별 관리업체" },
      { value: "AD_REVENUE", label: "광고비 수입" },
      { value: "PLATFORM_REVENUE", label: "플랫폼 수입" },
      { value: "CAMPAIGN_FEE", label: "캠페인 대행료" },
      { value: "CONTENT_FEE", label: "콘텐츠 제작비" },
      { value: "CONSULTING", label: "컨설팅/기타" },
      { value: "OTHER_REVENUE", label: "기타 수입" },
    ];
    const found = categories.find((c) => c.value === category);
    return found?.label || category;
  };

  // 미수 관리 상태
  const [deletingReceivableId, setDeletingReceivableId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [markingCompletedId, setMarkingCompletedId] = useState<string | null>(null);

  // 미수금 삭제 (거래 삭제)
  const handleDeleteReceivable = async () => {
    if (!deletingReceivableId) return;

    setIsProcessing(true);
    try {
      const res = await fetch(`/api/transactions/${deletingReceivableId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteDialogOpen(false);
        refetch();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsProcessing(false);
      setDeletingReceivableId(null);
    }
  };

  // 미수금 입금 완료 처리
  const handleMarkCompleted = async (id: string) => {
    setMarkingCompletedId(id);
    try {
      const res = await fetch(`/api/transactions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "COMPLETED",
          paymentDate: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        refetch();
      } else {
        alert("처리에 실패했습니다.");
      }
    } catch (error) {
      console.error("Mark completed error:", error);
      alert("처리 중 오류가 발생했습니다.");
    } finally {
      setMarkingCompletedId(null);
    }
  };

  // To-Do 체크 토글
  const handleToggleTodo = async (taskId: string) => {
    try {
      const res = await fetch("/api/team-todo", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "task-toggle", id: taskId }),
      });

      if (res.ok) {
        refetchTodos();
      }
    } catch (error) {
      console.error("Toggle todo error:", error);
    }
  };

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error || !data || !data.summary) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">데이터를 불러올 수 없습니다.</p>
          <Button onClick={() => refetch()} className="mt-4" variant="outline">
            다시 시도
          </Button>
        </div>
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">대시보드</h1>
          <p className="text-muted-foreground mt-1">{currentMonth} 현황</p>
        </div>
        <Button asChild className="w-full sm:w-auto">
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

            {/* 팀 To-Do */}
            {pendingTodoCount > 0 && (
              <Link href="/team-todo" className="block">
                <div className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
                      <ListTodo className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="font-medium">팀 To-Do {pendingTodoCount}건</p>
                      <p className="text-sm text-muted-foreground">
                        미완료 작업
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </Link>
            )}

            {data.actions.unpaidCount === 0 &&
              data.actions.pendingSettlementsCount === 0 &&
              data.actions.unissuedInvoicesCount === 0 &&
              pendingTodoCount === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  모든 항목이 처리되었습니다!
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
                          {project.client?.name || "클라이언트 미지정"}
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
                        <p className="font-medium text-sm">
                          {doc.client?.name || "클라이언트 미지정"}
                        </p>
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

      {/* 미수금 관리 */}
      {data.actions.unpaidCount > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Banknote className="h-5 w-5 text-amber-600" />
                  미수금 관리
                </CardTitle>
                <CardDescription>
                  총 {data.actions.unpaidCount}건, {formatCurrencyCompact(data.actions.unpaidAmount)}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일자</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>클라이언트/광고업체</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="w-[120px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.actions.unpaidTransactions.map((tx) => {
                  const advertiser = extractAdvertiserInfo(tx.memo);
                  const isAdRevenue = tx.category === "AD_REVENUE";
                  return (
                    <TableRow
                      key={tx.id}
                      className={isAdRevenue ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''}
                    >
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isAdRevenue && <Megaphone className="h-3 w-3 text-pink-600" />}
                          <Badge
                            variant={isAdRevenue ? "default" : "outline"}
                            className={`text-xs ${isAdRevenue ? 'bg-pink-100 text-pink-700 border-pink-300' : ''}`}
                          >
                            {getCategoryLabel(tx.category)}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          {tx.client ? (
                            <Link
                              href={`/clients/${tx.client.id}`}
                              className="font-medium hover:text-primary text-sm"
                            >
                              {tx.client.name}
                            </Link>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                          {advertiser && (
                            <Badge variant="outline" className="text-xs w-fit bg-pink-100 text-pink-700 border-pink-300">
                              {advertiser}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {tx.memo?.replace(/\[광고(?:업체|주)\s*:\s*[^\]]+\]\s*/, '') || tx.project?.name || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                            onClick={() => handleMarkCompleted(tx.id)}
                            disabled={markingCompletedId === tx.id}
                            title="입금 완료"
                          >
                            {markingCompletedId === tx.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                            onClick={() => {
                              setDeletingReceivableId(tx.id);
                              setIsDeleteDialogOpen(true);
                            }}
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* 팀 To-Do */}
      {todoData && todoData.members.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListTodo className="h-5 w-5 text-purple-600" />
                  팀 To-Do
                </CardTitle>
                <CardDescription>
                  미완료 {pendingTodoCount}건
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/team-todo">전체 보기</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {todoData.members.map((member) => {
                const pendingTasks = Object.values(member.tasks)
                  .flat()
                  .filter((task) => !task.completed);
                if (pendingTasks.length === 0) return null;
                return (
                  <div key={member.id} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{member.name}</p>
                    <div className="space-y-1">
                      {pendingTasks.slice(0, 5).map((task) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <Checkbox
                            checked={task.completed}
                            onCheckedChange={() => handleToggleTodo(task.id)}
                          />
                          <span className="text-sm">{task.text}</span>
                        </div>
                      ))}
                      {pendingTasks.length > 5 && (
                        <p className="text-xs text-muted-foreground pl-8">
                          +{pendingTasks.length - 5}건 더 보기
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 미수금 삭제 확인 Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>미수금 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 미수금 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteReceivable}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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


