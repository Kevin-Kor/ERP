"use client";

import React, { useCallback, useEffect, useState } from "react";

export default function QuoteGeneratorPage() {
  const [template, setTemplate] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadTemplate = useCallback(async (signal?: AbortSignal) => {
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/quote-generator.html", { signal });
      if (!res.ok) {
        throw new Error(`Failed to fetch template: ${res.status} ${res.statusText}`);
      }
      const text = await res.text();
      setTemplate(text);
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      console.error("Failed to fetch quote generator template", err);
      setTemplate(null);
      setError("템플릿을 불러올 수 없습니다. 새로고침하거나 아래 버튼을 눌러 새 창에서 열어보세요.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    loadTemplate(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadTemplate]);

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
      ) : isLoading ? (
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
      ) : (
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
          <div style={{ marginBottom: "8px" }}>{error ?? "템플릿을 불러올 수 없습니다. 다시 시도하거나 새 창에서 열어보세요."}</div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => loadTemplate()}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "10px",
                background: "#111827",
                color: "#fff",
                textDecoration: "none",
                fontWeight: 800,
                fontSize: "13px",
                border: "none",
                cursor: "pointer",
              }}
            >
              다시 시도
            </button>
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
        </div>
      )}
    </div>
  );
}
