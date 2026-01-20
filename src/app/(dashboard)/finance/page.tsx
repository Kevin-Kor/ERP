"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Megaphone,
  Wallet,
  HandCoins,
  Plus,
} from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
} from "@/lib/utils";

interface Transaction {
  id: string;
  date: string;
  type: string;
  category: string;
  amount: number;
  paymentStatus: string;
  paymentDate: string | null;
  memo: string | null;
  vendorName: string | null;
  client: { id: string; name: string } | null;
  project: { id: string; name: string } | null;
  influencer: { id: string; name: string } | null;
}

interface FixedVendor {
  id: string;
  name: string;
  monthlyFee: number | null;
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
    // ✅ conflict 해결: client null-safe
    project: { id: string; name: string; client: { id: string; name: string } | null };
    totalFee: number;
    influencers: number;
  }[];
}

export default function FinancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [settlementSummary, setSettlementSummary] = useState<SettlementSummary | null>(null);

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
    vendorName: "",
  });

  // Delete confirmation state
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Category filter state
  const [selectedRevenueCategory, setSelectedRevenueCategory] = useState<string | null>(null);
  const [selectedExpenseCategory, setSelectedExpenseCategory] = useState<string | null>(null);

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
    vendorName: "", // 업체명
    advertiser: "", // 광고업체명 (AD_REVENUE 카테고리용)
    isReceivable: false, // 미수 여부
    paymentType: "NORMAL" as "NORMAL" | "DEPOSIT" | "BALANCE", // 결제 유형: 선금/착수금/일반
  });

  // Add expense modal state
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false);
  const [newExpenseForm, setNewExpenseForm] = useState({
    date: new Date().toISOString().split("T")[0],
    category: "FOOD",
    amount: 0,
    amountInMan: "",
    memo: "",
    vendorName: "", // 업체명
  });

  // Payment completion date picker state
  const [completingTransaction, setCompletingTransaction] = useState<Transaction | null>(null);
  const [isPaymentDateDialogOpen, setIsPaymentDateDialogOpen] = useState(false);
  const [selectedPaymentDate, setSelectedPaymentDate] = useState(new Date().toISOString().split("T")[0]);

  const settlementStatusOptions: { value: SettlementStatus; label: string }[] = [
    { value: "pending", label: "예정" },
    { value: "in_progress", label: "진행 중" },
    { value: "completed", label: "완료" },
  ];

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMonth]);

  useEffect(() => {
    fetchSettlementSummary();
  }, []);

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

  async function fetchSettlementSummary() {
    try {
      const res = await fetch("/api/settlements/summary");
      const data = await res.json();
      setSettlementSummary(data);
    } catch (error) {
      console.error("Failed to fetch settlement summary:", error);
    }
  }

  // 고정업체 선택 시 금액 자동 입력
  const handleVendorSelect = (vendorId: string) => {
    setSelectedVendor(vendorId);
    const vendor = fixedVendors.find((v) => v.id === vendorId);
    if (vendor && vendor.monthlyFee && !newRevenueForm.isManualAmount) {
      const amountInMan = (vendor.monthlyFee / 10000).toString();
      setNewRevenueForm((prev) => ({
        ...prev,
        clientId: vendorId,
        amount: vendor.monthlyFee || 0,
        amountInMan,
      }));
    } else {
      setNewRevenueForm((prev) => ({
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

    // 메모 생성 로직
    let finalMemo = newRevenueForm.memo;

    // 결제 유형 prefix 추가
    if (newRevenueForm.paymentType === "DEPOSIT") {
      finalMemo = `[선금]${finalMemo ? " " + finalMemo : ""}`;
    } else if (newRevenueForm.paymentType === "BALANCE") {
      finalMemo = `[착수금]${finalMemo ? " " + finalMemo : ""}`;
    }

    // AD_REVENUE 카테고리의 경우 광고업체명 포함
    if (newRevenueForm.category === "AD_REVENUE" && newRevenueForm.advertiser) {
      finalMemo = `[광고업체: ${newRevenueForm.advertiser}]${finalMemo ? " " + finalMemo : ""}`;
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
          memo: finalMemo || null,
          vendorName: newRevenueForm.vendorName || null,
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
          vendorName: "",
          advertiser: "",
          isReceivable: false,
          paymentType: "NORMAL" as "NORMAL" | "DEPOSIT" | "BALANCE",
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
          vendorName: newExpenseForm.vendorName || null,
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
          vendorName: "",
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

  // 수입 거래 (미수금 제외 - PENDING 상태가 아닌 모든 거래)
  const revenueTransactions = useMemo(
    () => transactions.filter((t) => t.type === "REVENUE" && t.paymentStatus !== "PENDING"),
    [transactions]
  );

  // 지출 거래
  const expenseTransactions = useMemo(
    () => transactions.filter((t) => t.type === "EXPENSE"),
    [transactions]
  );

  // 필터된 수입 거래
  const filteredRevenueTransactions = useMemo(
    () =>
      selectedRevenueCategory
        ? revenueTransactions.filter((t) => t.category === selectedRevenueCategory)
        : revenueTransactions,
    [revenueTransactions, selectedRevenueCategory]
  );

  // 필터된 지출 거래
  const filteredExpenseTransactions = useMemo(
    () =>
      selectedExpenseCategory
        ? expenseTransactions.filter((t) => t.category === selectedExpenseCategory)
        : expenseTransactions,
    [expenseTransactions, selectedExpenseCategory]
  );

  // 미수금 (대기 상태인 수입)
  const receivables = useMemo(
    () => transactions.filter((t) => t.type === "REVENUE" && t.paymentStatus === "PENDING"),
    [transactions]
  );

  const totalReceivables = receivables.reduce((sum, t) => sum + t.amount, 0);

  // 미수금 카테고리 필터
  const [selectedReceivableCategory, setSelectedReceivableCategory] = useState<string | null>(null);

  // 필터된 미수금
  const filteredReceivables = useMemo(
    () =>
      selectedReceivableCategory
        ? receivables.filter((t) => t.category === selectedReceivableCategory)
        : receivables,
    [receivables, selectedReceivableCategory]
  );

  // 미수금 카테고리별 집계
  const receivablesByCategory = useMemo(() => {
    const grouped: Record<string, { label: string; total: number; count: number }> = {};
    receivables.forEach((t) => {
      if (!grouped[t.category]) {
        const cat = REVENUE_CATEGORIES.find((c) => c.value === t.category);
        grouped[t.category] = { label: cat?.label || t.category, total: 0, count: 0 };
      }
      grouped[t.category].total += t.amount;
      grouped[t.category].count += 1;
    });
    return Object.entries(grouped).sort((a, b) => b[1].total - a[1].total);
  }, [receivables]);

  // 선금/착수금 파싱 및 집계
  const paymentTypeBreakdown = useMemo(() => {
    const deposit = revenueTransactions.filter(t => t.memo?.includes('[선금]'));
    const downPayment = revenueTransactions.filter(t => t.memo?.includes('[착수금]'));
    const depositTotal = deposit.reduce((sum, t) => sum + t.amount, 0);
    const downPaymentTotal = downPayment.reduce((sum, t) => sum + t.amount, 0);

    return {
      deposit: { count: deposit.length, total: depositTotal, transactions: deposit },
      downPayment: { count: downPayment.length, total: downPaymentTotal, transactions: downPayment },
      hasData: deposit.length > 0 || downPayment.length > 0,
    };
  }, [revenueTransactions]);

  // 광고업체 정보 추출 헬퍼 함수
  const extractAdvertiserInfo = (memo: string | null): string | null => {
    if (!memo) return null;
    // [광고업체: XXX] 또는 [광고주:XXX] 패턴 찾기
    const match = memo.match(/\[광고(?:업체|주)\s*:\s*([^\]]+)\]/);
    return match ? match[1].trim() : null;
  };

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
      vendorName: tx.vendorName || "",
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
          vendorName: editForm.vendorName || null,
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
    // 미수금(PENDING)을 완료로 변경하는 경우, 날짜 선택 다이얼로그 표시
    if (tx.paymentStatus === "PENDING") {
      setCompletingTransaction(tx);
      setSelectedPaymentDate(new Date().toISOString().split("T")[0]);
      setIsPaymentDateDialogOpen(true);
      return;
    }

    // 완료(COMPLETED)를 미수금(PENDING)으로 되돌리는 경우
    try {
      const res = await fetch(`/api/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "PENDING",
          paymentDate: null,
        }),
      });

      if (res.ok) {
        fetchTransactions();
      }
    } catch (error) {
      console.error("Toggle status error:", error);
    }
  };

  // 입금 완료 처리 (선택된 날짜로)
  const completePayment = async () => {
    if (!completingTransaction) return;

    try {
      const res = await fetch(`/api/transactions/${completingTransaction.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentStatus: "COMPLETED",
          paymentDate: new Date(selectedPaymentDate).toISOString(),
        }),
      });

      if (res.ok) {
        setIsPaymentDateDialogOpen(false);
        setCompletingTransaction(null);
        fetchTransactions();
      }
    } catch (error) {
      console.error("Complete payment error:", error);
    }
  };

  // 결제 유형 파싱 헬퍼 함수
  const parsePaymentType = (memo: string | null): { type: string | null; cleanMemo: string } => {
    if (!memo) return { type: null, cleanMemo: "" };

    if (memo.includes("[선금]")) {
      return { type: "선금", cleanMemo: memo.replace("[선금]", "").trim() };
    } else if (memo.includes("[잔금]")) {
      return { type: "잔금", cleanMemo: memo.replace("[잔금]", "").trim() };
    } else if (memo.includes("[착수금]")) {
      return { type: "착수금", cleanMemo: memo.replace("[착수금]", "").trim() };
    }

    return { type: null, cleanMemo: memo };
  };

  // 거래 테이블 렌더링 컴포넌트
  const TransactionTable = ({
    items,
    type,
  }: {
    items: Transaction[];
    type: "REVENUE" | "EXPENSE";
  }) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[80px]">일자</TableHead>
          <TableHead>카테고리</TableHead>
          <TableHead>업체명</TableHead>
          <TableHead>메모</TableHead>
          <TableHead className="text-right">금액</TableHead>
          <TableHead className="w-[70px]">상태</TableHead>
          <TableHead className="w-[40px]"></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((tx) => {
          const { type: paymentType, cleanMemo } = parsePaymentType(tx.memo);
          return (
            <TableRow key={tx.id} className="group">
              <TableCell className="text-muted-foreground text-sm">{new Date(tx.date).getDate()}일</TableCell>
              <TableCell className="text-sm">{getCategoryLabel(tx.type, tx.category)}</TableCell>
              <TableCell className="text-sm font-medium">
                {tx.vendorName || tx.client?.name || "-"}
              </TableCell>
              <TableCell className="text-muted-foreground text-sm max-w-[150px]">
                <div className="flex items-center gap-1">
                  {paymentType && (
                    <Badge
                      variant="outline"
                      className={`text-xs px-1.5 shrink-0 ${
                        paymentType === "선금"
                          ? "bg-blue-50 text-blue-700 border-blue-200"
                          : paymentType === "잔금"
                          ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-purple-50 text-purple-700 border-purple-200"
                      }`}
                    >
                      {paymentType}
                    </Badge>
                  )}
                  <span className="truncate">{cleanMemo || tx.project?.name || "-"}</span>
                </div>
              </TableCell>
              <TableCell
                className={`text-right font-medium ${
                  type === "REVENUE" ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(tx.amount)}
              </TableCell>
              <TableCell>
                <button onClick={() => togglePaymentStatus(tx)} className="hover:opacity-70 transition-opacity">
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
                    <DropdownMenuItem onClick={() => openDeleteDialog(tx.id)} className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">재무 관리</h1>
          <p className="text-muted-foreground mt-1">월별 수익과 비용을 한눈에 관리합니다.</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/finance/bulk">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            수입/지출 입력
          </Link>
        </Button>
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
              <Button variant="outline" size="icon" onClick={goToNextMonth} disabled={isCurrentMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-2 border-emerald-500 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-600 flex items-center gap-2">
              <ArrowUpRight className="h-4 w-4" />
              {currentMonthLabel} 수입
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-emerald-600">{formatCurrency(totalRevenue)}</div>
            <p className="text-sm text-gray-500 mt-1">{revenueTransactions.length}건</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-red-500 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-red-600 flex items-center gap-2">
              <ArrowDownRight className="h-4 w-4" />
              {currentMonthLabel} 지출
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{formatCurrency(totalExpense)}</div>
            <p className="text-sm text-gray-500 mt-1">{expenseTransactions.length}건</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-gray-300 bg-white dark:bg-gray-900">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              {netProfit >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-600" />
              )}
              {currentMonthLabel} 순이익
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${netProfit >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(netProfit)}
            </div>
          </CardContent>
        </Card>
      </div>

      {settlementSummary && (
        <Card>
          <CardHeader>
            <CardTitle>정산 집계</CardTitle>
            <CardDescription>인플루언서/프로젝트 정산 현황 요약</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              {settlementStatusOptions.map((option) => (
                <div key={option.value} className="rounded-lg border p-3">
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <span>{option.label}</span>
                    <Badge variant="outline">{settlementSummary.statusTotals[option.value].count}건</Badge>
                  </div>
                  <div className="text-xl font-semibold text-primary mt-1">
                    {formatCurrency(settlementSummary.statusTotals[option.value].amount)}
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">인플루언서별 합계</h3>
                  <Link href="/settlements" className="text-xs text-primary hover:underline">
                    정산 관리로 이동
                  </Link>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>이름</TableHead>
                      <TableHead className="text-right">합계</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementSummary.influencerTotals.slice(0, 3).map((item) => (
                      <TableRow key={item.influencer.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.influencer.name}</span>
                            {item.influencer.instagramId && (
                              <span className="text-xs text-muted-foreground">@{item.influencer.instagramId}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalFee)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="space-y-2">
                <h3 className="text-sm font-medium">프로젝트별 합계</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>프로젝트</TableHead>
                      <TableHead className="text-right">합계</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlementSummary.projectTotals.slice(0, 3).map((item) => (
                      <TableRow key={item.project.id}>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{item.project.name}</span>
                            {/* ✅ conflict 해결: client null-safe */}
                            <span className="text-xs text-muted-foreground">
                              {item.project.client?.name || "클라이언트 미지정"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(item.totalFee)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-emerald-600">
                  <ArrowUpRight className="h-5 w-5" />
                  수입
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-base px-3">
                    {formatCurrency(totalRevenue)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => setIsAddRevenueDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
              </div>
              {revenueByCategory.length > 0 && (
                <div className="mt-3">
                  <Select
                    value={selectedRevenueCategory || "all"}
                    onValueChange={(value) => setSelectedRevenueCategory(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 ({formatCurrency(totalRevenue)})</SelectItem>
                      {revenueByCategory.map(([category, data]) => (
                        <SelectItem key={category} value={category}>
                          {data.label} ({formatCurrency(data.total)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {filteredRevenueTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{currentMonthLabel} 수입 내역이 없습니다</p>
                </div>
              ) : (
                <TransactionTable items={filteredRevenueTransactions} type="REVENUE" />
              )}
            </CardContent>
          </Card>

          {/* 지출 섹션 */}
          <Card>
            <CardHeader className="border-b pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2 text-red-600">
                  <ArrowDownRight className="h-5 w-5" />
                  지출
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="destructive" className="text-base px-3">
                    {formatCurrency(totalExpense)}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-500 text-red-600 hover:bg-red-50"
                    onClick={() => setIsAddExpenseDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    추가
                  </Button>
                </div>
              </div>
              {expenseByCategory.length > 0 && (
                <div className="mt-3">
                  <Select
                    value={selectedExpenseCategory || "all"}
                    onValueChange={(value) => setSelectedExpenseCategory(value === "all" ? null : value)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체 ({formatCurrency(totalExpense)})</SelectItem>
                      {expenseByCategory.map(([category, data]) => (
                        <SelectItem key={category} value={category}>
                          {data.label} ({formatCurrency(data.total)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent className="p-0">
              {filteredExpenseTransactions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>{currentMonthLabel} 지출 내역이 없습니다</p>
                </div>
              ) : (
                <TransactionTable items={filteredExpenseTransactions} type="EXPENSE" />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 선금/착수금 추적 섹션 */}
      {paymentTypeBreakdown.hasData && (
        <Card className="border-2 border-blue-400">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-blue-600">
                <Wallet className="h-5 w-5" />
                선금/착수금 추적
              </CardTitle>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              {currentMonthLabel} 선금 및 착수금 현황
            </p>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            {/* 요약 카드 */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border-2 border-blue-200 bg-blue-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <HandCoins className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">선금</h3>
                  </div>
                  <Badge variant="outline" className="bg-blue-100">
                    {paymentTypeBreakdown.deposit.count}건
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {formatCurrency(paymentTypeBreakdown.deposit.total)}
                </div>
              </div>

              <div className="rounded-lg border-2 border-purple-200 bg-purple-50/50 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-purple-600" />
                    <h3 className="font-medium text-purple-900">착수금/잔금</h3>
                  </div>
                  <Badge variant="outline" className="bg-purple-100">
                    {paymentTypeBreakdown.downPayment.count}건
                  </Badge>
                </div>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(paymentTypeBreakdown.downPayment.total)}
                </div>
              </div>
            </div>

            {/* 상세 내역 */}
            {(paymentTypeBreakdown.deposit.count > 0 || paymentTypeBreakdown.downPayment.count > 0) && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">상세 내역</h4>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">일자</TableHead>
                      <TableHead className="w-[80px]">유형</TableHead>
                      <TableHead>클라이언트</TableHead>
                      <TableHead>메모</TableHead>
                      <TableHead className="text-right">금액</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {[...paymentTypeBreakdown.deposit.transactions, ...paymentTypeBreakdown.downPayment.transactions]
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((tx) => {
                        const isDeposit = tx.memo?.includes('[선금]');
                        return (
                          <TableRow key={tx.id}>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(tx.date).getDate()}일
                            </TableCell>
                            <TableCell>
                              <Badge variant={isDeposit ? "default" : "secondary"} className="text-xs">
                                {isDeposit ? '선금' : '착수금'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">
                              {tx.client?.name || "-"}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                              {tx.memo?.replace(/\[(선금|착수금)\]\s*/, '') || "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {formatCurrency(tx.amount)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 미수금 관리 섹션 - Enhanced */}
      {receivables.length > 0 && (
        <Card className="border-2 border-amber-400">
          <CardHeader className="border-b pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2 text-amber-600">
                <Clock className="h-5 w-5" />
                미수금 관리
              </CardTitle>
              <Badge className="text-base px-3 bg-amber-500 hover:bg-amber-600">
                {formatCurrency(selectedReceivableCategory ? filteredReceivables.reduce((sum, t) => sum + t.amount, 0) : totalReceivables)}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              아직 입금되지 않은 수입 {selectedReceivableCategory ? filteredReceivables.length : receivables.length}건
            </p>
            {/* 카테고리 필터 */}
            {receivablesByCategory.length > 0 && (
              <div className="mt-3">
                <Select
                  value={selectedReceivableCategory || "all"}
                  onValueChange={(value) => setSelectedReceivableCategory(value === "all" ? null : value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="카테고리별 필터" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">
                      전체 ({formatCurrency(totalReceivables)})
                    </SelectItem>
                    {receivablesByCategory.map(([category, data]) => (
                      <SelectItem key={category} value={category}>
                        {data.label} ({formatCurrency(data.total)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">일자</TableHead>
                  <TableHead>카테고리</TableHead>
                  <TableHead>업체명</TableHead>
                  <TableHead>광고업체</TableHead>
                  <TableHead>메모</TableHead>
                  <TableHead className="text-right">금액</TableHead>
                  <TableHead className="w-[100px]">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReceivables.map((tx) => {
                  const advertiser = extractAdvertiserInfo(tx.memo);
                  const isAdRevenue = tx.category === "AD_REVENUE";
                  const isDeposit = tx.memo?.includes("[선금]");
                  const isBalance = tx.memo?.includes("[잔금]");
                  return (
                    <TableRow
                      key={tx.id}
                      className={`group ${isAdRevenue ? 'bg-pink-50/50 dark:bg-pink-950/10' : ''} ${isDeposit ? 'bg-blue-50/50 dark:bg-blue-950/10' : ''} ${isBalance ? 'bg-green-50/50 dark:bg-green-950/10' : ''}`}
                    >
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(tx.date).getDate()}일
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          {isAdRevenue && <Megaphone className="h-3 w-3 text-pink-600" />}
                          <span className="text-sm">{getCategoryLabel(tx.type, tx.category)}</span>
                          {isDeposit && (
                            <Badge variant="outline" className="text-xs bg-blue-100 text-blue-700 border-blue-300">
                              선금
                            </Badge>
                          )}
                          {isBalance && (
                            <Badge variant="outline" className="text-xs bg-green-100 text-green-700 border-green-300">
                              잔금
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        {tx.vendorName || tx.client?.name || "-"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {advertiser ? (
                          <Badge variant="outline" className="text-xs bg-pink-100 text-pink-700 border-pink-300">
                            {advertiser}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[150px] truncate">
                        {tx.memo?.replace(/\[(선금|잔금|착수금)\]\s*/g, '').replace(/\[광고(?:업체|주)\s*:\s*[^\]]+\]\s*/, '') || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-amber-600">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => togglePaymentStatus(tx)}
                          className={`h-7 text-xs ${
                            isDeposit
                              ? "border-blue-500 text-blue-600 hover:bg-blue-50"
                              : isBalance
                              ? "border-green-500 text-green-600 hover:bg-green-50"
                              : "border-emerald-500 text-emerald-600 hover:bg-emerald-50"
                          }`}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          입금 완료
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>거래 수정</DialogTitle>
            <DialogDescription>거래 내역을 수정합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>날짜</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>유형</Label>
                <Select value={editForm.type} onValueChange={(value) => setEditForm({ ...editForm, type: value, category: "" })}>
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
                <Select value={editForm.category} onValueChange={(value) => setEditForm({ ...editForm, category: value })}>
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
                          <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{groupName}</div>
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
                <Input type="number" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: Number(e.target.value) })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>결제 상태</Label>
              <Select value={editForm.paymentStatus} onValueChange={(value) => setEditForm({ ...editForm, paymentStatus: value })}>
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
              <Textarea value={editForm.memo} onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })} placeholder="메모 입력" rows={3} />
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
            <AlertDialogDescription>이 거래 내역을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.</AlertDialogDescription>
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

      {/* Add Revenue Dialog */}
      <Dialog open={isAddRevenueDialogOpen} onOpenChange={setIsAddRevenueDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <ArrowUpRight className="h-5 w-5" />
              수입 추가
            </DialogTitle>
            <DialogDescription>고정업체를 선택하면 금액이 자동으로 입력됩니다.</DialogDescription>
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
                <Select value={newRevenueForm.category} onValueChange={(value) => setNewRevenueForm({ ...newRevenueForm, category: value })}>
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

            {/* 광고수입 선택 시 광고업체 입력 필드 표시 */}
            {newRevenueForm.category === "AD_REVENUE" && (
              <div className="space-y-2">
                <Label>광고항목(업체) *</Label>
                <Input
                  type="text"
                  placeholder="광고업체명을 입력하세요"
                  value={newRevenueForm.advertiser}
                  onChange={(e) => setNewRevenueForm({ ...newRevenueForm, advertiser: e.target.value })}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label>업체명</Label>
              <Input
                type="text"
                placeholder="업체명을 입력하세요"
                value={newRevenueForm.vendorName}
                onChange={(e) => setNewRevenueForm({ ...newRevenueForm, vendorName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                수입 카테고리에 표시될 업체명입니다
              </p>
            </div>

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

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>금액 (만원)</Label>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="manualAmount"
                    checked={newRevenueForm.isManualAmount}
                    onCheckedChange={(checked) =>
                      setNewRevenueForm({ ...newRevenueForm, isManualAmount: checked as boolean })
                    }
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
                    setNewRevenueForm({ ...newRevenueForm, amountInMan: value, amount, isManualAmount: true });
                  }}
                  disabled={!newRevenueForm.isManualAmount && selectedVendor !== ""}
                />
                <span className="text-muted-foreground whitespace-nowrap">만원</span>
              </div>

              {newRevenueForm.amount > 0 && (
                <p className="text-xs text-muted-foreground">= {formatCurrency(newRevenueForm.amount)}</p>
              )}
            </div>

            <div className="flex items-center space-x-2 p-3 border rounded-lg bg-amber-50 border-amber-200">
              <Checkbox
                id="isReceivable"
                checked={newRevenueForm.isReceivable}
                onCheckedChange={(checked) => setNewRevenueForm({ ...newRevenueForm, isReceivable: checked as boolean })}
              />
              <Label htmlFor="isReceivable" className="cursor-pointer text-amber-800">
                미수 (아직 입금되지 않음)
              </Label>
            </div>

            <div className="space-y-2">
              <Label>결제 유형</Label>
              <Select
                value={newRevenueForm.paymentType}
                onValueChange={(value: "NORMAL" | "DEPOSIT" | "BALANCE") =>
                  setNewRevenueForm({ ...newRevenueForm, paymentType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NORMAL">일반</SelectItem>
                  <SelectItem value="DEPOSIT">선금</SelectItem>
                  <SelectItem value="BALANCE">착수금/잔금</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                선금 또는 착수금 선택 시 메모에 자동으로 표시됩니다
              </p>
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea value={newRevenueForm.memo} onChange={(e) => setNewRevenueForm({ ...newRevenueForm, memo: e.target.value })} placeholder="메모 입력" rows={2} />
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

      {/* Add Expense Dialog */}
      <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <ArrowDownRight className="h-5 w-5" />
              지출 추가
            </DialogTitle>
            <DialogDescription>지출 내역을 입력하세요.</DialogDescription>
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
                <Select value={newExpenseForm.category} onValueChange={(value) => setNewExpenseForm({ ...newExpenseForm, category: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORY_GROUPS).map(([groupName, categories]) => (
                      <div key={groupName}>
                        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">{groupName}</div>
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

            <div className="space-y-2">
              <Label>업체명</Label>
              <Input
                type="text"
                placeholder="업체명을 입력하세요"
                value={newExpenseForm.vendorName}
                onChange={(e) => setNewExpenseForm({ ...newExpenseForm, vendorName: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                지출 카테고리에 표시될 업체명입니다
              </p>
            </div>

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
                    setNewExpenseForm({ ...newExpenseForm, amountInMan: value, amount });
                  }}
                />
                <span className="text-muted-foreground whitespace-nowrap">만원</span>
              </div>
              {newExpenseForm.amount > 0 && (
                <p className="text-xs text-muted-foreground">= {formatCurrency(newExpenseForm.amount)}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>메모</Label>
              <Textarea value={newExpenseForm.memo} onChange={(e) => setNewExpenseForm({ ...newExpenseForm, memo: e.target.value })} placeholder="메모 입력" rows={2} />
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

      {/* Payment Completion Date Dialog */}
      <Dialog open={isPaymentDateDialogOpen} onOpenChange={setIsPaymentDateDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="h-5 w-5" />
              입금 완료 날짜 선택
            </DialogTitle>
            <DialogDescription>
              입금이 완료된 날짜를 선택하세요. 선택한 날짜의 월에 수입이 집계됩니다.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {completingTransaction && (
              <div className="p-3 bg-gray-50 rounded-lg space-y-1">
                <p className="text-sm font-medium">{completingTransaction.client?.name || "클라이언트 없음"}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(completingTransaction.amount)}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="paymentDate">입금 완료 날짜</Label>
              <Input
                id="paymentDate"
                type="date"
                value={selectedPaymentDate}
                onChange={(e) => setSelectedPaymentDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsPaymentDateDialogOpen(false);
                setCompletingTransaction(null);
              }}
            >
              취소
            </Button>
            <Button
              onClick={completePayment}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              입금 완료
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
