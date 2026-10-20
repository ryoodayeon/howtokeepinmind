import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Tasting Atlas",
  description: "음료와 시음 기록을 관리하는 개인 아카이브.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
