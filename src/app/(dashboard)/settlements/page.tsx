"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Receipt,
  CheckCircle2,
  Clock,
  AlertCircle,
  MoreHorizontal,
  Trash2,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Calendar,
  Camera,
  FileEdit,
  Upload,
  Banknote,
  Edit,
} from "lucide-react";
import { formatCurrency, formatDate, STATUS_LABELS } from "@/lib/utils";
import Link from "next/link";

interface Settlement {
  id: string;
  fee: number;
  paymentStatus: string;
  paymentDueDate: string | null;
  paymentDate: string | null;
  shootingDate: string | null;
  draftDeliveryDate: string | null;
  uploadDate: string | null;
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

interface Summary {
  total: number;
  pending: number;
  requested: number;
  completed: number;
  count: number;
  pendingCount: number;
  requestedCount: number;
  completedCount: number;
}

export default function SettlementsPage() {
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // 일정 편집 다이얼로그
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(
    null
  );
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editForm, setEditForm] = useState({
    shootingDate: "",
    draftDeliveryDate: "",
    uploadDate: "",
    paymentDate: "",
    paymentDueDate: "",
    fee: 0,
  });

  const fetchSettlements = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      params.set("month", selectedMonth);

      const res = await fetch(`/api/settlements?${params}`);
      const data = await res.json();
      setSettlements(data.settlements || []);
      setSummary(data.summary || null);
    } catch (error) {
      console.error("Failed to fetch settlements:", error);
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedMonth]);

  useEffect(() => {
    fetchSettlements();
  }, [fetchSettlements]);

  // 월 이동
  const changeMonth = (delta: number) => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const newDate = new Date(year, month - 1 + delta, 1);
    setSelectedMonth(
      `${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`
    );
  };

  const formatMonthDisplay = (monthStr: string) => {
    const [year, month] = monthStr.split("-");
    return `${year}년 ${parseInt(month)}월`;
  };

  async function handleStatusChange(id: string, newStatus: string) {
    try {
      const res = await fetch(`/api/settlements/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate:
            newStatus === "COMPLETED" ? new Date().toISOString() : undefined,
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

  const openEditDialog = (settlement: Settlement) => {
    setEditingSettlement(settlement);
    setEditForm({
      shootingDate: settlement.shootingDate?.split("T")[0] || "",
      draftDeliveryDate: settlement.draftDeliveryDate?.split("T")[0] || "",
      uploadDate: settlement.uploadDate?.split("T")[0] || "",
      paymentDate: settlement.paymentDate?.split("T")[0] || "",
      paymentDueDate: settlement.paymentDueDate?.split("T")[0] || "",
      fee: settlement.fee,
    });
    setIsEditDialogOpen(true);
  };

  async function handleSaveSchedule() {
    if (!editingSettlement) return;

    setIsSaving(true);
    try {
      const res = await fetch(`/api/settlements/${editingSettlement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shootingDate: editForm.shootingDate || null,
          draftDeliveryDate: editForm.draftDeliveryDate || null,
          uploadDate: editForm.uploadDate || null,
          paymentDate: editForm.paymentDate || null,
          paymentDueDate: editForm.paymentDueDate || null,
          fee: editForm.fee,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        fetchSettlements();
      } else {
        alert("저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to save schedule:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  const getStatusBadge = (status: string) => {
    const config: Record<
      string,
      { variant: "success" | "warning" | "info"; icon: React.ReactNode }
    > = {
      COMPLETED: {
        variant: "success",
        icon: <CheckCircle2 className="h-3 w-3" />,
      },
      REQUESTED: { variant: "info", icon: <Clock className="h-3 w-3" /> },
      PENDING: { variant: "warning", icon: <AlertCircle className="h-3 w-3" /> },
    };
    const { variant, icon } = config[status] || {
      variant: "warning" as const,
      icon: null,
    };

    return (
      <Badge variant={variant} className="gap-1">
        {icon}
        {STATUS_LABELS[status as keyof typeof STATUS_LABELS] || status}
      </Badge>
    );
  };

  // 협업 진행 상태 아이콘
  const getScheduleIcon = (date: string | null, type: string) => {
    const icons: Record<string, React.ReactNode> = {
      shooting: <Camera className="h-3.5 w-3.5" />,
      draft: <FileEdit className="h-3.5 w-3.5" />,
      upload: <Upload className="h-3.5 w-3.5" />,
      payment: <Banknote className="h-3.5 w-3.5" />,
    };
    const isCompleted = date !== null;
    return (
      <div
        className={`flex items-center justify-center w-7 h-7 rounded-full ${
          isCompleted
            ? "bg-emerald-100 text-emerald-600"
            : "bg-gray-100 text-gray-400"
        }`}
        title={
          date
            ? formatDate(date)
            : type === "shooting"
              ? "촬영일 미정"
              : type === "draft"
                ? "초안 미전달"
                : type === "upload"
                  ? "업로드 미완료"
                  : "정산 미완료"
        }
      >
        {icons[type]}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Month Navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">정산 관리</h1>
          <p className="text-muted-foreground mt-1">
            인플루언서 정산 및 협업 일정을 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeMonth(-1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium">
              {formatMonthDisplay(selectedMonth)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => changeMonth(1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              이번 달 총액
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(summary?.total || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.count || 0}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-amber-500" />
              대기
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {formatCurrency(summary?.pending || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.pendingCount || 0}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              요청됨
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(summary?.requested || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.requestedCount || 0}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              완료
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(summary?.completed || 0)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.completedCount || 0}건
            </p>
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

      {/* Settlement List with Schedule Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>정산 현황</CardTitle>
          <CardDescription>
            프로젝트별 인플루언서 정산 및 협업 일정
          </CardDescription>
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
              <h3 className="text-lg font-medium">
                {formatMonthDisplay(selectedMonth)}에 정산 내역이 없습니다
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                다른 월을 선택하거나 새 정산을 추가해주세요.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>인플루언서</TableHead>
                  <TableHead>프로젝트 / 클라이언트</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span>협업 일정</span>
                      <span className="text-xs text-muted-foreground">
                        (촬영→초안→업로드→정산)
                      </span>
                    </div>
                  </TableHead>
                  <TableHead>정산마감</TableHead>
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
                            @{settlement.influencer.instagramId}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <Link
                          href={`/projects/${settlement.project.id}`}
                          className="hover:text-primary"
                        >
                          {settlement.project.name}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {settlement.project.client.name}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(settlement.fee)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <div className="relative group/schedule">
                          {getScheduleIcon(settlement.shootingDate, "shooting")}
                          {settlement.shootingDate && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/schedule:opacity-100 transition-opacity z-10">
                              촬영: {formatDate(settlement.shootingDate)}
                            </div>
                          )}
                        </div>
                        <div className="w-4 h-px bg-gray-300" />
                        <div className="relative group/schedule">
                          {getScheduleIcon(
                            settlement.draftDeliveryDate,
                            "draft"
                          )}
                          {settlement.draftDeliveryDate && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/schedule:opacity-100 transition-opacity z-10">
                              초안: {formatDate(settlement.draftDeliveryDate)}
                            </div>
                          )}
                        </div>
                        <div className="w-4 h-px bg-gray-300" />
                        <div className="relative group/schedule">
                          {getScheduleIcon(settlement.uploadDate, "upload")}
                          {settlement.uploadDate && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/schedule:opacity-100 transition-opacity z-10">
                              업로드: {formatDate(settlement.uploadDate)}
                            </div>
                          )}
                        </div>
                        <div className="w-4 h-px bg-gray-300" />
                        <div className="relative group/schedule">
                          {getScheduleIcon(settlement.paymentDate, "payment")}
                          {settlement.paymentDate && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-xs rounded whitespace-nowrap opacity-0 group-hover/schedule:opacity-100 transition-opacity z-10">
                              정산: {formatDate(settlement.paymentDate)}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {settlement.paymentDueDate
                        ? formatDate(settlement.paymentDueDate)
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(settlement.paymentStatus)}
                    </TableCell>
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
                          <DropdownMenuItem
                            onClick={() => openEditDialog(settlement)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            일정 편집
                          </DropdownMenuItem>
                          {settlement.paymentStatus !== "COMPLETED" && (
                            <>
                              <DropdownMenuSeparator />
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
                            </>
                          )}
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

      {/* Schedule Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>협업 일정 편집</DialogTitle>
            <DialogDescription>
              {editingSettlement?.influencer.name} -{" "}
              {editingSettlement?.project.name}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="fee" className="flex items-center gap-2">
                  <Banknote className="h-4 w-4" />
                  정산 금액
                </Label>
                <Input
                  id="fee"
                  type="number"
                  value={editForm.fee}
                  onChange={(e) =>
                    setEditForm({ ...editForm, fee: Number(e.target.value) })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDueDate" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  정산 마감일
                </Label>
                <Input
                  id="paymentDueDate"
                  type="date"
                  value={editForm.paymentDueDate}
                  onChange={(e) =>
                    setEditForm({ ...editForm, paymentDueDate: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-medium mb-3">협업 일정</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label
                    htmlFor="shootingDate"
                    className="flex items-center gap-2"
                  >
                    <Camera className="h-4 w-4" />
                    촬영일
                  </Label>
                  <Input
                    id="shootingDate"
                    type="date"
                    value={editForm.shootingDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, shootingDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="draftDeliveryDate"
                    className="flex items-center gap-2"
                  >
                    <FileEdit className="h-4 w-4" />
                    초안 전달일
                  </Label>
                  <Input
                    id="draftDeliveryDate"
                    type="date"
                    value={editForm.draftDeliveryDate}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        draftDeliveryDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="uploadDate" className="flex items-center gap-2">
                    <Upload className="h-4 w-4" />
                    결과물 업로드일
                  </Label>
                  <Input
                    id="uploadDate"
                    type="date"
                    value={editForm.uploadDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, uploadDate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="paymentDate"
                    className="flex items-center gap-2"
                  >
                    <Banknote className="h-4 w-4" />
                    정산 완료일
                  </Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={editForm.paymentDate}
                    onChange={(e) =>
                      setEditForm({ ...editForm, paymentDate: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              disabled={isSaving}
            >
              취소
            </Button>
            <Button onClick={handleSaveSchedule} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
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
