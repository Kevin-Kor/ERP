import fs from "fs";
import path from "path";
import React from "react";

function loadTemplate() {
  const templatePath = path.join(
    process.cwd(),
    "public",
    "quote-generator.html",
  );

  try {
    return fs.readFileSync(templatePath, "utf8");
  } catch (error) {
    console.error("Failed to read quote generator template:", error);
    return "<p style='padding:16px;font-family:sans-serif;color:#b91c1c;font-weight:700;'>템플릿을 불러올 수 없습니다.</p>";
  }
}

export default function QuoteGeneratorPage() {
  const template = loadTemplate();

  return (
    <div style={{ height: "calc(100vh - 40px)", width: "100%" }}>
      <iframe
        title="공식 견적서 생성기"
        style={{ border: "none", width: "100%", height: "100%" }}
        allow="clipboard-read; clipboard-write"
        srcDoc={template}
      />
    </div>
  );
}
