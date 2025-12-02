"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
  Utensils,
  Users,
  Car,
  Megaphone,
  Video,
  MoreHorizontal,
  Building2,
  Briefcase,
  Globe,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// 지출 카테고리
const EXPENSE_CATEGORIES = [
  { id: "FOOD", label: "식비", icon: Utensils, color: "bg-orange-100 text-orange-700 border-orange-200" },
  { id: "INFLUENCER_COST", label: "인플루언서 비용", icon: Users, color: "bg-pink-100 text-pink-700 border-pink-200" },
  { id: "TRANSPORT", label: "교통비", icon: Car, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "AD_EXPENSE", label: "광고비", icon: Megaphone, color: "bg-purple-100 text-purple-700 border-purple-200" },
  { id: "CONTENT_PRODUCTION", label: "컨텐츠 제작비", icon: Video, color: "bg-cyan-100 text-cyan-700 border-cyan-200" },
  { id: "OTHER_EXPENSE", label: "기타", icon: MoreHorizontal, color: "bg-gray-100 text-gray-700 border-gray-200" },
];

// 수입 카테고리
const REVENUE_CATEGORIES = [
  { id: "AD_REVENUE", label: "광고비", icon: Megaphone, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  { id: "FIXED_MANAGEMENT", label: "고정 관리업체", icon: Building2, color: "bg-blue-100 text-blue-700 border-blue-200" },
  { id: "PROJECT_MANAGEMENT", label: "건별 관리업체", icon: Briefcase, color: "bg-indigo-100 text-indigo-700 border-indigo-200" },
  { id: "PLATFORM_REVENUE", label: "플랫폼 수입", icon: Globe, color: "bg-violet-100 text-violet-700 border-violet-200" },
  { id: "OTHER_REVENUE", label: "기타", icon: Sparkles, color: "bg-gray-100 text-gray-700 border-gray-200" },
];

interface CategoryAmount {
  categoryId: string;
  amount: string;
  memo: string;
}

export default function BulkEntryPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"EXPENSE" | "REVENUE">("EXPENSE");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  
  const [expenseAmounts, setExpenseAmounts] = useState<CategoryAmount[]>(
    EXPENSE_CATEGORIES.map(cat => ({ categoryId: cat.id, amount: "", memo: "" }))
  );
  const [revenueAmounts, setRevenueAmounts] = useState<CategoryAmount[]>(
    REVENUE_CATEGORIES.map(cat => ({ categoryId: cat.id, amount: "", memo: "" }))
  );
  
  const [saving, setSaving] = useState(false);
  const [savedCategories, setSavedCategories] = useState<string[]>([]);

  // 월 옵션 생성 (최근 12개월)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    return { value, label };
  });

  const updateAmount = (
    type: "EXPENSE" | "REVENUE",
    categoryId: string,
    field: "amount" | "memo",
    value: string
  ) => {
    if (type === "EXPENSE") {
      setExpenseAmounts(prev =>
        prev.map(item =>
          item.categoryId === categoryId ? { ...item, [field]: value } : item
        )
      );
    } else {
      setRevenueAmounts(prev =>
        prev.map(item =>
          item.categoryId === categoryId ? { ...item, [field]: value } : item
        )
      );
    }
    // 수정 시 저장 상태 리셋
    setSavedCategories(prev => prev.filter(id => id !== categoryId));
  };

  const totalExpense = expenseAmounts.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );
  const totalRevenue = revenueAmounts.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  const validExpenses = expenseAmounts.filter(item => parseFloat(item.amount) > 0);
  const validRevenues = revenueAmounts.filter(item => parseFloat(item.amount) > 0);

  const handleSaveAll = async () => {
    const itemsToSave = [
      ...validExpenses.map(item => ({ ...item, type: "EXPENSE" as const })),
      ...validRevenues.map(item => ({ ...item, type: "REVENUE" as const })),
    ].filter(item => !savedCategories.includes(item.categoryId));

    if (itemsToSave.length === 0) {
      alert("저장할 항목이 없습니다.");
      return;
    }

    setSaving(true);

    try {
      // 선택한 월의 1일로 날짜 설정
      const date = `${selectedMonth}-01`;

      for (const item of itemsToSave) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            type: item.type,
            category: item.categoryId,
            amount: parseFloat(item.amount),
            paymentStatus: "COMPLETED",
            memo: item.memo || null,
          }),
        });

        if (res.ok) {
          setSavedCategories(prev => [...prev, item.categoryId]);
        }
      }

      alert(`${itemsToSave.length}건이 저장되었습니다.`);
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryInfo = (type: "EXPENSE" | "REVENUE", categoryId: string) => {
    const categories = type === "EXPENSE" ? EXPENSE_CATEGORIES : REVENUE_CATEGORIES;
    return categories.find(cat => cat.id === categoryId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              월별 수입/지출 입력
            </h1>
            <p className="text-muted-foreground mt-1">
              카테고리별로 금액만 입력하세요
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleSaveAll}
            disabled={saving || (validExpenses.length === 0 && validRevenues.length === 0)}
            size="lg"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                전체 저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 지출</p>
                  <p className="text-sm text-muted-foreground">
                    {validExpenses.length}개 카테고리
                  </p>
                </div>
              </div>
              <span className="text-3xl font-bold text-red-600">
                {formatCurrency(totalExpense)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">총 수입</p>
                  <p className="text-sm text-muted-foreground">
                    {validRevenues.length}개 카테고리
                  </p>
                </div>
              </div>
              <span className="text-3xl font-bold text-emerald-600">
                {formatCurrency(totalRevenue)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Input Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "EXPENSE" | "REVENUE")}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="EXPENSE" className="gap-2">
            <TrendingDown className="h-4 w-4" />
            지출
          </TabsTrigger>
          <TabsTrigger value="REVENUE" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            수입
          </TabsTrigger>
        </TabsList>

        <TabsContent value="EXPENSE" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {EXPENSE_CATEGORIES.map(category => {
              const amount = expenseAmounts.find(a => a.categoryId === category.id);
              const Icon = category.icon;
              const isSaved = savedCategories.includes(category.id);
              const hasValue = parseFloat(amount?.amount || "0") > 0;

              return (
                <Card 
                  key={category.id} 
                  className={`transition-all ${
                    isSaved 
                      ? "ring-2 ring-emerald-500 bg-emerald-50/30" 
                      : hasValue 
                        ? "ring-2 ring-red-200" 
                        : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${category.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{category.label}</CardTitle>
                      </div>
                      {isSaved && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          저장됨
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        금액
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={amount?.amount || ""}
                          onChange={(e) => updateAmount("EXPENSE", category.id, "amount", e.target.value)}
                          className="text-right text-lg font-semibold pr-8"
                          disabled={isSaved}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          원
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        메모 (선택)
                      </label>
                      <Input
                        type="text"
                        placeholder="메모 입력..."
                        value={amount?.memo || ""}
                        onChange={(e) => updateAmount("EXPENSE", category.id, "memo", e.target.value)}
                        className="text-sm"
                        disabled={isSaved}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="REVENUE" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {REVENUE_CATEGORIES.map(category => {
              const amount = revenueAmounts.find(a => a.categoryId === category.id);
              const Icon = category.icon;
              const isSaved = savedCategories.includes(category.id);
              const hasValue = parseFloat(amount?.amount || "0") > 0;

              return (
                <Card 
                  key={category.id} 
                  className={`transition-all ${
                    isSaved 
                      ? "ring-2 ring-emerald-500 bg-emerald-50/30" 
                      : hasValue 
                        ? "ring-2 ring-emerald-200" 
                        : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${category.color}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <CardTitle className="text-base">{category.label}</CardTitle>
                      </div>
                      {isSaved && (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          저장됨
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        금액
                      </label>
                      <div className="relative">
                        <Input
                          type="number"
                          placeholder="0"
                          value={amount?.amount || ""}
                          onChange={(e) => updateAmount("REVENUE", category.id, "amount", e.target.value)}
                          className="text-right text-lg font-semibold pr-8"
                          disabled={isSaved}
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                          원
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm text-muted-foreground mb-1 block">
                        메모 (선택)
                      </label>
                      <Input
                        type="text"
                        placeholder="메모 입력..."
                        value={amount?.memo || ""}
                        onChange={(e) => updateAmount("REVENUE", category.id, "memo", e.target.value)}
                        className="text-sm"
                        disabled={isSaved}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>

      {/* Quick Summary */}
      {(validExpenses.length > 0 || validRevenues.length > 0) && (
        <Card className="bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">입력 요약</CardTitle>
            <CardDescription>
              {monthOptions.find(m => m.value === selectedMonth)?.label}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {validExpenses.map(item => {
                const cat = getCategoryInfo("EXPENSE", item.categoryId);
                return (
                  <div key={item.categoryId} className="flex items-center justify-between py-1">
                    <span className="text-sm flex items-center gap-2">
                      <span className="text-red-500">−</span>
                      {cat?.label}
                    </span>
                    <span className="font-medium text-red-600">
                      {formatCurrency(parseFloat(item.amount))}
                    </span>
                  </div>
                );
              })}
              {validRevenues.map(item => {
                const cat = getCategoryInfo("REVENUE", item.categoryId);
                return (
                  <div key={item.categoryId} className="flex items-center justify-between py-1">
                    <span className="text-sm flex items-center gap-2">
                      <span className="text-emerald-500">+</span>
                      {cat?.label}
                    </span>
                    <span className="font-medium text-emerald-600">
                      {formatCurrency(parseFloat(item.amount))}
                    </span>
                  </div>
                );
              })}
              <div className="border-t pt-2 mt-2 flex items-center justify-between font-semibold">
                <span>순이익</span>
                <span className={totalRevenue - totalExpense >= 0 ? "text-emerald-600" : "text-red-600"}>
                  {formatCurrency(totalRevenue - totalExpense)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
