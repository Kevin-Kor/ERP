"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Printer,
  Save,
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

  // 회사 정보 편집 모드
  const [editCompanyInfo, setEditCompanyInfo] = useState(false);

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

  // 인쇄 (견적서만 출력)
  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      alert("팝업이 차단되었습니다. 팝업을 허용해주세요.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${docTitle}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
              font-size: 14px;
              line-height: 1.6;
              color: #333;
              background: white;
              padding: 40px;
            }
            .quote-container {
              max-width: 800px;
              margin: 0 auto;
            }
            header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              padding-bottom: 24px;
              margin-bottom: 32px;
              border-bottom: 2px solid #e5e7eb;
            }
            .company-name {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 8px;
            }
            .company-info {
              font-size: 12px;
              color: #666;
            }
            .doc-title {
              font-size: 28px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 16px;
              text-align: right;
            }
            .doc-info {
              font-size: 13px;
              color: #374151;
              text-align: right;
            }
            .doc-info strong {
              display: inline-block;
              width: 70px;
              text-align: right;
              margin-right: 8px;
            }
            .greeting {
              font-size: 13px;
              color: #666;
              margin-bottom: 32px;
            }
            .section-title {
              font-size: 18px;
              font-weight: 600;
              color: #1d4ed8;
              border-bottom: 2px solid #60a5fa;
              padding-bottom: 12px;
              margin-bottom: 24px;
            }
            .service-period {
              font-size: 13px;
              margin-bottom: 16px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 16px;
            }
            th {
              background: #f9fafb;
              padding: 12px;
              text-align: left;
              font-size: 13px;
              font-weight: 600;
              border-bottom: 1px solid #e5e7eb;
            }
            th:last-child {
              text-align: right;
            }
            td {
              padding: 12px;
              font-size: 13px;
              border-bottom: 1px solid #e5e7eb;
              vertical-align: top;
            }
            td:last-child {
              text-align: right;
              font-weight: 500;
            }
            .subtotal-row td {
              font-weight: 600;
            }
            .total-row {
              background: #f9fafb;
            }
            .total-row td {
              font-size: 15px;
              font-weight: bold;
              color: #1d4ed8;
            }
            .additional-note {
              background: #fef3c7;
              border: 1px solid #fcd34d;
              border-radius: 8px;
              padding: 16px;
              margin-bottom: 16px;
            }
            .additional-note-title {
              font-weight: 600;
              color: #92400e;
              font-size: 13px;
              margin-bottom: 8px;
            }
            .additional-note-content {
              font-size: 13px;
              color: #a16207;
              white-space: pre-line;
            }
            .note {
              font-size: 11px;
              color: #9ca3af;
              margin-bottom: 4px;
            }
            .terms-section {
              margin-top: 32px;
            }
            .terms-box {
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 24px;
            }
            .terms-title {
              font-weight: 600;
              color: #374151;
              margin-bottom: 8px;
              font-size: 14px;
            }
            .terms-list {
              list-style: disc;
              padding-left: 20px;
              color: #666;
              font-size: 12px;
              margin-bottom: 16px;
            }
            .terms-list li {
              margin-bottom: 4px;
            }
            .terms-list .sub-list {
              list-style: circle;
              padding-left: 16px;
              margin-top: 4px;
            }
            footer {
              margin-top: 48px;
              padding-top: 24px;
              border-top: 1px solid #e5e7eb;
              text-align: center;
            }
            footer p {
              font-size: 11px;
              color: #9ca3af;
            }
            @media print {
              body {
                padding: 20px;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <div className="space-y-6">
      {/* Header - 인쇄 시 숨김 */}
      <div className="flex items-center gap-4 no-print">
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
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          PDF 저장/인쇄
        </Button>
      </div>

      {/* 견적서 본문 - 바로 편집 가능 */}
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl mx-auto">
        {/* 헤더 - 회사 정보 + 문서 정보 */}
        <header className="pb-6 mb-8 border-b-2 border-gray-200 flex justify-between items-start flex-wrap gap-6">
          {/* 회사 정보 */}
          <div className="flex-1 min-w-[280px]">
            {editCompanyInfo ? (
              <div className="space-y-2">
                <Input
                  value={companyInfo.name}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, name: e.target.value })}
                  className="text-xl font-bold text-blue-600"
                  placeholder="회사명"
                />
                <Input
                  value={companyInfo.address}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, address: e.target.value })}
                  className="text-sm"
                  placeholder="주소"
                />
                <Input
                  value={companyInfo.phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, phone: e.target.value })}
                  className="text-sm"
                  placeholder="연락처"
                />
                <Input
                  value={companyInfo.email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, email: e.target.value })}
                  className="text-sm"
                  placeholder="이메일"
                />
                <Input
                  value={companyInfo.bankInfo}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, bankInfo: e.target.value })}
                  className="text-sm"
                  placeholder="입금계좌"
                />
                <Button size="sm" onClick={() => setEditCompanyInfo(false)}>
                  <Save className="h-3 w-3 mr-1" />
                  저장
                </Button>
              </div>
            ) : (
              <div
                className="cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded transition-colors"
                onClick={() => setEditCompanyInfo(true)}
                title="클릭하여 수정"
              >
                <h2 className="text-2xl font-bold text-blue-600 mb-2">
                  {companyInfo.name}
                </h2>
                <p className="text-sm text-gray-600">주소: {companyInfo.address}</p>
                <p className="text-sm text-gray-600">연락처: {companyInfo.phone}</p>
                <p className="text-sm text-gray-600">이메일: {companyInfo.email}</p>
              </div>
            )}
          </div>

          {/* 문서 정보 */}
          <div className="text-right flex-1 min-w-[280px]">
            <Input
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="text-2xl font-bold text-blue-600 text-right mb-4 border-dashed"
              placeholder="문서 제목"
            />
            <div className="space-y-2">
              <div className="flex items-center justify-end gap-2">
                <Label className="text-sm text-gray-700 w-16 text-right">견적일:</Label>
                <Input
                  type="date"
                  value={quoteDate}
                  onChange={(e) => setQuoteDate(e.target.value)}
                  className="w-40 text-sm"
                />
              </div>
              <p className="text-sm text-gray-700">
                <strong className="inline-block w-16 text-right pr-2">유효기간:</strong>
                견적일로부터 15일
              </p>
              <div className="flex items-center justify-end gap-2">
                <Label className="text-sm text-gray-700 w-16 text-right">수신:</Label>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-48 text-sm"
                  placeholder="업체명/담당자"
                />
                <span className="text-sm">귀하</span>
              </div>
            </div>
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

          {/* 서비스 기간 */}
          <div className="flex items-center gap-2 mb-4">
            <Label className="text-sm font-semibold">서비스 기간:</Label>
            <Input
              value={servicePeriod}
              onChange={(e) => setServicePeriod(e.target.value)}
              className="w-72 text-sm"
              placeholder="예: 2025년 05월 22일 ~ 06월 07일"
            />
          </div>

          {/* VAT 포함 여부 */}
          <div className="flex items-center space-x-2 mb-4">
            <Checkbox
              id="includeVat"
              checked={includeVat}
              onCheckedChange={(checked) => setIncludeVat(checked as boolean)}
            />
            <Label htmlFor="includeVat" className="cursor-pointer text-sm">
              부가세(VAT 10%) 포함
            </Label>
          </div>

          {/* 서비스 항목 테이블 */}
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-3 text-sm font-semibold border-b w-1/5">
                    서비스명
                  </th>
                  <th className="text-left p-3 text-sm font-semibold border-b w-2/5">
                    세부 내용
                  </th>
                  <th className="text-right p-3 text-sm font-semibold border-b w-1/5">
                    금액(VAT 별도)
                  </th>
                  <th className="text-center p-3 text-sm font-semibold border-b w-16 no-print">
                    삭제
                  </th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item) => (
                  <tr key={item.id} className="border-b last:border-b-0">
                    <td className="p-2">
                      <Input
                        value={item.name}
                        onChange={(e) => updateServiceItem(item.id, "name", e.target.value)}
                        className="text-sm"
                        placeholder="서비스명"
                      />
                    </td>
                    <td className="p-2">
                      <Textarea
                        value={item.details}
                        onChange={(e) => updateServiceItem(item.id, "details", e.target.value)}
                        className="text-sm min-h-[60px]"
                        placeholder="세부 내용"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        type="number"
                        value={item.price}
                        onChange={(e) => updateServiceItem(item.id, "price", Number(e.target.value))}
                        className="text-sm text-right"
                        placeholder="금액"
                        step={1000}
                      />
                    </td>
                    <td className="p-2 text-center no-print">
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
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {includeVat && (
                  <>
                    <tr className="border-t">
                      <td colSpan={2} className="p-3 text-sm font-semibold text-right">
                        소계 (VAT 별도)
                      </td>
                      <td className="p-3 text-sm font-semibold text-right">
                        {formatCurrency(subtotal)}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                    <tr>
                      <td colSpan={2} className="p-3 text-sm font-semibold text-right">
                        부가세 (VAT 10%)
                      </td>
                      <td className="p-3 text-sm font-semibold text-right">
                        {formatCurrency(vat)}
                      </td>
                      <td className="no-print"></td>
                    </tr>
                  </>
                )}
                <tr className="bg-gray-50">
                  <td colSpan={2} className="p-3 text-base font-bold text-right text-blue-700">
                    {includeVat ? "총 합계 금액 (VAT 포함)" : "총 합계 금액 (VAT 미포함)"}
                  </td>
                  <td className="p-3 text-base font-bold text-right text-blue-700">
                    {formatCurrency(total)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* 항목 추가 버튼 */}
          <Button
            type="button"
            variant="outline"
            onClick={addServiceItem}
            className="w-full mb-4 no-print"
          >
            <Plus className="h-4 w-4 mr-2" />
            서비스 항목 추가
          </Button>

          {/* 추가 비용 안내 */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
            <p className="font-semibold text-amber-800 text-sm mb-2">
              ※ 추가 비용 안내
            </p>
            <Textarea
              value={additionalFeeNote}
              onChange={(e) => setAdditionalFeeNote(e.target.value)}
              className="text-sm text-amber-700 bg-transparent border-dashed"
              rows={3}
            />
          </div>

          <p className="text-xs text-gray-500">
            * 견적 항목의 단가는 VAT 별도이며, 최종 합계 금액에 VAT가 포함되어 있습니다.
          </p>
          <p className="text-xs text-gray-500">
            * 본 견적서에 명시되지 않은 추가 작업 요청 시 별도 협의 후 추가 비용이 발생할 수 있습니다.
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
                <li>서비스 대금은 최종 결과물 전달 후 100% 완납되어야 합니다.</li>
                <li>모든 결과물의 저작권은 대금 완납 시 의뢰인에게 이전됩니다.</li>
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
                    <li>편집 초안 확인 후 수정사항을 취합하여 1회 무상 수정이 가능합니다.</li>
                    <li>초기 협의된 콘티와 크게 달라지는 수정 요청은 재진행으로 간주되어 추가 비용이 발생합니다.</li>
                    <li>최종 결과물 납품 후 발견된 제작자의 명백한 오류는 무상으로 수정해 드립니다.</li>
                  </ul>
                </li>
                <li>
                  기타 마케팅 서비스:
                  <ul className="list-circle pl-4 mt-1 space-y-0.5">
                    <li>서비스 제공 범위 내에서 협의된 수정 횟수(1~2회)를 제공합니다.</li>
                    <li>최초 협의 범위를 벗어나는 경우 추가 비용이 발생할 수 있습니다.</li>
                  </ul>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                콘텐츠 이용 및 포트폴리오 활용
              </h4>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>최종 결과물의 저작권은 잔금 완납 시 의뢰인에게 귀속됩니다.</li>
                <li>제작사({companyInfo.name})는 해당 결과물을 포트폴리오 용도로 사용할 수 있습니다.</li>
                <li>제3자의 초상권, 저작권이 포함된 경우, 해당 권리 사용에 대한 허가는 의뢰인이 직접 얻어야 합니다.</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-gray-800 mb-2">
                환불 규정 (Refund Policy)
              </h4>
              <ul className="list-disc pl-5 text-gray-600 space-y-1">
                <li>서비스 진행 전 계약 취소 시 위약금 없이 전액 환불 가능합니다.</li>
                <li>제작 진행 중 계약 해지 시, 진행 단계까지의 비용을 제외하고 환불 가능 여부를 협의합니다.</li>
                <li>제작사의 귀책 사유로 계약 이행이 불가능할 경우, 전액 환불해 드립니다.</li>
                <li>결과물 납품 후에는 원칙적으로 환불이 불가능합니다.</li>
              </ul>
            </div>
          </div>
        </section>

        {/* 푸터 */}
        <footer className="mt-12 pt-6 border-t text-center">
          <p className="text-xs text-gray-400">
            Copyright &copy; {new Date().getFullYear()} {companyInfo.name}. All rights reserved.
          </p>
        </footer>
      </div>

      {/* 인쇄용 숨겨진 컨텐츠 */}
      <div ref={printRef} className="hidden">
        <div className="quote-container">
          {/* 헤더 */}
          <header>
            <div>
              <div className="company-name">{companyInfo.name}</div>
              <div className="company-info">
                <p>주소: {companyInfo.address}</p>
                <p>연락처: {companyInfo.phone}</p>
                <p>이메일: {companyInfo.email}</p>
              </div>
            </div>
            <div>
              <div className="doc-title">{docTitle || "[문서 제목]"}</div>
              <div className="doc-info">
                <p><strong>견적일:</strong> {formatDate(quoteDate)}</p>
                <p><strong>유효기간:</strong> 견적일로부터 15일</p>
                <p><strong>수신:</strong> {clientName || "[클라이언트명]"} 귀하</p>
              </div>
            </div>
          </header>

          {/* 인사말 */}
          <p className="greeting">
            귀사의 일익 번창하심을 기원하며 아래와 같이 견적서를 제출합니다.
          </p>

          {/* 상세 견적 */}
          <section>
            <h3 className="section-title">상세 견적</h3>
            {servicePeriod && (
              <p className="service-period">
                <strong>서비스 기간:</strong> {servicePeriod}
              </p>
            )}

            <table>
              <thead>
                <tr>
                  <th style={{ width: "25%" }}>서비스명</th>
                  <th style={{ width: "50%" }}>세부 내용</th>
                  <th style={{ width: "25%", textAlign: "right" }}>금액(VAT 별도)</th>
                </tr>
              </thead>
              <tbody>
                {serviceItems.map((item) => (
                  <tr key={item.id}>
                    <td>{item.name || "[서비스명]"}</td>
                    <td style={{ whiteSpace: "pre-line" }}>{item.details || "[세부 내용]"}</td>
                    <td>{formatCurrency(item.price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {includeVat && (
                  <>
                    <tr className="subtotal-row">
                      <td colSpan={2} style={{ textAlign: "right" }}>소계 (VAT 별도)</td>
                      <td>{formatCurrency(subtotal)}</td>
                    </tr>
                    <tr className="subtotal-row">
                      <td colSpan={2} style={{ textAlign: "right" }}>부가세 (VAT 10%)</td>
                      <td>{formatCurrency(vat)}</td>
                    </tr>
                  </>
                )}
                <tr className="total-row">
                  <td colSpan={2} style={{ textAlign: "right" }}>
                    {includeVat ? "총 합계 금액 (VAT 포함)" : "총 합계 금액 (VAT 미포함)"}
                  </td>
                  <td>{formatCurrency(total)}</td>
                </tr>
              </tfoot>
            </table>

            {additionalFeeNote && (
              <div className="additional-note">
                <p className="additional-note-title">※ 추가 비용 안내</p>
                <p className="additional-note-content">{additionalFeeNote}</p>
              </div>
            )}

            <p className="note">* 견적 항목의 단가는 VAT 별도이며, 최종 합계 금액에 VAT가 포함되어 있습니다.</p>
            <p className="note">* 본 견적서에 명시되지 않은 추가 작업 요청 시 별도 협의 후 추가 비용이 발생할 수 있습니다.</p>
          </section>

          {/* 결제·권리·수정 및 환불 조건 */}
          <section className="terms-section">
            <h3 className="section-title">결제·권리·수정 및 환불 조건</h3>
            <div className="terms-box">
              <div>
                <h4 className="terms-title">결제 조건</h4>
                <ul className="terms-list">
                  <li>서비스 대금은 최종 결과물 전달 후 100% 완납되어야 합니다.</li>
                  <li>모든 결과물의 저작권은 대금 완납 시 의뢰인에게 이전됩니다.</li>
                  <li>입금 계좌: {companyInfo.bankInfo}</li>
                </ul>
              </div>

              <div>
                <h4 className="terms-title">수정 및 재진행 (Revision Policy)</h4>
                <ul className="terms-list">
                  <li>
                    사진/영상 콘텐츠:
                    <ul className="sub-list">
                      <li>편집 초안 확인 후 수정사항을 취합하여 1회 무상 수정이 가능합니다.</li>
                      <li>초기 협의된 콘티와 크게 달라지는 수정 요청은 재진행으로 간주되어 추가 비용이 발생합니다.</li>
                      <li>최종 결과물 납품 후 발견된 제작자의 명백한 오류는 무상으로 수정해 드립니다.</li>
                    </ul>
                  </li>
                  <li>
                    기타 마케팅 서비스:
                    <ul className="sub-list">
                      <li>서비스 제공 범위 내에서 협의된 수정 횟수(1~2회)를 제공합니다.</li>
                      <li>최초 협의 범위를 벗어나는 경우 추가 비용이 발생할 수 있습니다.</li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div>
                <h4 className="terms-title">콘텐츠 이용 및 포트폴리오 활용</h4>
                <ul className="terms-list">
                  <li>최종 결과물의 저작권은 잔금 완납 시 의뢰인에게 귀속됩니다.</li>
                  <li>제작사({companyInfo.name})는 해당 결과물을 포트폴리오 용도로 사용할 수 있습니다.</li>
                  <li>제3자의 초상권, 저작권이 포함된 경우, 해당 권리 사용에 대한 허가는 의뢰인이 직접 얻어야 합니다.</li>
                </ul>
              </div>

              <div>
                <h4 className="terms-title">환불 규정 (Refund Policy)</h4>
                <ul className="terms-list">
                  <li>서비스 진행 전 계약 취소 시 위약금 없이 전액 환불 가능합니다.</li>
                  <li>제작 진행 중 계약 해지 시, 진행 단계까지의 비용을 제외하고 환불 가능 여부를 협의합니다.</li>
                  <li>제작사의 귀책 사유로 계약 이행이 불가능할 경우, 전액 환불해 드립니다.</li>
                  <li>결과물 납품 후에는 원칙적으로 환불이 불가능합니다.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* 푸터 */}
          <footer>
            <p>Copyright © {new Date().getFullYear()} {companyInfo.name}. All rights reserved.</p>
          </footer>
        </div>
      </div>

      {/* 인쇄 시 숨김 처리용 글로벌 스타일 */}
      <style jsx global>{`
        .no-print {
          /* 화면에서는 보임 */
        }
        @media print {
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
