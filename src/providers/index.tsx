"use client";

import { ReactNode } from "react";
import { SessionProvider } from "./session-provider";
import { QueryProvider } from "./query-provider";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider>
      <QueryProvider>{children}</QueryProvider>
    </SessionProvider>
  );
}


