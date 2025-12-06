"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Eye,
  FileText,
} from "lucide-react";

interface ServiceItem {
  id: string;
  name: string;
  details: string;
  price: number;
}

interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
  email: string;
  bankInfo: string;
}

const defaultCompanyInfo: CompanyInfo = {
  name: "기여하다",
  address: "경기 용인시 기흥구 구성로279번길 4",
  phone: "010-5894-4800",
  email: "phb001030@naver.com",
  bankInfo: "기업은행 010-3388-4560 (예금주: 박기형)",
};

export default function QuoteGeneratorPage() {
  const [showPreview, setShowPreview] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // 기본 정보
  const [docTitle, setDocTitle] = useState("숏폼영상 제작 견적서");
  const [clientName, setClientName] = useState("");
  const [quoteDate, setQuoteDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [servicePeriod, setServicePeriod] = useState("");
  const [includeVat, setIncludeVat] = useState(true);

  // 회사 정보
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(defaultCompanyInfo);

  // 서비스 항목
  const [serviceItems, setServiceItems] = useState<ServiceItem[]>([
    { id: "1", name: "숏폼영상 제작", details: "1건 (기본형)", price: 150000 },
  ]);

  // 추가 비용 안내
  const [additionalFeeNote, setAdditionalFeeNote] = useState(
    "사진촬영의 경우:\n• 약정된 기본 제공 컷 수를 초과하여 촬영 시, 추가 컷당 20,000원의 비용이 발생할 수 있습니다 (사전 협의)."
  );

  // 금액 계산
  const subtotal = serviceItems.reduce((sum, item) => sum + item.price, 0);
  const vat = includeVat ? Math.round(subtotal * 0.1) : 0;
  const total = subtotal + vat;

  // 날짜 포맷팅
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "[견적일]";
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}년 ${month}월 ${day}일`;
  };

  // 금액 포맷팅
  const formatCurrency = (amount: number) => {
    return "₩" + amount.toLocaleString("ko-KR");
  };

  // 서비스 항목 추가
  const addServiceItem = () => {
    const newId = Date.now().toString();
    setServiceItems([
      ...serviceItems,
      { id: newId, name: "", details: "", price: 0 },
    ]);
  };

  // 서비스 항목 삭제
  const removeServiceItem = (id: string) => {
    setServiceItems(serviceItems.filter((item) => item.id !== id));
  };

  // 서비스 항목 업데이트
  const updateServiceItem = (
    id: string,
    field: keyof ServiceItem,
    value: string | number
  ) => {
    setServiceItems(
      serviceItems.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  // 인쇄
  const handlePrint = useCallback(() => {
    setShowPreview(true);
    setTimeout(() => {
      window.print();
    }, 100);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 print:hidden">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/documents">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">견적서 생성기</h1>
          <p className="text-muted-foreground mt-1">
            견적서를 작성하고 PDF로 저장하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
          >
            <Eye className="h-4 w-4 mr-2" />
            {showPreview ? "편집 모드" : "미리보기"}
          </Button>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            PDF 저장/인쇄
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 print:block">
        {/* 입력 섹션 */}
        <div className={`space-y-6 ${showPreview ? "hidden" : ""} print:hidden`}>
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>견적서의 기본 정보를 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docTitle">문서 제목</Label>
                <Input
                  id="docTitle"
                  value={docTitle}
                  onChange={(e) => setDocTitle(e.target.value)}
                  placeholder="예: 숏폼영상 제작 견적서"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="clientName">수신 (업체명 및 담당자)</Label>
                <Input
                  id="clientName"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="예: 해화개반 박민우 대표"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quoteDate">견적일</Label>
                  <Input
                    id="quoteDate"
                    type="date"
                    value={quoteDate}
                    onChange={(e) => setQuoteDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="servicePeriod">서비스 기간</Label>
                  <Input
                    id="servicePeriod"
                    value={servicePeriod}
                    onChange={(e) => setServicePeriod(e.target.value)}
                    placeholder="예: 2025년 05월 22일 ~ 06월 07일"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeVat"
                  checked={includeVat}
                  onCheckedChange={(checked) => setIncludeVat(checked as boolean)}
                />
                <Label htmlFor="includeVat" className="cursor-pointer">
                  부가세(VAT 10%) 포함
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* 회사 정보 */}
          <Card>
            <CardHeader>
              <CardTitle>발신 회사 정보</CardTitle>
              <CardDescription>견적서에 표시될 회사 정보입니다.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">회사명</Label>
                <Input
                  id="companyName"
                  value={companyInfo.name}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">주소</Label>
                <Input
                  id="companyAddress"
                  value={companyInfo.address}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, address: e.target.value })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="companyPhone">연락처</Label>
                  <Input
                    id="companyPhone"
                    value={companyInfo.phone}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, phone: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="companyEmail">이메일</Label>
                  <Input
                    id="companyEmail"
                    value={companyInfo.email}
                    onChange={(e) =>
                      setCompanyInfo({ ...companyInfo, email: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankInfo">입금 계좌</Label>
                <Input
                  id="bankInfo"
                  value={companyInfo.bankInfo}
                  onChange={(e) =>
                    setCompanyInfo({ ...companyInfo, bankInfo: e.target.value })
                  }
                  placeholder="예: 기업은행 010-3388-4560 (예금주: 홍길동)"
                />
              </div>
            </CardContent>
          </Card>

          {/* 서비스 항목 */}
          <Card>
            <CardHeader>
              <CardTitle>상세 견적 항목</CardTitle>
              <CardDescription>서비스 항목과 금액을 입력하세요.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {serviceItems.map((item, index) => (
                <div
                  key={item.id}
                  className="border rounded-lg p-4 space-y-3 relative"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">
                      항목 {index + 1}
                    </span>
                    {serviceItems.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeServiceItem(item.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <div className="grid gap-3">
                    <div className="space-y-2">
                      <Label>서비스명</Label>
                      <Input
                        value={item.name}
                        onChange={(e) =>
                          updateServiceItem(item.id, "name", e.target.value)
                        }
                        placeholder="예: 숏폼영상 제작"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>세부 내용</Label>
                      <Textarea
                        value={item.details}
                        onChange={(e) =>
                          updateServiceItem(item.id, "details", e.target.value)
                        }
                        placeholder="예: 1건 (기본형), 수량 등"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>금액 (VAT 별도)</Label>
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) =>
                          updateServiceItem(
                            item.id,
                            "price",
                            Number(e.target.value)
                          )
                        }
                        placeholder="숫자만 입력"
                        step={1000}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                onClick={addServiceItem}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                서비스 항목 추가
              </Button>
            </CardContent>
          </Card>

          {/* 추가 비용 안내 */}
          <Card>
            <CardHeader>
              <CardTitle>추가 비용 안내</CardTitle>
              <CardDescription>
                추가 비용에 대한 안내 사항을 입력하세요.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={additionalFeeNote}
                onChange={(e) => setAdditionalFeeNote(e.target.value)}
                rows={4}
                placeholder="추가 비용에 대한 안내 사항..."
              />
            </CardContent>
          </Card>
        </div>

        {/* 미리보기 섹션 */}
        <div
          ref={printRef}
          className={`${
            showPreview ? "block" : "hidden lg:block"
          } print:block`}
        >
          <div className="bg-white rounded-lg shadow-lg p-8 print:shadow-none print:p-0">
            {/* 헤더 */}
            <header className="pb-6 mb-8 border-b flex justify-between items-start flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-blue-600 mb-2">
                  {companyInfo.name}
                </h2>
                <p className="text-sm text-gray-600">주소: {companyInfo.address}</p>
                <p className="text-sm text-gray-600">연락처: {companyInfo.phone}</p>
                <p className="text-sm text-gray-600">이메일: {companyInfo.email}</p>
              </div>
              <div className="text-right">
                <h1 className="text-3xl font-bold text-blue-600 mb-4">
                  {docTitle || "[문서 제목]"}
                </h1>
                <p className="text-sm text-gray-700">
                  <strong className="inline-block w-20 text-right pr-2">견적일:</strong>
                  {formatDate(quoteDate)}
                </p>
                <p className="text-sm text-gray-700">
                  <strong className="inline-block w-20 text-right pr-2">유효기간:</strong>
                  견적일로부터 15일
                </p>
                <p className="text-sm text-gray-700">
                  <strong className="inline-block w-20 text-right pr-2">수신:</strong>
                  {clientName || "[클라이언트명]"} 귀하
                </p>
              </div>
            </header>

            {/* 인사말 */}
            <section className="mb-8">
              <p className="text-sm text-gray-600">
                귀사의 일익 번창하심을 기원하며 아래와 같이 견적서를 제출합니다.
              </p>
            </section>

            {/* 상세 견적 */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-blue-700 border-b-2 border-blue-400 pb-3 mb-6">
                상세 견적
              </h3>
              {servicePeriod && (
                <p className="text-sm mb-4">
                  <strong>서비스 기간:</strong> {servicePeriod}
                </p>
              )}

              <div className="border rounded-lg overflow-hidden mb-4">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="text-left p-3 text-sm font-semibold border-b w-1/4">
                        서비스명
                      </th>
                      <th className="text-left p-3 text-sm font-semibold border-b w-1/2">
                        세부 내용
                      </th>
                      <th className="text-right p-3 text-sm font-semibold border-b w-1/4">
                        금액(VAT 별도)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceItems.length === 0 ? (
                      <tr>
                        <td
                          colSpan={3}
                          className="p-3 text-center text-gray-500"
                        >
                          견적 항목을 추가해주세요.
                        </td>
                      </tr>
                    ) : (
                      serviceItems.map((item) => (
                        <tr key={item.id} className="border-b last:border-b-0">
                          <td className="p-3 text-sm align-top">
                            {item.name || "[서비스명]"}
                          </td>
                          <td className="p-3 text-sm align-top whitespace-pre-line">
                            {item.details || "[세부 내용]"}
                          </td>
                          <td className="p-3 text-sm text-right font-medium align-top">
                            {formatCurrency(item.price)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot>
                    {includeVat && (
                      <>
                        <tr className="border-t">
                          <td
                            colSpan={2}
                            className="p-3 text-sm font-semibold text-right"
                          >
                            소계 (VAT 별도)
                          </td>
                          <td className="p-3 text-sm font-semibold text-right">
                            {formatCurrency(subtotal)}
                          </td>
                        </tr>
                        <tr>
                          <td
                            colSpan={2}
                            className="p-3 text-sm font-semibold text-right"
                          >
                            부가세 (VAT 10%)
                          </td>
                          <td className="p-3 text-sm font-semibold text-right">
                            {formatCurrency(vat)}
                          </td>
                        </tr>
                      </>
                    )}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={2}
                        className="p-3 text-base font-bold text-right text-blue-700"
                      >
                        {includeVat
                          ? "총 합계 금액 (VAT 포함)"
                          : "총 합계 금액 (VAT 미포함)"}
                      </td>
                      <td className="p-3 text-base font-bold text-right text-blue-700">
                        {formatCurrency(total)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* 추가 비용 안내 */}
              {additionalFeeNote && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                  <p className="font-semibold text-amber-800 text-sm mb-2">
                    ※ 추가 비용 안내
                  </p>
                  <p className="text-sm text-amber-700 whitespace-pre-line">
                    {additionalFeeNote}
                  </p>
                </div>
              )}

              <p className="text-xs text-gray-500">
                * 견적 항목의 단가는 VAT 별도이며, 최종 합계 금액에 VAT가
                포함되어 있습니다.
              </p>
              <p className="text-xs text-gray-500">
                * 본 견적서에 명시되지 않은 추가 작업 요청 시 별도 협의 후 추가
                비용이 발생할 수 있습니다.
              </p>
            </section>

            {/* 결제·권리·수정 및 환불 조건 */}
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-blue-700 border-b-2 border-blue-400 pb-3 mb-6">
                결제·권리·수정 및 환불 조건
              </h3>
              <div className="border rounded-lg p-6 bg-gray-50 text-sm space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">결제 조건</h4>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    <li>
                      서비스 대금은 최종 결과물 전달 후 100% 완납되어야 합니다.
                    </li>
                    <li>
                      모든 결과물의 저작권은 대금 완납 시 의뢰인에게 이전됩니다.
                    </li>
                    <li>입금 계좌: {companyInfo.bankInfo}</li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    수정 및 재진행 (Revision Policy)
                  </h4>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    <li>
                      사진/영상 콘텐츠:
                      <ul className="list-circle pl-4 mt-1 space-y-0.5">
                        <li>
                          편집 초안 확인 후 수정사항을 취합하여 1회 무상 수정이
                          가능합니다.
                        </li>
                        <li>
                          초기 협의된 콘티와 크게 달라지는 수정 요청은 재진행으로
                          간주되어 추가 비용이 발생합니다.
                        </li>
                        <li>
                          최종 결과물 납품 후 발견된 제작자의 명백한 오류는
                          무상으로 수정해 드립니다.
                        </li>
                      </ul>
                    </li>
                    <li>
                      기타 마케팅 서비스:
                      <ul className="list-circle pl-4 mt-1 space-y-0.5">
                        <li>
                          서비스 제공 범위 내에서 협의된 수정 횟수(1~2회)를
                          제공합니다.
                        </li>
                        <li>
                          최초 협의 범위를 벗어나는 경우 추가 비용이 발생할 수
                          있습니다.
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    콘텐츠 이용 및 포트폴리오 활용
                  </h4>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    <li>
                      최종 결과물의 저작권은 잔금 완납 시 의뢰인에게 귀속됩니다.
                    </li>
                    <li>
                      제작사({companyInfo.name})는 해당 결과물을 포트폴리오
                      용도로 사용할 수 있습니다.
                    </li>
                    <li>
                      제3자의 초상권, 저작권이 포함된 경우, 해당 권리 사용에 대한
                      허가는 의뢰인이 직접 얻어야 합니다.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-800 mb-2">
                    환불 규정 (Refund Policy)
                  </h4>
                  <ul className="list-disc pl-5 text-gray-600 space-y-1">
                    <li>
                      서비스 진행 전 계약 취소 시 위약금 없이 전액 환불
                      가능합니다.
                    </li>
                    <li>
                      제작 진행 중 계약 해지 시, 진행 단계까지의 비용을 제외하고
                      환불 가능 여부를 협의합니다.
                    </li>
                    <li>
                      제작사의 귀책 사유로 계약 이행이 불가능할 경우, 전액 환불해
                      드립니다.
                    </li>
                    <li>
                      결과물 납품 후에는 원칙적으로 환불이 불가능합니다.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* 푸터 */}
            <footer className="mt-12 pt-6 border-t text-center">
              <p className="text-xs text-gray-400">
                Copyright &copy; {new Date().getFullYear()} {companyInfo.name}.
                All rights reserved.
              </p>
            </footer>
          </div>
        </div>
      </div>

      {/* 인쇄용 스타일 */}
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background-color: white;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:p-0 {
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}
