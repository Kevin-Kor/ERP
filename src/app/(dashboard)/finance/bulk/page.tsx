"use client";

import { useState, useRef, useEffect, KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Plus,
  Trash2,
  FileSpreadsheet,
  Save,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import {
  REVENUE_CATEGORIES,
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_GROUPS,
  formatCurrency,
} from "@/lib/utils";

interface TransactionRow {
  id: string;
  date: string;
  type: "REVENUE" | "EXPENSE";
  category: string;
  amount: string;
  memo: string;
  saved: boolean;
}

const createEmptyRow = (): TransactionRow => ({
  id: crypto.randomUUID(),
  date: new Date().toISOString().split("T")[0],
  type: "EXPENSE",
  category: "",
  amount: "",
  memo: "",
  saved: false,
});

export default function BulkEntryPage() {
  const router = useRouter();
  const [rows, setRows] = useState<TransactionRow[]>([
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
    createEmptyRow(),
  ]);
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const inputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  // 유효한 행 (카테고리와 금액이 있는 행)
  const validRows = rows.filter((r) => r.category && r.amount && !r.saved);
  const totalExpense = rows
    .filter((r) => r.type === "EXPENSE" && r.amount)
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);
  const totalRevenue = rows
    .filter((r) => r.type === "REVENUE" && r.amount)
    .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0);

  const updateRow = (id: string, field: keyof TransactionRow, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id ? { ...row, [field]: value, saved: false } : row
      )
    );
  };

  const addRow = () => {
    setRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  // 키보드 네비게이션 (Tab, Enter로 다음 셀로 이동)
  const handleKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    field: string
  ) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault();
      const fields = ["date", "category", "amount", "memo"];
      const currentFieldIndex = fields.indexOf(field);
      
      // 다음 필드로 이동
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextRef = inputRefs.current[`${rowIndex}-${nextField}`];
        if (nextRef) nextRef.focus();
      } else {
        // 다음 행의 첫 번째 필드로 이동
        if (rowIndex === rows.length - 1) {
          addRow();
        }
        setTimeout(() => {
          const nextRef = inputRefs.current[`${rowIndex + 1}-date`];
          if (nextRef) nextRef.focus();
        }, 50);
      }
    }
  };

  const handleSaveAll = async () => {
    if (validRows.length === 0) {
      alert("저장할 거래가 없습니다.");
      return;
    }

    setSaving(true);
    setSavedCount(0);

    try {
      for (const row of validRows) {
        const res = await fetch("/api/transactions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: row.date,
            type: row.type,
            category: row.category,
            amount: parseFloat(row.amount),
            paymentStatus: "COMPLETED",
            memo: row.memo || null,
          }),
        });

        if (res.ok) {
          setRows((prev) =>
            prev.map((r) => (r.id === row.id ? { ...r, saved: true } : r))
          );
          setSavedCount((prev) => prev + 1);
        }
      }

      // 성공 후 새 행 추가
      setRows((prev) => [
        ...prev.filter((r) => !r.saved),
        createEmptyRow(),
        createEmptyRow(),
        createEmptyRow(),
      ]);
    } catch (error) {
      console.error("Save error:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const getCategoryLabel = (type: string, category: string) => {
    const categories =
      type === "REVENUE" ? REVENUE_CATEGORIES : EXPENSE_CATEGORIES;
    const found = categories.find((c) => c.value === category);
    return found?.label || category;
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
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-emerald-500" />
              여러 건 한번에 입력
            </h1>
            <p className="text-muted-foreground mt-1">
              스프레드시트처럼 여러 거래를 한번에 입력하세요. Tab이나 Enter로 다음 칸으로 이동합니다.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={addRow}>
            <Plus className="h-4 w-4 mr-2" />행 추가
          </Button>
          <Button
            onClick={handleSaveAll}
            disabled={saving || validRows.length === 0}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                저장 중... ({savedCount}/{validRows.length})
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {validRows.length}건 저장
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-muted/30">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              </div>
              <span className="text-sm text-muted-foreground">입력된 항목</span>
            </div>
            <span className="text-2xl font-bold">{validRows.length}건</span>
          </CardContent>
        </Card>
        <Card className="bg-red-50/50 border-red-100">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
              <span className="text-sm text-muted-foreground">총 지출</span>
            </div>
            <span className="text-2xl font-bold text-red-600">
              {formatCurrency(totalExpense)}
            </span>
          </CardContent>
        </Card>
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="pt-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
              <span className="text-sm text-muted-foreground">총 수익</span>
            </div>
            <span className="text-2xl font-bold text-emerald-600">
              {formatCurrency(totalRevenue)}
            </span>
          </CardContent>
        </Card>
      </div>

      {/* Spreadsheet-style Entry */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>거래 입력</CardTitle>
          <CardDescription>
            각 행에 날짜, 유형, 카테고리, 금액, 메모를 입력하세요
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="p-2 text-left text-sm font-medium w-[120px]">날짜</th>
                  <th className="p-2 text-left text-sm font-medium w-[100px]">유형</th>
                  <th className="p-2 text-left text-sm font-medium w-[180px]">카테고리</th>
                  <th className="p-2 text-left text-sm font-medium w-[140px]">금액</th>
                  <th className="p-2 text-left text-sm font-medium">메모</th>
                  <th className="p-2 text-left text-sm font-medium w-[60px]">상태</th>
                  <th className="p-2 w-[50px]"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr
                    key={row.id}
                    className={`border-b hover:bg-muted/30 transition-colors ${
                      row.saved ? "bg-emerald-50/50" : ""
                    }`}
                  >
                    <td className="p-1">
                      <Input
                        ref={(el) => {
                          inputRefs.current[`${index}-date`] = el;
                        }}
                        type="date"
                        value={row.date}
                        onChange={(e) => updateRow(row.id, "date", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, "date")}
                        className="h-9 text-sm"
                        disabled={row.saved}
                      />
                    </td>
                    <td className="p-1">
                      <Select
                        value={row.type}
                        onValueChange={(v) => {
                          updateRow(row.id, "type", v);
                          updateRow(row.id, "category", "");
                        }}
                        disabled={row.saved}
                      >
                        <SelectTrigger className="h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="EXPENSE">
                            <span className="flex items-center gap-1">
                              <TrendingDown className="h-3 w-3 text-red-500" />
                              지출
                            </span>
                          </SelectItem>
                          <SelectItem value="REVENUE">
                            <span className="flex items-center gap-1">
                              <TrendingUp className="h-3 w-3 text-emerald-500" />
                              수익
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Select
                        value={row.category}
                        onValueChange={(v) => updateRow(row.id, "category", v)}
                        disabled={row.saved}
                      >
                        <SelectTrigger 
                          ref={(el) => {
                            // SelectTrigger doesn't support ref directly
                          }}
                          className="h-9 text-sm"
                        >
                          <SelectValue placeholder="선택" />
                        </SelectTrigger>
                        <SelectContent>
                          {row.type === "EXPENSE" ? (
                            Object.entries(EXPENSE_CATEGORY_GROUPS).map(
                              ([groupName, categories]) => (
                                <SelectGroup key={groupName}>
                                  <SelectLabel className="text-xs">
                                    {groupName}
                                  </SelectLabel>
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectGroup>
                              )
                            )
                          ) : (
                            REVENUE_CATEGORIES.map((cat) => (
                              <SelectItem key={cat.value} value={cat.value}>
                                {cat.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Input
                        ref={(el) => {
                          inputRefs.current[`${index}-amount`] = el;
                        }}
                        type="number"
                        placeholder="0"
                        value={row.amount}
                        onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, "amount")}
                        className="h-9 text-sm text-right font-medium"
                        disabled={row.saved}
                      />
                    </td>
                    <td className="p-1">
                      <Input
                        ref={(el) => {
                          inputRefs.current[`${index}-memo`] = el;
                        }}
                        type="text"
                        placeholder="메모 (선택)"
                        value={row.memo}
                        onChange={(e) => updateRow(row.id, "memo", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, index, "memo")}
                        className="h-9 text-sm"
                        disabled={row.saved}
                      />
                    </td>
                    <td className="p-1 text-center">
                      {row.saved ? (
                        <Badge variant="success" className="gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          저장됨
                        </Badge>
                      ) : row.category && row.amount ? (
                        <Badge variant="secondary">대기</Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="p-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRow(row.id)}
                        disabled={rows.length <= 1 || row.saved}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between items-center">
            <Button variant="outline" onClick={addRow} className="gap-2">
              <Plus className="h-4 w-4" />
              행 추가
            </Button>
            <p className="text-sm text-muted-foreground">
              💡 팁: Tab 또는 Enter 키로 다음 칸으로 빠르게 이동할 수 있습니다
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

