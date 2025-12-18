"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, TrendingUp, TrendingDown, Sparkles } from "lucide-react";
import { REVENUE_CATEGORIES, EXPENSE_CATEGORIES, EXPENSE_CATEGORY_GROUPS } from "@/lib/utils";

interface QuickTransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuickTransactionModal({ open, onOpenChange }: QuickTransactionModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [type, setType] = useState<"REVENUE" | "EXPENSE">("EXPENSE");
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [memo, setMemo] = useState("");
  const [advertiser, setAdvertiser] = useState(""); // 광고업체명 (AD_REVENUE용)
  const [isReceivable, setIsReceivable] = useState(false); // 미수 여부 (REVENUE용)

  const resetForm = () => {
    setCategory("");
    setAmount("");
    setDate(new Date().toISOString().split("T")[0]);
    setMemo("");
    setAdvertiser("");
    setIsReceivable(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!category || !amount) {
      return;
    }

    // AD_REVENUE 카테고리의 경우 광고업체명 포함하여 메모 생성
    let finalMemo = memo;
    if (type === "REVENUE" && category === "AD_REVENUE" && advertiser) {
      finalMemo = `[광고업체: ${advertiser}]${memo ? " " + memo : ""}`;
    }

    // 수입의 경우 미수 여부에 따라 paymentStatus 결정
    const paymentStatus = type === "REVENUE" && isReceivable ? "PENDING" : "COMPLETED";

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          type,
          category,
          amount: parseFloat(amount),
          paymentStatus,
          memo: finalMemo || null,
        }),
      });

      if (res.ok) {
        resetForm();
        onOpenChange(false);
        router.refresh();
      } else {
        const error = await res.json();
        alert(error.error || "저장에 실패했습니다.");
      }
    } catch (error) {
      console.error("Submit error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // 빠른 금액 버튼들
  const quickAmounts = [5000, 10000, 15000, 20000, 30000, 50000, 100000];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-amber-500" />
            빠른 거래 추가
          </DialogTitle>
          <DialogDescription>
            간단하게 수익이나 지출을 기록하세요
          </DialogDescription>
        </DialogHeader>

        <Tabs value={type} onValueChange={(v) => { setType(v as "REVENUE" | "EXPENSE"); setCategory(""); }}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="EXPENSE" className="gap-2">
              <TrendingDown className="h-4 w-4" />
              지출
            </TabsTrigger>
            <TabsTrigger value="REVENUE" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              수익
            </TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <TabsContent value="EXPENSE" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EXPENSE_CATEGORY_GROUPS).map(([groupName, categories]) => (
                      <SelectGroup key={groupName}>
                        <SelectLabel className="text-xs text-muted-foreground">{groupName}</SelectLabel>
                        {categories.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="REVENUE" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label>카테고리 *</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="카테고리 선택" />
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

              {/* 광고수입 선택 시 광고업체 입력 필드 표시 */}
              {category === "AD_REVENUE" && (
                <div className="space-y-2">
                  <Label>광고항목(업체) *</Label>
                  <Input
                    type="text"
                    placeholder="광고업체명을 입력하세요"
                    value={advertiser}
                    onChange={(e) => setAdvertiser(e.target.value)}
                  />
                </div>
              )}
            </TabsContent>

            <div className="space-y-2">
              <Label>금액 *</Label>
              <Input
                type="number"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-lg font-semibold"
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {quickAmounts.map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setAmount(amt.toString())}
                  >
                    {amt >= 10000 ? `${amt / 10000}만` : `${amt / 1000}천`}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>날짜</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>메모 (선택)</Label>
              <Textarea
                placeholder="예: 팀 점심식사, 택시비 등"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                rows={2}
              />
            </div>

            {/* 수익 입력 시 미수 체크박스 표시 */}
            {type === "REVENUE" && (
              <div className="flex items-center space-x-2 p-3 border rounded-lg bg-amber-50 border-amber-200">
                <Checkbox
                  id="isReceivable"
                  checked={isReceivable}
                  onCheckedChange={(checked) => setIsReceivable(checked as boolean)}
                />
                <Label htmlFor="isReceivable" className="cursor-pointer text-amber-800">
                  미수 (아직 입금되지 않음)
                </Label>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                취소
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isSubmitting || !category || !amount}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                저장
              </Button>
            </div>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

