"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { INDUSTRY_OPTIONS } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { useState } from "react";

const clientSchema = z.object({
  name: z.string().min(1, "회사명은 필수입니다"),
  contactName: z.string().min(1, "담당자명은 필수입니다"),
  phone: z.string().min(1, "연락처는 필수입니다"),
  email: z.string().email("올바른 이메일 형식이 아닙니다").optional().or(z.literal("")),
  businessNo: z.string().optional(),
  address: z.string().optional(),
  industry: z.string().optional(),
  status: z.enum(["ACTIVE", "DORMANT", "TERMINATED"]),
  memo: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface ClientFormProps {
  initialData?: ClientFormData & { id: string };
  mode: "create" | "edit";
}

export function ClientForm({ initialData, mode }: ClientFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ClientFormData>({
    resolver: zodResolver(clientSchema),
    defaultValues: initialData || {
      name: "",
      contactName: "",
      phone: "",
      email: "",
      businessNo: "",
      address: "",
      industry: "",
      status: "ACTIVE",
      memo: "",
    },
  });

  const industry = watch("industry");
  const status = watch("status");

  async function onSubmit(data: ClientFormData) {
    setIsSubmitting(true);
    try {
      const url = mode === "create" ? "/api/clients" : `/api/clients/${initialData?.id}`;
      const method = mode === "create" ? "POST" : "PATCH";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        router.push("/clients");
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
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>기본 정보</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">회사명 *</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="회사명을 입력하세요"
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="contactName">담당자명 *</Label>
              <Input
                id="contactName"
                {...register("contactName")}
                placeholder="담당자명을 입력하세요"
              />
              {errors.contactName && (
                <p className="text-sm text-destructive">{errors.contactName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">연락처 *</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="02-1234-5678"
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="email@company.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessNo">사업자번호</Label>
              <Input
                id="businessNo"
                {...register("businessNo")}
                placeholder="123-45-67890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry">업종</Label>
              <Select
                value={industry}
                onValueChange={(value) => setValue("industry", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="업종 선택" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">주소</Label>
            <Input
              id="address"
              {...register("address")}
              placeholder="사업장 주소"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">계약 상태 *</Label>
            <Select
              value={status}
              onValueChange={(value: "ACTIVE" | "DORMANT" | "TERMINATED") =>
                setValue("status", value)
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">활성</SelectItem>
                <SelectItem value="DORMANT">휴면</SelectItem>
                <SelectItem value="TERMINATED">종료</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>메모</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            {...register("memo")}
            placeholder="클라이언트 관련 메모를 입력하세요"
            rows={4}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isSubmitting}
        >
          취소
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {mode === "create" ? "등록" : "저장"}
        </Button>
      </div>
    </form>
  );
}


