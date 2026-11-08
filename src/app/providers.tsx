"use client";

import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider, type AbstractIntlMessages } from "next-intl";
import { ThemeProvider } from "next-themes";
import { useState, type ReactNode } from "react";
import { ToastProvider } from "@/components/Toast";
import { createUnauthorizedHandler } from "@/lib/api-client";

export function Providers({
  locale,
  messages,
  children,
}: {
  locale: string;
  messages: AbstractIntlMessages;
  children: ReactNode;
}) {
  const [queryClient] = useState(() => {
    const onUnauthorized = createUnauthorizedHandler();
    return new QueryClient({
      queryCache: new QueryCache({ onError: onUnauthorized }),
      mutationCache: new MutationCache({ onError: onUnauthorized }),
      defaultOptions: { queries: { refetchOnWindowFocus: true } },
    });
  });

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <NextIntlClientProvider
        locale={locale}
        messages={messages}
        timeZone="Asia/Bangkok"
      >
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </NextIntlClientProvider>
    </ThemeProvider>
  );
}
