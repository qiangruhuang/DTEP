import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "天衡 DTEP — 数字化试验鉴定平台原型",
  description: "借鉴美军 DoD 试验鉴定体系（DT&E/OT&E、LVC 联合试验、数字孪生、VV&A、证据链追溯）构建的数字化试验鉴定平台原型：试验任务、鉴定指标、试验事件、判读管道、试验指挥与鉴定助手。",
  keywords: ["试验鉴定", "Test and Evaluation", "DT&E", "OT&E", "LVC", "数字孪生", "VV&A", "TEMP", "数字化试验", "系统原型"],
  authors: [{ name: "天衡 DTEP" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "天衡 DTEP — 数字化试验鉴定平台原型",
    description: "试验任务 · 鉴定指标 · 试验事件 · 试验数据 · 鉴定报告",
    siteName: "天衡 DTEP",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
