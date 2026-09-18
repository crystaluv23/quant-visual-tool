import type { Metadata, Viewport } from "next"
import { Inter, JetBrains_Mono } from "next/font/google"
import "./globals.css"

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
})

const mono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono-code",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Alphascope — 量化因子实验台",
  description:
    "一个网页形态的量化研究工具：实时因子表达式实验（支持 hole 的不完整结果）与自然语言历史形态检索。",
}

export const viewport: Viewport = {
  themeColor: "#08090b",
  colorScheme: "dark",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" className={`${inter.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  )
}
