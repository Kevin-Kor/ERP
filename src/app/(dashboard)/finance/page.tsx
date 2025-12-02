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

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("all");
  
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

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter]);

  async function fetchTransactions() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(data.transactions || []);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  }

  const totalRevenue = transactions
    .filter((t) => t.type === "REVENUE")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

  const netProfit = totalRevenue - totalExpense;

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

  const categories = editForm.type === "REVENUE" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">재무 관리</h1>
          <p className="text-muted-foreground mt-1">
            수익과 비용을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/finance/bulk">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              여러 건 입력
            </Link>
          </Button>
          <Button asChild>
            <Link href="/finance/new">
              <Plus className="h-4 w-4 mr-2" />
              거래 추가
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              총 수익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        <Card className="bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              총 비용
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-700 dark:text-red-300">
              {formatCurrency(totalExpense)}
            </div>
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
              순이익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="유형" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체</SelectItem>
                <SelectItem value="REVENUE">수익</SelectItem>
                <SelectItem value="EXPENSE">비용</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>거래 내역</CardTitle>
          <CardDescription>모든 수익 및 비용 내역 (클릭하여 수정/삭제)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12">
              <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">거래 내역이 없습니다</h3>
              <Button asChild className="mt-4">
                <Link href="/finance/new">
                  <Plus className="h-4 w-4 mr-2" />
                  거래 추가
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>일자</TableHead>
                  <TableHead>유형</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id} className="group">
                    <TableCell>{formatDate(tx.date)}</TableCell>
                    <TableCell>
                      <Badge variant={tx.type === "REVENUE" ? "success" : "destructive"}>
                        {tx.type === "REVENUE" ? "수익" : "비용"}
                      </Badge>
                    </TableCell>
                    <TableCell>{getCategoryLabel(tx.type, tx.category)}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">
                      {tx.memo || tx.client?.name || tx.project?.name || "-"}
                    </TableCell>
                    <TableCell className={`text-right font-medium ${tx.type === "REVENUE" ? "text-emerald-600" : "text-red-600"}`}>
                      {tx.type === "REVENUE" ? "+" : "-"}{formatCurrency(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => togglePaymentStatus(tx)}
                        className="flex items-center gap-1 hover:opacity-70 transition-opacity"
                      >
                        {tx.paymentStatus === "COMPLETED" ? (
                          <Badge variant="success" className="cursor-pointer">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            완료
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="cursor-pointer">
                            <Clock className="h-3 w-3 mr-1" />
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
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
          )}
        </CardContent>
      </Card>

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
    </div>
  );
}
