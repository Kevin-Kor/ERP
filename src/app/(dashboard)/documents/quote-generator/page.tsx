import React from "react";

export default function QuoteGeneratorPage() {
  return (
    <div style={{ height: "calc(100vh - 40px)", width: "100%" }}>
      <iframe
        src="/quote-generator.html"
        title="공식 견적서 생성기"
        style={{ border: "none", width: "100%", height: "100%" }}
        allow="clipboard-read; clipboard-write"
      />
    </div>
  );
}
