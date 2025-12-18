"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
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
  Building2,
  Megaphone,
  Clock,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";

interface FixedVendor {
  id: string;
  name: string;
  monthlyFee: number | null;
}

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
  advertiser?: string;
  isReceivable?: boolean;
  paymentType?: "NORMAL" | "DEPOSIT" | "BALANCE";
}

export default function BulkEntryPage() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });

  // 현재 입력 중인 금액들 (선택된 카테고리)
  const [currentAmounts, setCurrentAmounts] = useState<{
    id: string;
    amount: string;
    memo: string;
    vendorId?: string;
    advertiser?: string;
  }[]>([
    { id: crypto.randomUUID(), amount: "", memo: "" }
  ]);

  // 수입 옵션 상태 (미수, 결제 유형)
  const [revenueOptions, setRevenueOptions] = useState({
    isReceivable: false,
    paymentType: "NORMAL" as "NORMAL" | "DEPOSIT" | "BALANCE",
  });

  // 모든 저장된 항목들
  const [allEntries, setAllEntries] = useState<EntryItem[]>([]);

  const [saving, setSaving] = useState(false);

  // 고정업체 목록
  const [fixedVendors, setFixedVendors] = useState<FixedVendor[]>([]);

  // Refs for input navigation
  const amountInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 고정업체 목록 불러오기
  useEffect(() => {
    async function fetchFixedVendors() {
      try {
        const res = await fetch("/api/clients?isFixedVendor=true&status=ACTIVE");
        const data = await res.json();
        setFixedVendors(data.clients || []);
      } catch (error) {
        console.error("Failed to fetch fixed vendors:", error);
      }
    }
    fetchFixedVendors();
  }, []);

  // 고정 관리업체 카테고리인지 확인
  const isFixedManagementCategory = selectedCategory === "FIXED_MANAGEMENT";

  // 광고수입 카테고리인지 확인
  const isAdRevenueCategory = selectedCategory === "AD_REVENUE";

  // 수입 카테고리인지 확인
  const isRevenueCategory = REVENUE_CATEGORIES.some(cat => cat.id === selectedCategory);

  // 카테고리 변경 시 옵션 리셋
  useEffect(() => {
    setRevenueOptions({
      isReceivable: false,
      paymentType: "NORMAL",
    });
    setCurrentAmounts([{ id: crypto.randomUUID(), amount: "", memo: "" }]);
  }, [selectedCategory]);

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

  // 현재 카테고리 소계 (만원 단위를 원 단위로 변환)
  const currentSubtotal = currentAmounts.reduce(
    (sum, item) => sum + ((parseFloat(item.amount) || 0) * 10000),
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
  const addAmountField = useCallback(() => {
    const newId = crypto.randomUUID();
    setCurrentAmounts(prev => [
      ...prev,
      { id: newId, amount: "", memo: "", advertiser: "" }
    ]);
    // 새 필드에 포커스
    setTimeout(() => {
      amountInputRefs.current[newId]?.focus();
    }, 10);
    return newId;
  }, []);

  // Enter 키로 다음 필드 추가 및 이동
  const handleAmountKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>, currentId: string, currentIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();

      // 마지막 필드인 경우 새 필드 추가
      if (currentIndex === currentAmounts.length - 1) {
        addAmountField();
      } else {
        // 다음 필드로 포커스 이동
        const nextItem = currentAmounts[currentIndex + 1];
        if (nextItem) {
          amountInputRefs.current[nextItem.id]?.focus();
        }
      }
    }
  }, [currentAmounts, addAmountField]);

  // 금액 입력 제거
  const removeAmountField = (id: string) => {
    if (currentAmounts.length <= 1) return;
    setCurrentAmounts(prev => prev.filter(item => item.id !== id));
  };

  // 금액 업데이트
  const updateAmount = (id: string, field: "amount" | "memo" | "vendorId", value: string) => {
    setCurrentAmounts(prev =>
      prev.map(item => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // 고정업체 선택 시 금액 자동 입력
  const handleVendorSelect = (itemId: string, vendorId: string) => {
    const vendor = fixedVendors.find(v => v.id === vendorId);
    if (vendor) {
      const amountInMan = vendor.monthlyFee ? (vendor.monthlyFee / 10000).toString() : "";
      setCurrentAmounts(prev =>
        prev.map(item =>
          item.id === itemId
            ? { ...item, vendorId, amount: amountInMan, memo: vendor.name }
            : item
        )
      );
    }
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
      amount: parseFloat(item.amount) * 10000, // 만원 -> 원 변환
      memo: item.memo,
      advertiser: isAdRevenueCategory ? item.advertiser : undefined,
      isReceivable: isRevenueCategory ? revenueOptions.isReceivable : undefined,
      paymentType: isRevenueCategory ? revenueOptions.paymentType : undefined,
    }));

    setAllEntries(prev => [...prev, ...newEntries]);
    setCurrentAmounts([{ id: crypto.randomUUID(), amount: "", memo: "" }]);
    // 수입 옵션 리셋
    setRevenueOptions({
      isReceivable: false,
      paymentType: "NORMAL",
    });
  };

  // 항목 삭제
  const removeEntry = (id: string) => {
    setAllEntries(prev => prev.filter(entry => entry.id !== id));
  };

  // 메모 생성 헬퍼 함수
  const buildMemo = (entry: EntryItem): string | null => {
    let memo = entry.memo || "";

    // 결제 유형 prefix 추가
    if (entry.paymentType === "DEPOSIT") {
      memo = `[선금]${memo ? " " + memo : ""}`;
    } else if (entry.paymentType === "BALANCE") {
      memo = `[착수금]${memo ? " " + memo : ""}`;
    }

    // 광고업체 정보 추가
    if (entry.categoryId === "AD_REVENUE" && entry.advertiser) {
      memo = `[광고업체: ${entry.advertiser}]${memo ? " " + memo : ""}`;
    }

    return memo || null;
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
            paymentStatus: entry.isReceivable ? "PENDING" : "COMPLETED",
            memo: buildMemo(entry),
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
              카테고리별로 금액을 입력하세요 (Enter로 다음 칸 추가)
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
              <label className="text-sm font-medium">
                {isFixedManagementCategory ? "고정업체 선택" : "금액"}
              </label>
              {currentAmounts.map((item, index) => (
                <div key={item.id} className="space-y-2">
                  <div className="flex gap-2">
                    {/* 고정 관리업체일 때 업체 선택 드롭다운 */}
                    {isFixedManagementCategory && (
                      <Select
                        value={item.vendorId || ""}
                        onValueChange={(value) => handleVendorSelect(item.id, value)}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="업체 선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {fixedVendors.length === 0 ? (
                            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                              등록된 고정업체가 없습니다
                            </div>
                          ) : (
                            fixedVendors.map((vendor) => (
                              <SelectItem key={vendor.id} value={vendor.id}>
                                <div className="flex items-center gap-2">
                                  <Building2 className="h-3 w-3" />
                                  {vendor.name}
                                  {vendor.monthlyFee && (
                                    <span className="text-muted-foreground text-xs">
                                      ({(vendor.monthlyFee / 10000).toFixed(0)}만원)
                                    </span>
                                  )}
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                    {/* 광고수입일 때 광고업체 입력 */}
                    {isAdRevenueCategory && (
                      <Input
                        type="text"
                        placeholder="광고업체명"
                        value={item.advertiser || ""}
                        onChange={(e) => updateAmount(item.id, "advertiser", e.target.value)}
                        className="w-[140px]"
                      />
                    )}
                    <div className="flex-1 relative">
                      <Input
                        ref={(el) => { amountInputRefs.current[item.id] = el; }}
                        type="number"
                        placeholder="금액"
                        value={item.amount}
                        onChange={(e) => updateAmount(item.id, "amount", e.target.value)}
                        onKeyDown={(e) => handleAmountKeyDown(e, item.id, index)}
                        className="pr-12 text-right font-medium"
                        autoFocus={index === 0 && !isFixedManagementCategory && !isAdRevenueCategory}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                        만원
                      </span>
                    </div>
                    <Input
                      type="text"
                      placeholder="메모 (선택)"
                      value={item.memo}
                      onChange={(e) => updateAmount(item.id, "memo", e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          if (index === currentAmounts.length - 1) {
                            addAmountField();
                          } else {
                            const nextItem = currentAmounts[index + 1];
                            if (nextItem) {
                              amountInputRefs.current[nextItem.id]?.focus();
                            }
                          }
                        }
                      }}
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

              {/* 수입 카테고리일 때 미수/결제유형 옵션 */}
              {isRevenueCategory && (
                <div className="space-y-3 pt-3 border-t">
                  {/* 미수 체크박스 */}
                  <div className="flex items-center space-x-2 p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <Checkbox
                      id="isReceivable"
                      checked={revenueOptions.isReceivable}
                      onCheckedChange={(checked) =>
                        setRevenueOptions((prev) => ({ ...prev, isReceivable: checked as boolean }))
                      }
                    />
                    <Label htmlFor="isReceivable" className="cursor-pointer text-amber-800 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      미수 (아직 입금되지 않음)
                    </Label>
                  </div>

                  {/* 결제 유형 선택 */}
                  <div className="space-y-2">
                    <Label className="text-sm flex items-center gap-2">
                      <Wallet className="h-4 w-4" />
                      결제 유형
                    </Label>
                    <Select
                      value={revenueOptions.paymentType}
                      onValueChange={(value: "NORMAL" | "DEPOSIT" | "BALANCE") =>
                        setRevenueOptions((prev) => ({ ...prev, paymentType: value }))
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
                </div>
              )}

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
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-muted-foreground">{entry.categoryLabel}</span>
                      {/* 광고업체 표시 */}
                      {entry.advertiser && (
                        <Badge variant="outline" className="text-xs bg-pink-50 text-pink-700 border-pink-200">
                          <Megaphone className="h-3 w-3 mr-1" />
                          {entry.advertiser}
                        </Badge>
                      )}
                      {/* 선금/착수금 표시 */}
                      {entry.paymentType === "DEPOSIT" && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                          선금
                        </Badge>
                      )}
                      {entry.paymentType === "BALANCE" && (
                        <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700 border-purple-200">
                          착수금
                        </Badge>
                      )}
                      {/* 미수 표시 */}
                      {entry.isReceivable && (
                        <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">
                          <Clock className="h-3 w-3 mr-1" />
                          미수
                        </Badge>
                      )}
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
