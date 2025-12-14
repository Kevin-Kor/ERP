"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

interface Settlement {
  id: string;
  fee: number;
  paymentStatus: string;
  paymentDueDate: string | null;
  paymentDate: string | null;
  influencer: {
    id: string;
    name: string;
    instagramId: string | null;
    bankAccount: string | null;
  };
  project: {
    id: string;
    name: string;
    client: { name: string };
  };
}

type SettlementStatus = "pending" | "in_progress" | "completed";

interface SettlementSummary {
  statusTotals: Record<SettlementStatus, { amount: number; count: number }>;
  influencerTotals: {
    influencer: { id: string; name: string; instagramId: string | null };
    totalFee: number;
    projects: number;
  }[];
  projectTotals: {
    project: { id: string; name: string; client: { id: string; name: string } };
    totalFee: number;
    influencers: number;
  }[];
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SettlementSummary | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const normalizeStatus = (status: string): SettlementStatus => {
    const value = (status || "").toLowerCase();
    if (value === "completed") return "completed";
    if (value === "in_progress" || value === "requested") return "in_progress";
    return "pending";
  };

  const statusOptions: { value: SettlementStatus; label: string }[] = [
    { value: "pending", label: "예정" },
    { value: "in_progress", label: "진행 중" },
    { value: "completed", label: "완료" },
  ];

  useEffect(() => {
    fetchSettlements();
    fetchSummary();
  }, [statusFilter]);

  async function fetchSettlements() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/settlements?${params}`);
      const data = await res.json();
      setSettlements(data.settlements || []);
    } catch (error) {
      console.error("Failed to fetch settlements:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch("/api/settlements/summary");
      const data = await res.json();
      setSummary(data);
    } catch (error) {
      console.error("Failed to fetch settlement summary:", error);
    }
  }

  async function handleStatusChange(id: string, newStatus: SettlementStatus) {
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate: newStatus === "completed" ? new Date().toISOString() : null,
        }),
      });

      if (res.ok) {
        fetchSettlements();
        fetchSummary();
      }
    } catch (error) {
      console.error("Failed to update settlement:", error);
    }
  }

  async function handleDelete() {
    if (!deletingId) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/settlements/${deletingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteDialogOpen(false);
        fetchSettlements();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to delete settlement:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  }

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const normalized = normalizeStatus(status);
    const config: Record<SettlementStatus, { variant: "success" | "warning" | "info"; icon: React.ReactNode; label: string }> = {
      completed: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" />, label: "완료" },
      in_progress: { variant: "info", icon: <Clock className="h-3 w-3" />, label: "진행 중" },
      pending: { variant: "warning", icon: <AlertCircle className="h-3 w-3" />, label: "예정" },
    };
    const { variant, icon, label } = config[normalized];

    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {label}
      </Badge>
    );
  };

  const pendingAmount = settlements
    .filter((s) => normalizeStatus(s.paymentStatus) !== "completed")
    .reduce((sum, s) => sum + s.fee, 0);

  const completedAmount = settlements
    .filter((s) => normalizeStatus(s.paymentStatus) === "completed")
    .reduce((sum, s) => sum + s.fee, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">정산 관리</h1>
        <p className="text-muted-foreground mt-1">
          인플루언서 정산 현황을 관리합니다.
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              미정산 금액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(pendingAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              정산 완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(completedAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              총 건수
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settlements.length}건</div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="pending">예정</SelectItem>
                <SelectItem value="in_progress">진행 중</SelectItem>
                <SelectItem value="completed">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {summary && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            {statusOptions.map((option) => (
              <Card key={option.value}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {option.label}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold flex items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {summary.statusTotals[option.value].count}건
                    </Badge>
                    <span className="text-primary">
                      {formatCurrency(summary.statusTotals[option.value].amount)}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>인플루언서별 정산 합계</CardTitle>
                <CardDescription>인플루언서별 누적 정산 금액과 참여 건수</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.influencerTotals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">집계할 데이터가 없습니다.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>인플루언서</TableHead>
                        <TableHead className="text-right">총 정산액</TableHead>
                        <TableHead className="text-right">참여 프로젝트</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.influencerTotals.map((item) => (
                        <TableRow key={item.influencer.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <Link href={`/influencers/${item.influencer.id}`} className="font-medium hover:text-primary">
                                {item.influencer.name}
                              </Link>
                              {item.influencer.instagramId && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Instagram className="h-3 w-3" />
                                  {item.influencer.instagramId}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.totalFee)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.projects}건
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>프로젝트별 정산 합계</CardTitle>
                <CardDescription>프로젝트 단위 정산 금액과 참여 인플루언서 수</CardDescription>
              </CardHeader>
              <CardContent>
                {summary.projectTotals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">집계할 데이터가 없습니다.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>프로젝트</TableHead>
                        <TableHead className="text-right">정산 합계</TableHead>
                        <TableHead className="text-right">인플루언서</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.projectTotals.map((item) => (
                        <TableRow key={item.project.id}>
                          <TableCell>
                            <div className="flex flex-col">
                              <Link href={`/projects/${item.project.id}`} className="font-medium hover:text-primary">
                                {item.project.name}
                              </Link>
                              <span className="text-xs text-muted-foreground">{item.project.client.name}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(item.totalFee)}
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {item.influencers}명
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Settlement List */}
      <Card>
        <CardHeader>
          <CardTitle>정산 현황</CardTitle>
          <CardDescription>프로젝트별 인플루언서 정산 내역</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : settlements.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">정산 내역이 없습니다</h3>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>인플루언서</TableHead>
                  <TableHead>프로젝트</TableHead>
                  <TableHead>클라이언트</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>예정일</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {settlements.map((settlement) => (
                  <TableRow key={settlement.id} className="group">
                    <TableCell>
                      <div>
                        <Link
                          href={`/influencers/${settlement.influencer.id}`}
                          className="font-medium hover:text-primary"
                        >
                          {settlement.influencer.name}
                        </Link>
                        {settlement.influencer.instagramId && (
                          <p className="text-xs text-muted-foreground">
                            {settlement.influencer.instagramId}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/projects/${settlement.project.id}`}
                        className="hover:text-primary"
                      >
                        {settlement.project.name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {settlement.project.client.name}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(settlement.fee)}
                    </TableCell>
                    <TableCell>
                      {settlement.paymentDueDate
                        ? formatDate(settlement.paymentDueDate)
                        : "-"}
                    </TableCell>
                    <TableCell>{getStatusBadge(settlement.paymentStatus)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {statusOptions.map((option) => (
                            <DropdownMenuItem
                              key={option.value}
                              onClick={() => handleStatusChange(settlement.id, option.value)}
                              disabled={normalizeStatus(settlement.paymentStatus) === option.value}
                            >
                              {option.label}로 변경
                            </DropdownMenuItem>
                          ))}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(settlement.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>정산 내역 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 정산 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
