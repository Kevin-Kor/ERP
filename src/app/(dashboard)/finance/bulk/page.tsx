"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  X,
  Receipt,
  Calculator,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

// 지출 카테고리
const EXPENSE_CATEGORIES = [
  { id: "FOOD", label: "식비" },
  { id: "INFLUENCER_COST", label: "인플루언서 비용" },
  { id: "TRANSPORT", label: "교통비" },
  { id: "AD_EXPENSE", label: "광고비" },
  { id: "CONTENT_PRODUCTION", label: "컨텐츠 제작비" },
  { id: "OTHER_EXPENSE", label: "기타 지출" },
];

// 수입 카테고리
const REVENUE_CATEGORIES = [
  { id: "AD_REVENUE", label: "광고비 수입" },
  { id: "FIXED_MANAGEMENT", label: "고정 관리업체" },
  { id: "PROJECT_MANAGEMENT", label: "건별 관리업체" },
  { id: "PLATFORM_REVENUE", label: "플랫폼 수입" },
  { id: "OTHER_REVENUE", label: "기타 수입" },
];

const ALL_CATEGORIES = [
  { group: "지출", items: EXPENSE_CATEGORIES, type: "EXPENSE" as const },
  { group: "수입", items: REVENUE_CATEGORIES, type: "REVENUE" as const },
];

interface EntryItem {
  id: string;
  categoryId: string;
  categoryLabel: string;
  type: "EXPENSE" | "REVENUE";
  amount: number;
  memo: string;
}

export default function BulkEntryPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  
  // 현재 입력 중인 금액들 (선택된 카테고리)
  const [currentAmounts, setCurrentAmounts] = useState<{ id: string; amount: string; memo: string }[]>([
    { id: crypto.randomUUID(), amount: "", memo: "" }
  ]);
  
  // 모든 저장된 항목들
  const [allEntries, setAllEntries] = useState<EntryItem[]>([]);
  
  const [saving, setSaving] = useState(false);

  // 월 옵션 생성 (최근 12개월)
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    const label = `${date.getFullYear()}년 ${date.getMonth() + 1}월`;
    return { value, label };
  });

  // 선택된 카테고리 정보
  const getCategoryInfo = (categoryId: string) => {
    for (const group of ALL_CATEGORIES) {
      const found = group.items.find(item => item.id === categoryId);
      if (found) return { ...found, type: group.type };
    }
    return null;
  };

  const selectedCategoryInfo = getCategoryInfo(selectedCategory);

  // 현재 카테고리 소계
  const currentSubtotal = currentAmounts.reduce(
    (sum, item) => sum + (parseFloat(item.amount) || 0),
    0
  );

  // 카테고리별 합계
  const entriesByCategory = allEntries.reduce((acc, entry) => {
    if (!acc[entry.categoryId]) {
      acc[entry.categoryId] = {
        label: entry.categoryLabel,
        type: entry.type,
        total: 0,
        count: 0,
      };
    }
    acc[entry.categoryId].total += entry.amount;
    acc[entry.categoryId].count += 1;
    return acc;
  }, {} as Record<string, { label: string; type: "EXPENSE" | "REVENUE"; total: number; count: number }>);

  // 총 지출/수입
  const totalExpense = allEntries
    .filter(e => e.type === "EXPENSE")
    .reduce((sum, e) => sum + e.amount, 0);
  const totalRevenue = allEntries
    .filter(e => e.type === "REVENUE")
    .reduce((sum, e) => sum + e.amount, 0);

  // 금액 입력 추가
  const addAmountField = () => {
    setCurrentAmounts(prev => [
      ...prev,
      { id: crypto.randomUUID(), amount: "", memo: "" }
    ]);
  };

  // 금액 입력 제거
  const removeAmountField = (id: string) => {
    if (currentAmounts.length <= 1) return;
    setCurrentAmounts(prev => prev.filter(item => item.id !== id));
  };

  // 금액 업데이트
  const updateAmount = (id: string, field: "amount" | "memo", value: string) => {
    setCurrentAmounts(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // 현재 카테고리 항목들을 전체 목록에 추가
  const addToEntries = () => {
    if (!selectedCategoryInfo) return;

    const validAmounts = currentAmounts.filter(item => parseFloat(item.amount) > 0);
    if (validAmounts.length === 0) return;

    const newEntries: EntryItem[] = validAmounts.map(item => ({
      id: crypto.randomUUID(),
      categoryId: selectedCategory,
      categoryLabel: selectedCategoryInfo.label,
      type: selectedCategoryInfo.type,
      amount: parseFloat(item.amount),
      memo: item.memo,
    }));

    setAllEntries(prev => [...prev, ...newEntries]);
    setCurrentAmounts([{ id: crypto.randomUUID(), amount: "", memo: "" }]);
  };

  // 항목 삭제
  const removeEntry = (id: string) => {
    setAllEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // 전체 저장
  const handleSaveAll = async () => {
    // 현재 입력 중인 것도 추가
    if (selectedCategoryInfo && currentSubtotal > 0) {
      addToEntries();
    }

    if (allEntries.length === 0) {
      alert("저장할 항목이 없습니다.");
      return;
    }

    setSaving(true);

    try {
      const date = `${selectedMonth}-01`;

      for (const entry of allEntries) {
        await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date,
            type: entry.type,
            category: entry.categoryId,
            amount: entry.amount,
            paymentStatus: "COMPLETED",
            memo: entry.memo || null,
          }),
        });
      }

      alert(`${allEntries.length}건이 저장되었습니다.`);
      setAllEntries([]);
      router.push("/finance");
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/finance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              수입/지출 입력
            </h1>
            <p className="text-muted-foreground text-sm">
              카테고리별로 금액을 입력하세요
            </p>
          </div>
        </div>
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-[140px]">
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
      </div>

      {/* 입력 카드 */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            금액 입력
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 카테고리 선택 */}
          <div>
            <label className="text-sm font-medium mb-2 block">카테고리</label>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="카테고리를 선택하세요" />
              </SelectTrigger>
              <SelectContent>
                {ALL_CATEGORIES.map(group => (
                  <div key={group.group}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground flex items-center gap-1">
                      {group.type === "EXPENSE" ? (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      ) : (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      )}
                      {group.group}
                    </div>
                    {group.items.map(item => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 금액 입력 필드들 */}
          {selectedCategory && (
            <div className="space-y-3">
              <label className="text-sm font-medium">금액</label>
              {currentAmounts.map((item, index) => (
                <div key={item.id} className="flex gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      placeholder="금액"
                      value={item.amount}
                      onChange={(e) => updateAmount(item.id, "amount", e.target.value)}
                      className="pr-8 text-right font-medium"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      원
                    </span>
                  </div>
                  <Input
                    type="text"
                    placeholder="메모"
                    value={item.memo}
                    onChange={(e) => updateAmount(item.id, "memo", e.target.value)}
                    className="w-32"
                  />
                  {currentAmounts.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => removeAmountField(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {/* 추가 버튼 */}
              <Button
                variant="outline"
                size="sm"
                onClick={addAmountField}
                className="w-full gap-2"
              >
                <Plus className="h-4 w-4" />
                금액 추가
              </Button>

              {/* 소계 */}
              {currentSubtotal > 0 && (
                <div className="flex items-center justify-between pt-3 border-t">
                  <span className="text-sm text-muted-foreground">
                    {selectedCategoryInfo?.label} 소계
                  </span>
                  <span className={`text-lg font-bold ${
                    selectedCategoryInfo?.type === "EXPENSE" ? "text-red-600" : "text-emerald-600"
                  }`}>
                    {selectedCategoryInfo?.type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(currentSubtotal)}
                  </span>
                </div>
              )}

              {/* 목록에 추가 버튼 */}
              <Button
                onClick={addToEntries}
                disabled={currentSubtotal === 0}
                className="w-full"
              >
                목록에 추가
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 입력 내역 */}
      {allEntries.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              입력 내역
              <Badge variant="secondary" className="ml-auto">
                {allEntries.length}건
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 카테고리별 요약 */}
            <div className="space-y-2">
              {Object.entries(entriesByCategory).map(([categoryId, data]) => (
                <div
                  key={categoryId}
                  className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-2">
                    {data.type === "EXPENSE" ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : (
                      <TrendingUp className="h-4 w-4 text-emerald-500" />
                    )}
                    <span className="font-medium">{data.label}</span>
                    <Badge variant="outline" className="text-xs">
                      {data.count}건
                    </Badge>
                  </div>
                  <span className={`font-bold ${
                    data.type === "EXPENSE" ? "text-red-600" : "text-emerald-600"
                  }`}>
                    {data.type === "EXPENSE" ? "-" : "+"}
                    {formatCurrency(data.total)}
                  </span>
                </div>
              ))}
            </div>

            {/* 상세 내역 (접기/펼치기 가능) */}
            <details className="group">
              <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                상세 내역 보기
              </summary>
              <div className="mt-2 space-y-1 pl-2 border-l-2">
                {allEntries.map(entry => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between py-1 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{entry.categoryLabel}</span>
                      {entry.memo && (
                        <span className="text-xs text-muted-foreground">
                          ({entry.memo})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={entry.type === "EXPENSE" ? "text-red-600" : "text-emerald-600"}>
                        {formatCurrency(entry.amount)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                        onClick={() => removeEntry(entry.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </details>

            {/* 총계 */}
            <div className="border-t pt-4 space-y-2">
              {totalExpense > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 지출</span>
                  <span className="font-bold text-red-600">
                    -{formatCurrency(totalExpense)}
                  </span>
                </div>
              )}
              {totalRevenue > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">총 수입</span>
                  <span className="font-bold text-emerald-600">
                    +{formatCurrency(totalRevenue)}
                  </span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">순이익</span>
                <span className={`text-xl font-bold ${
                  totalRevenue - totalExpense >= 0 ? "text-emerald-600" : "text-red-600"
                }`}>
                  {formatCurrency(totalRevenue - totalExpense)}
                </span>
              </div>
            </div>

            {/* 저장 버튼 */}
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              size="lg"
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {allEntries.length}건 저장하기
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 빈 상태 */}
      {allEntries.length === 0 && !selectedCategory && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <p className="text-muted-foreground">
              카테고리를 선택하고 금액을 입력하세요
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
