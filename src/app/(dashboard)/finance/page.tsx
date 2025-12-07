"use client";

import { useEffect, useState, useMemo } from "react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  FileSpreadsheet,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  Clock,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Building2,
  Pencil,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency, formatDate, REVENUE_CATEGORIES, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_GROUPS } from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  paymentStatus: string;
  paymentDate: string | null;
  memo: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  influencer: { id: string; name: string } | null;
}

interface FixedVendor {
  id: string;
  name: string;
  monthlyFee: number | null;
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // 월 선택 state
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // Edit modal state
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({
    date: "",
    type: "",
    category: "",
    amount: 0,
    paymentStatus: "",
    memo: "",
  });

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Fixed vendor (고정업체) modal state
  const [isAddRevenueDialogOpen, setIsAddRevenueDialogOpen] = useState(false);
  const [fixedVendors, setFixedVendors] = useState<FixedVendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [newRevenueForm, setNewRevenueForm] = useState({
    date: new Date().toISOString().split("T")[0],
    clientId: "",
    amount: 0, // 실제 금액 (원 단위)
    amountInMan: "", // 만원 단위 입력값 (문자열)
    isManualAmount: false,
    category: "CAMPAIGN_FEE",
    memo: "",
    isReceivable: false, // 미수 여부
  });

  // Add expense modal state
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "FOOD",
    amount: 0,
    amountInMan: "",
    memo: "",
  });

  // 월 옵션 생성 (최근 24개월)
  const monthOptions = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
      return { value, label };
    });
  }, []);

  // 현재 선택된 월 표시용
  const currentMonthLabel = useMemo(() => {
    const [year, month] = selectedMonth.split("-");
    return `${year}년 ${parseInt(month)}월`;
  }, [selectedMonth]);

  // 이전/다음 월 이동
  const goToPreviousMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const newDate = new Date(year, month - 2, 1);
    setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
  };

  const goToNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    const newDate = new Date(year, month, 1);
    const now = new Date();
    // 미래 월은 선택 불가
    if (newDate <= now) {
      setSelectedMonth(`${newDate.getFullYear()}-${String(newDate.getMonth() + 1).padStart(2, "0")}`);
    }
  };

  // 현재 월인지 확인
  const isCurrentMonth = useMemo(() => {
    const now = new Date();
    const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return selectedMonth === current;
  }, [selectedMonth]);

  useEffect(() => {
    fetchTransactions();
    fetchFixedVendors();
  }, [selectedMonth]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.set("month", selectedMonth);

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  // 고정업체 목록 불러오기
  async function fetchFixedVendors() {
    try {
      const res = await fetch("/api/clients?isFixedVendor=true&status=ACTIVE");
      const data = await res.json();
      setFixedVendors(data.clients || []);
    } catch (error) {
      console.error("Failed to fetch fixed vendors:", error);
    }
  }

  // 고정업체 선택 시 금액 자동 입력
  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendor(vendorId);
    const vendor = fixedVendors.find(v => v.id === vendorId);
    if (vendor && vendor.monthlyFee && !newRevenueForm.isManualAmount) {
      const amountInMan = (vendor.monthlyFee / 10000).toString();
      setNewRevenueForm(prev => ({
        ...prev,
        clientId: vendorId,
        amount: vendor.monthlyFee || 0,
        amountInMan,
      }));
    } else {
      setNewRevenueForm(prev => ({
        ...prev,
        clientId: vendorId,
      }));
    }
  };

  // 수입 추가
  const handleAddRevenue = async () => {
    if (!newRevenueForm.clientId || newRevenueForm.amount <= 0) {
      alert("클라이언트와 금액을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newRevenueForm.date,
          type: "REVENUE",
          category: newRevenueForm.category,
          amount: newRevenueForm.amount,
          paymentStatus: newRevenueForm.isReceivable ? "PENDING" : "COMPLETED",
          memo: newRevenueForm.memo || null,
          clientId: newRevenueForm.clientId,
        }),
      });

      if (res.ok) {
        setIsAddRevenueDialogOpen(false);
        setNewRevenueForm({
          date: new Date().toISOString().split("T")[0],
          clientId: "",
          amount: 0,
          amountInMan: "",
          isManualAmount: false,
          category: "CAMPAIGN_FEE",
          memo: "",
          isReceivable: false,
        });
        setSelectedVendor("");
        fetchTransactions();
      } else {
        alert("수입 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Add revenue error:", error);
      alert("수입 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 지출 추가
  const handleAddExpense = async () => {
    if (newExpenseForm.amount <= 0) {
      alert("금액을 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: newExpenseForm.date,
          type: "EXPENSE",
          category: newExpenseForm.category,
          amount: newExpenseForm.amount,
          paymentStatus: "COMPLETED",
          memo: newExpenseForm.memo || null,
        }),
      });

      if (res.ok) {
        setIsAddExpenseDialogOpen(false);
        setNewExpenseForm({
          date: new Date().toISOString().split("T")[0],
          category: "FOOD",
          amount: 0,
          amountInMan: "",
          memo: "",
        });
        fetchTransactions();
      } else {
        alert("지출 추가에 실패했습니다.");
      }
    } catch (error) {
      console.error("Add expense error:", error);
      alert("지출 추가 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 수입 거래
  const revenueTransactions = useMemo(() =>
    transactions.filter((t) => t.type === "REVENUE"),
  [transactions]);

  // 지출 거래
  const expenseTransactions = useMemo(() =>
    transactions.filter((t) => t.type === "EXPENSE"),
  [transactions]);

  const totalRevenue = revenueTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = expenseTransactions.reduce((sum, t) => sum + t.amount, 0);
  const netProfit = totalRevenue - totalExpense;

  // 카테고리별 그룹핑
  const revenueByCategory = useMemo(() => {
    const grouped: Record<string, { label: string; total: number; count: number }> = {};
    revenueTransactions.forEach((t) => {
      if (!grouped[t.category]) {
        const cat = REVENUE_CATEGORIES.find((c) => c.value === t.category);
        grouped[t.category] = { label: cat?.label || t.category, total: 0, count: 0 };
      }
      grouped[t.category].total += t.amount;
      grouped[t.category].count += 1;
    });
    return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  }, [revenueTransactions]);

  const expenseByCategory = useMemo(() => {
    const grouped: Record<string, { label: string; total: number; count: number }> = {};
    expenseTransactions.forEach((t) => {
      if (!grouped[t.category]) {
        const cat = EXPENSE_CATEGORIES.find((c) => c.value === t.category);
        grouped[t.category] = { label: cat?.label || t.category, total: 0, count: 0 };
      }
      grouped[t.category].total += t.amount;
      grouped[t.category].count += 1;
    });
    return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  }, [expenseTransactions]);

  const getCategoryLabel = (type: string, category: string) => {
    const categories = type === "REVENUE" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
    const found = categories.find((c) => c.value === category);
    return found?.label || category;
  };

  const openEditDialog = (tx: Transaction) => {
    setEditingTransaction(tx);
    setEditForm({
      date: new Date(tx.date).toISOString().split("T")[0],
      type: tx.type,
      category: tx.category,
      amount: tx.amount,
      paymentStatus: tx.paymentStatus,
      memo: tx.memo || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleEdit = async () => {
    if (!editingTransaction) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: editForm.date,
          type: editForm.type,
          category: editForm.category,
          amount: editForm.amount,
          paymentStatus: editForm.paymentStatus,
          paymentDate: editForm.paymentStatus === "COMPLETED" ? new Date().toISOString() : null,
          memo: editForm.memo || null,
        }),
      });

      if (res.ok) {
        setIsEditDialogOpen(false);
        fetchTransactions();
      } else {
        alert("수정에 실패했습니다.");
      }
    } catch (error) {
      console.error("Edit error:", error);
      alert("수정 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (id: string) => {
    setDeletingId(id);
    setIsDeleteDialogOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/transactions/${deletingId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        setIsDeleteDialogOpen(false);
        fetchTransactions();
      } else {
        alert("삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
      setDeletingId(null);
    }
  };

  const togglePaymentStatus = async (tx: Transaction) => {
    const newStatus = tx.paymentStatus === "COMPLETED" ? "PENDING" : "COMPLETED";

    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: newStatus,
          paymentDate: newStatus === "COMPLETED" ? new Date().toISOString() : null,
        }),
      });

      if (res.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  // 거래 테이블 렌더링 컴포넌트
  const TransactionTable = ({ items, type }: { items: Transaction[]; type: "REVENUE" | "EXPENSE" }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">일자</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>메모</TableHead>
          <TableHead className="text-right">금액</TableHead>
          <TableHead className="w-[70px]">상태</TableHead>
          <TableHead className="w-[40px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((tx) => (
          <TableRow key={tx.id} className="group">
            <TableCell className="text-muted-foreground text-sm">
              {new Date(tx.date).getDate()}일
            </TableCell>
            <TableCell className="text-sm">{getCategoryLabel(tx.type, tx.category)}</TableCell>
            <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
              {tx.memo || tx.client?.name || tx.project?.name || "-"}
            </TableCell>
            <TableCell className={`text-right font-medium ${type === "REVENUE" ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(tx.amount)}
            </TableCell>
            <TableCell>
              <button
                onClick={() => togglePaymentStatus(tx)}
                className="hover:opacity-70 transition-opacity"
              >
                {tx.paymentStatus === "COMPLETED" ? (
                  <Badge variant="success" className="cursor-pointer text-xs px-1.5">
                    완료
                  </Badge>
                ) : (
                  <Badge variant="warning" className="cursor-pointer text-xs px-1.5">
                    대기
                  </Badge>
                )}
              </button>
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => openEditDialog(tx)}>
                    <Edit className="h-4 w-4 mr-2" />
                    수정
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(tx.id)}
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
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">재무 관리</h1>
          <p className="text-muted-foreground mt-1">
            월별 수익과 비용을 한눈에 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/finance/bulk">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              여러 건 입력
            </Link>
          </Button>
          <Button
            variant="outline"
            className="text-emerald-600 border-emerald-600 hover:bg-emerald-50"
            onClick={() => setIsAddRevenueDialogOpen(true)}
          >
            <ArrowUpRight className="h-4 w-4 mr-2" />
            수입 추가
          </Button>
          <Button
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => setIsAddExpenseDialogOpen(true)}
          >
            <ArrowDownRight className="h-4 w-4 mr-2" />
            지출 추가
          </Button>
        </div>
      </div>

      {/* 월 선택 */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-muted-foreground" />
              <span className="font-medium">조회 기간</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextMonth}
                disabled={isCurrentMonth}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              {currentMonthLabel} 수입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(totalRevenue)}
            </div>
            <p className="text-xs text-emerald-600/70 mt-1">
              {revenueTransactions.length}건
            </p>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              {currentMonthLabel} 지출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(totalExpense)}
            </div>
            <p className="text-xs text-red-600/70 mt-1">
              {expenseTransactions.length}건
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {currentMonthLabel} 순이익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 수입/지출 2단 레이아웃 */}
      {loading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[400px]" />
          <Skeleton className="h-[400px]" />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* 수입 섹션 */}
          <Card>
            <CardHeader className="border-b bg-emerald-50/50 dark:bg-emerald-950/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <ArrowUpRight className="h-5 w-5" />
                  수입
                </CardTitle>
                <Badge variant="success" className="text-base px-3">
                  {formatCurrency(totalRevenue)}
                </Badge>
              </div>
              {revenueByCategory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {revenueByCategory.map(([category, data]) => (
                    <Badge key={category} variant="outline" className="text-xs font-normal">
                      {data.label}: {formatCurrency(data.total)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {revenueTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{currentMonthLabel} 수입 내역이 없습니다</p>
                </div>
              ) : (
                <TransactionTable items={revenueTransactions} type="REVENUE" />
              )}
            </CardContent>
          </Card>

          {/* 지출 섹션 */}
          <Card>
            <CardHeader className="border-b bg-red-50/50 dark:bg-red-950/10 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-red-700 dark:text-red-400">
                  <ArrowDownRight className="h-5 w-5" />
                  지출
                </CardTitle>
                <Badge variant="destructive" className="text-base px-3">
                  {formatCurrency(totalExpense)}
                </Badge>
              </div>
              {expenseByCategory.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {expenseByCategory.map(([category, data]) => (
                    <Badge key={category} variant="outline" className="text-xs font-normal">
                      {data.label}: {formatCurrency(data.total)}
                    </Badge>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {expenseTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{currentMonthLabel} 지출 내역이 없습니다</p>
                </div>
              ) : (
                <TransactionTable items={expenseTransactions} type="EXPENSE" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>거래 수정</DialogTitle>
            <DialogDescription>
              거래 내역을 수정합니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select
                  value={editForm.type}
                  onValueChange={(value) => setEditForm({ ...editForm, type: value, category: "" })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REVENUE">수익</SelectItem>
                    <SelectItem value="EXPENSE">비용</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={editForm.category}
                  onValueChange={(value) => setEditForm({ ...editForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {editForm.type === "REVENUE" ? (
                      REVENUE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))
                    ) : (
                      Object.entries(EXPENSE_CATEGORY_GROUPS).map(([groupName, categories]) => (
                        <div key={groupName}>
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                            {groupName}
                          </div>
                          {categories.map((cat) => (
                            <SelectItem key={cat.value} value={cat.value}>
                              {cat.label}
                            </SelectItem>
                          ))}
                        </div>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>금액</Label>
                <Input
                  type="number"
                  value={editForm.amount}
                  onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>결제 상태</Label>
              <Select
                value={editForm.paymentStatus}
                onValueChange={(value) => setEditForm({ ...editForm, paymentStatus: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">대기</SelectItem>
                  <SelectItem value="COMPLETED">완료</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={editForm.memo}
                onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
                placeholder="메모 입력"
                rows={3}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleEdit} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              저장
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>거래 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 거래 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Add Revenue Dialog (수입 추가) */}
      <Dialog open={isAddRevenueDialogOpen} onOpenChange={setIsAddRevenueDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowUpRight className="h-5 w-5" />
              수입 추가
            </DialogTitle>
            <DialogDescription>
              고정업체를 선택하면 금액이 자동으로 입력됩니다.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={newRevenueForm.date}
                  onChange={(e) => setNewRevenueForm({ ...newRevenueForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={newRevenueForm.category}
                  onValueChange={(value) => setNewRevenueForm({ ...newRevenueForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVENUE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 고정업체 선택 */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                고정업체 선택
              </Label>
              <Select value={selectedVendor} onValueChange={handleVendorSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="고정업체를 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {fixedVendors.length === 0 ? (
                    <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                      등록된 고정업체가 없습니다.
                      <Link href="/clients/new" className="block text-primary hover:underline mt-1">
                        고정업체 등록하기
                      </Link>
                    </div>
                  ) : (
                    fixedVendors.map((vendor) => (
                      <SelectItem key={vendor.id} value={vendor.id}>
                        {vendor.name}
                        {vendor.monthlyFee && (
                          <span className="text-muted-foreground ml-2">
                            ({(vendor.monthlyFee / 10000).toFixed(0)}만원)
                          </span>
                        )}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* 금액 입력 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>금액 (만원)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="manualAmount"
                    checked={newRevenueForm.isManualAmount}
                    onCheckedChange={(checked) => {
                      setNewRevenueForm({
                        ...newRevenueForm,
                        isManualAmount: checked as boolean,
                      });
                    }}
                  />
                  <Label htmlFor="manualAmount" className="text-sm cursor-pointer flex items-center gap-1">
                    <Pencil className="h-3 w-3" />
                    수기 입력
                  </Label>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="예: 50"
                  value={newRevenueForm.amountInMan}
                  onChange={(e) => {
                    const value = e.target.value;
                    const amount = value ? Number(value) * 10000 : 0;
                    setNewRevenueForm({
                      ...newRevenueForm,
                      amountInMan: value,
                      amount,
                      isManualAmount: true,
                    });
                  }}
                  disabled={!newRevenueForm.isManualAmount && selectedVendor !== ""}
                />
                <span className="text-muted-foreground whitespace-nowrap">만원</span>
              </div>
              {newRevenueForm.amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {formatCurrency(newRevenueForm.amount)}
                </p>
              )}
            </div>

            {/* 미수 체크박스 */}
            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-amber-50 border-amber-200">
              <Checkbox
                id="isReceivable"
                checked={newRevenueForm.isReceivable}
                onCheckedChange={(checked) =>
                  setNewRevenueForm({ ...newRevenueForm, isReceivable: checked as boolean })
                }
              />
              <Label htmlFor="isReceivable" className="cursor-pointer text-amber-800">
                미수 (아직 입금되지 않음)
              </Label>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={newRevenueForm.memo}
                onChange={(e) => setNewRevenueForm({ ...newRevenueForm, memo: e.target.value })}
                placeholder="메모 입력"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddRevenueDialogOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleAddRevenue} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Expense Dialog (지출 추가) */}
      <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ArrowDownRight className="h-5 w-5" />
              지출 추가
            </DialogTitle>
            <DialogDescription>
              지출 내역을 입력하세요.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input
                  type="date"
                  value={newExpenseForm.date}
                  onChange={(e) => setNewExpenseForm({ ...newExpenseForm, date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>카테고리</Label>
                <Select
                  value={newExpenseForm.category}
                  onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORY_GROUPS).map(([groupName, categories]) => (
                      <div key={groupName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                          {groupName}
                        </div>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* 금액 입력 */}
            <div className="space-y-2">
              <Label>금액 (만원)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="예: 5"
                  value={newExpenseForm.amountInMan}
                  onChange={(e) => {
                    const value = e.target.value;
                    const amount = value ? Number(value) * 10000 : 0;
                    setNewExpenseForm({
                      ...newExpenseForm,
                      amountInMan: value,
                      amount,
                    });
                  }}
                />
                <span className="text-muted-foreground whitespace-nowrap">만원</span>
              </div>
              {newExpenseForm.amount > 0 && (
                <p className="text-xs text-muted-foreground">
                  = {formatCurrency(newExpenseForm.amount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea
                value={newExpenseForm.memo}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, memo: e.target.value })}
                placeholder="메모 입력"
                rows={2}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddExpenseDialogOpen(false)} disabled={isSubmitting}>
              취소
            </Button>
            <Button onClick={handleAddExpense} disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              추가
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
