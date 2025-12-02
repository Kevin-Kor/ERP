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
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
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

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSettlements();
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

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate: newStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (res.ok) {
        fetchSettlements();
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
    const config: Record<string, { variant: "success" | "warning" | "info"; icon: React.ReactNode }> = {
      COMPLETED: { variant: "success", icon: <CheckCircle2 className="h-3 w-3" /> },
      REQUESTED: { variant: "info", icon: <Clock className="h-3 w-3" /> },
      PENDING: { variant: "warning", icon: <AlertCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || { variant: "warning" as const, icon: null };

    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  const pendingAmount = settlements
    .filter((s) => s.paymentStatus !== "COMPLETED")
    .reduce((sum, s) => sum + s.fee, 0);

  const completedAmount = settlements
    .filter((s) => s.paymentStatus === "COMPLETED")
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
                <SelectItem value="PENDING">대기</SelectItem>
                <SelectItem value="REQUESTED">요청됨</SelectItem>
                <SelectItem value="COMPLETED">완료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                          {settlement.paymentStatus !== "COMPLETED" && (
                            <>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleStatusChange(
                                    settlement.id,
                                    settlement.paymentStatus === "PENDING"
                                      ? "REQUESTED"
                                      : "COMPLETED"
                                  )
                                }
                              >
                                {settlement.paymentStatus === "PENDING"
                                  ? "정산 요청"
                                  : "정산 완료"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
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
