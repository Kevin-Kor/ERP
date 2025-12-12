"use client";

import React, { useEffect, useState } from "react";

export default function QuoteGeneratorPage() {
  const [template, setTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadTemplate() {
      try {
        const res = await fetch("/quote-generator.html");
        if (!res.ok) {
          throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`);
        }
        const text = await res.text();
        if (isMounted) setTemplate(text);
      } catch (err) {
        console.error("Failed to fetch quote generator template", err);
        if (isMounted) {
          setError("템플릿을 불러올 수 없습니다. 새로고침하거나 아래 버튼을 눌러 새 창에서 열어보세요.");
        }
      }
    }

    loadTemplate();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div style={{ height: "calc(100vh - 40px)", width: "100%" }}>
      {template ? (
        <iframe
          title="공식 견적서 생성기"
          style={{ border: "none", width: "100%", height: "100%" }}
          allow="clipboard-read; clipboard-write"
          srcDoc={template}
        />
      ) : error ? (
        <div
          style={{
            padding: "16px",
            border: "1px solid #fca5a5",
            borderRadius: "12px",
            background: "#fff1f2",
            color: "#991b1b",
            fontWeight: 700,
            lineHeight: 1.5,
          }}
        >
          <div style={{ marginBottom: "8px" }}>{error}</div>
          <a
            href="/quote-generator.html"
            target="_blank"
            rel="noreferrer"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 12px",
              borderRadius: "10px",
              background: "#1d4ed8",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 800,
              fontSize: "13px",
            }}
          >
            새 창에서 열기
          </a>
        </div>
      ) : (
        <div
          style={{
            padding: "16px",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            background: "#f8fafc",
            color: "#1f2937",
            fontWeight: 700,
          }}
        >
          템플릿을 불러오는 중입니다...
        </div>
      )}
    </div>
  );
}
