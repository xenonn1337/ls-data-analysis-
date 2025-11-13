"use client"

import { useState } from "react"
import { DynamicExplorer } from "./dynamic-explorer"
import { InsightsPage } from "./insights-page"
import { BarChart3, Lightbulb, Menu, X, Download, Github } from "lucide-react"
import { surveyData } from "@/lib/survey-data"
import Image from "next/image"

export function DataDashboard() {
  const [currentPage, setCurrentPage] = useState<"explorer" | "insights">("insights")
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleDownloadCSV = () => {
    const link = document.createElement("a")
    link.href = "/data/survey-data.csv"
    link.download = "lasalle-political-survey-2025.csv"
    link.click()
  }

  return (
    <div className="min-h-screen bg-background relative">

      {/* HEADER */}
      <header className="border-b border-border/50 bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-secondary/60 rounded-lg transition-colors lg:hidden"
                aria-label="Toggle menu"
              >
                {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
              <div className="flex items-center gap-4">
                <Image
                  src="/lasalle-logo.png"
                  alt="LaSalle College High School"
                  width={60}
                  height={60}
                  className="object-contain"
                />
                <div>
                  <h1 className="text-2xl font-black text-foreground leading-tight tracking-tight">
                    Political Survey Dashboard
                  </h1>
                  <p className="text-sm text-muted-foreground font-medium">November 2025</p>
                </div>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-3">
              <button
                onClick={handleDownloadCSV}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary/60 hover:bg-secondary transition-all text-foreground font-semibold"
              >
                <Download className="w-4 h-4" />
                <span className="hidden xl:inline">Download Data</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* LAYOUT */}
      <div className="flex">

        {/* SIDEBAR */}
        <aside
          className={`fixed lg:sticky top-20 left-0 h-[calc(100vh-5rem)] bg-card border-r border-border/50 z-40 transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          } w-64 sidebar-enter`}
        >
          <nav className="p-6 space-y-3">
            <button
              onClick={() => {
                setCurrentPage("insights")
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                currentPage === "insights"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              <Lightbulb className="w-5 h-5" />
              Key Insights
            </button>

            <button
              onClick={() => {
                setCurrentPage("explorer")
                setSidebarOpen(false)
              }}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-bold transition-all ${
                currentPage === "explorer"
                  ? "bg-primary text-primary-foreground shadow-lg"
                  : "text-foreground hover:bg-secondary/60"
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              Dynamic Explorer
            </button>

            <div className="pt-6 mt-6 border-t border-border/50 space-y-3 lg:hidden">
              <button
                onClick={handleDownloadCSV}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl font-semibold text-foreground hover:bg-secondary/60 transition-all"
              >
                <Download className="w-5 h-5" />
                Download Data
              </button>
            </div>

            <div className="pt-6 mt-6 border-t border-border/50">
              <div className="text-xs text-muted-foreground space-y-1">
                <p className="font-semibold">Survey Statistics</p>
                <p>Total Responses: {surveyData.length}</p>
                <p>Date: November 2025</p>
              </div>
            </div>
          </nav>
        </aside>

        {/* OVERLAY FOR MOBILE */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* MAIN CONTENT */}
        <main className="flex-1 p-6 lg:p-12 fade-in">
          {currentPage === "insights" ? <InsightsPage /> : <DynamicExplorer />}
        </main>
      </div>

      {/* FOOTER */}
      <footer className="border-t border-border/50 bg-card/60 backdrop-blur-sm mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm font-bold text-foreground">
              LaSalle College High School
            </p>

            <p className="text-sm text-muted-foreground">
              Pennsylvania Political Survey Dashboard • November 2025 • {surveyData.length} Responses
            </p>

            {/* GitHub Icon Link */}
            <a
              href="https://github.com/xenonn1337/ls-data-analysis"
              target="_blank"
              rel="noopener noreferrer"
              className="flex justify-center pt-1"
            >
              <Github className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
