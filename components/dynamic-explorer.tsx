 "use client"

import { useState, useMemo, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  BarChart,
  Bar,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  Line,
  ComposedChart,
} from "recharts"
import {
  surveyData,
  columnOptions,
  getNewsSourcePrimary,
  getPartySimplified,
  getIdeologyLabel,
  calculateCorrelation,
  calculateMean,
  calculateStdDev,
  convertGPAToNumeric,
  convertGradeLevelToNumeric,
} from "@/lib/survey-data"
import { Activity, TrendingUp, BarChart3 } from "lucide-react"

// ----------------------
// Chart Color Resolver
// ----------------------
function useChartColors() {
  const [colors, setColors] = useState({
    chart1: "#3b82f6",
    chart2: "#10b981",
    chart3: "#f59e0b",
    chart4: "#ef4444",
    chart5: "#8b5cf6",
    chart6: "#06b6d4",
  })

  useEffect(() => {
    const temp = document.createElement("div")
    temp.style.display = "none"
    document.body.appendChild(temp)

    const resolveColor = (cssVar: string) => {
      temp.style.color = `var(${cssVar})`
      return getComputedStyle(temp).color
    }

    setColors({
      chart1: resolveColor("--chart-1"),
      chart2: resolveColor("--chart-2"),
      chart3: resolveColor("--chart-3"),
      chart4: resolveColor("--chart-4"),
      chart5: resolveColor("--chart-5"),
      chart6: resolveColor("--chart-6"),
    })

    document.body.removeChild(temp)
  }, [])

  return colors
}

// ----------------------
// Custom Tooltip
// ----------------------
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border-2 border-primary/40 rounded-xl shadow-2xl p-4">
        {payload.map((entry: any, index: number) => {
          const isPercentage =
            typeof entry.dataKey === "string" &&
            entry.dataKey.includes("percentage")

          let displayValue = entry.value
          if (typeof entry.value === "number") {
            if (isPercentage) {
              displayValue = `${entry.value.toFixed(1)}%`
            } else if (Number.isInteger(entry.value)) {
              displayValue = entry.value.toLocaleString()
            } else {
              displayValue = entry.value.toFixed(2)
            }
          }

          return (
            <p key={index} className="text-sm font-semibold" style={{ color: entry.color }}>
              {entry.name}:{" "}
              <span className="font-bold text-base">{displayValue}</span>
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

// ==========================================================
// MAIN COMPONENT
// ==========================================================
export function DynamicExplorer() {
  const chartColors = useChartColors()
  const CHART_COLORS = [
    chartColors.chart1,
    chartColors.chart2,
    chartColors.chart3,
    chartColors.chart4,
    chartColors.chart5,
    chartColors.chart6,
  ]

  const [xAxis, setXAxis] = useState("PoliticalParty")
  const [yAxis, setYAxis] = useState("PoliticalKnowledge")

  // NEW: Count / Percentage toggle
  const [showPercentages, setShowPercentages] = useState(false)

  // ========================================================
  // CHART DATA PIPELINE
  // ========================================================
  const { chartData, chartType, stats } = useMemo(() => {
    const xIsNumeric = xAxis === "GradeLevel" || xAxis === "GPA"
    const yIsNumeric = yAxis === "GradeLevel" || yAxis === "GPA"
    const yIsBoolean = yAxis === "PoliticalKnowledge"
    const xIsBoolean = xAxis === "PoliticalKnowledge"
    // ========================================================
    // CASE 1 — Scatter (numeric vs numeric)
    // ========================================================
    if (xIsNumeric && yIsNumeric) {
      const scatterData = surveyData
        .filter((d) => d[xAxis as keyof typeof d] && d[yAxis as keyof typeof d])
        .map((d) => {
          const xVal =
            xAxis === "GPA" ? convertGPAToNumeric(String(d.GPA)) : convertGradeLevelToNumeric(String(d.GradeLevel))
          const yVal =
            yAxis === "GPA" ? convertGPAToNumeric(String(d.GPA)) : convertGradeLevelToNumeric(String(d.GradeLevel))
          return { x: xVal, y: yVal }
        })
        .filter((d) => d.x > 0 && d.y > 0)

      const xVals = scatterData.map((d) => d.x)
      const yVals = scatterData.map((d) => d.y)
      const correlation = calculateCorrelation(xVals, yVals)

      const xMean = calculateMean(xVals)
      const yMean = calculateMean(yVals)
      const slope =
        xVals.reduce((sum, x, i) => sum + (x - xMean) * (yVals[i] - yMean), 0) /
        xVals.reduce((sum, x) => sum + Math.pow(x - xMean, 2), 0)
      const intercept = yMean - slope * xMean

      const regressionData = [
        { x: Math.min(...xVals), y: slope * Math.min(...xVals) + intercept },
        { x: Math.max(...xVals), y: slope * Math.max(...xVals) + intercept },
      ]

      return {
        chartData: { scatter: scatterData, regression: regressionData },
        chartType: "scatter" as const,
        stats: {
          correlation: correlation.toFixed(3),
          xMean: xMean.toFixed(2),
          yMean: yMean.toFixed(2),
          xStdDev: calculateStdDev(xVals).toFixed(2),
          yStdDev: calculateStdDev(yVals).toFixed(2),
          count: scatterData.length,
          rsquared: (correlation * correlation).toFixed(3),
        },
      }
    }

    // ========================================================
    // CASE 2 — PoliticalKnowledge (boolean → auto % only)
    // ========================================================
    if (yIsBoolean || xIsBoolean) {
      const isYBoolean = yIsBoolean
      const variableAxis = isYBoolean ? xAxis : yAxis
      const groups: Record<string, { correct: number; total: number }> = {}

      surveyData.forEach((d) => {
        let key = String(d[variableAxis as keyof typeof d])

        if (variableAxis === "NewsSource") key = getNewsSourcePrimary(key)
        if (variableAxis === "PoliticalParty" || variableAxis === "ParentsParty") key = getPartySimplified(key)
        if (variableAxis === "Ideology") key = getIdeologyLabel(key)
        if (variableAxis === "GradeLevel") key = String(d.GradeLevel)

        if (!key || key === "Unknown" || key === "") return

        if (!groups[key]) groups[key] = { correct: 0, total: 0 }
        groups[key].total++
        if (d.PoliticalKnowledge) groups[key].correct++
      })

      const data = Object.entries(groups)
        .map(([name, counts]) => ({
          name,
          percentage: (counts.correct / counts.total) * 100,
          count: counts.total,
          correct: counts.correct,
        }))
        .sort((a, b) => b.percentage - a.percentage)

      const avgPercentage = data.reduce((sum, d) => sum + d.percentage, 0) / data.length
      const totalCorrect = data.reduce((sum, d) => sum + d.correct, 0)
      const totalResponses = data.reduce((sum, d) => sum + d.count, 0)

      return {
        chartData: data,
        chartType: "bar" as const,
        stats: {
          average: `${avgPercentage.toFixed(1)}%`,
          overallRate: `${((totalCorrect / totalResponses) * 100).toFixed(1)}%`,
          categories: data.length,
          count: totalResponses,
          highestCategory: data[0]?.name || "N/A",
          highestRate: `${data[0]?.percentage.toFixed(1)}%` || "N/A",
        },
      }
    }

    // ========================================================
    // CASE 3 — Grouped categorical (toggle supported)
    // ========================================================
    if (!xIsNumeric && !yIsNumeric) {
      const groups: Record<
        string,
        { counts: Record<string, number>; total: number }
      > = {}

      const subCategorySet = new Set<string>()

      surveyData.forEach((d) => {
        let xKey = String(d[xAxis as keyof typeof d])
        let yKey = String(d[yAxis as keyof typeof d])

        if (xAxis === "NewsSource") xKey = getNewsSourcePrimary(xKey)
        if (xAxis === "PoliticalParty" || xAxis === "ParentsParty") xKey = getPartySimplified(xKey)
        if (xAxis === "Ideology") xKey = getIdeologyLabel(xKey)
        if (xAxis === "GradeLevel") xKey = String(d.GradeLevel)

        if (yAxis === "NewsSource") yKey = getNewsSourcePrimary(yKey)
        if (yAxis === "PoliticalParty" || yAxis === "ParentsParty") yKey = getPartySimplified(yKey)
        if (yAxis === "Ideology") yKey = getIdeologyLabel(yKey)
        if (yAxis === "GradeLevel") yKey = String(d.GradeLevel)

        if (!xKey || !yKey || xKey === "Unknown" || yKey === "Unknown") return

        if (!groups[xKey]) groups[xKey] = { counts: {}, total: 0 }

        groups[xKey].counts[yKey] = (groups[xKey].counts[yKey] || 0) + 1
        groups[xKey].total += 1
        subCategorySet.add(yKey)
      })

      const seriesKeys = Array.from(subCategorySet)

      let totalCount = 0
      let totalPercentage = 0
      let percentageEntries = 0

      let topCount = { value: 0, category: "", subcategory: "" }
      let topPercentage = { value: 0, category: "", subcategory: "" }

      const data = Object.entries(groups).map(([name, group]) => {
        const row: Record<string, number | string> = { name }
        totalCount += group.total

        seriesKeys.forEach((key) => {
          const count = group.counts[key] || 0
          const percentage = group.total > 0 ? (count / group.total) * 100 : 0

          row[`${key}__count`] = count
          row[`${key}__percentage`] = percentage

          if (count > topCount.value) topCount = { value: count, category: name, subcategory: key }
          if (percentage > topPercentage.value) topPercentage = { value: percentage, category: name, subcategory: key }

          if (count > 0) {
            totalPercentage += percentage
            percentageEntries++
          }
        })

        return row
      })

      const averagePercentage =
        percentageEntries > 0 ? totalPercentage / percentageEntries : 0

      return {
        chartData: { data, seriesKeys },
        chartType: "grouped" as const,
        stats: {
          count: totalCount,
          xCategories: data.length,
          yCategories: seriesKeys.length,
          averagePercentage,
          topCount,
          topPercentage,
        },
      }
    }

    // fallback
    return {
      chartData: { data: [], seriesKeys: [] },
      chartType: "grouped" as const,
      stats: {
        count: 0,
        xCategories: 0,
        yCategories: 0,
        averagePercentage: 0,
        topCount: { value: 0, category: "", subcategory: "" },
        topPercentage: { value: 0, category: "", subcategory: "" },
      },
    }
  }, [xAxis, yAxis])
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <Badge variant="secondary" className="text-xs px-4 py-1.5 font-bold tracking-wide">
          INTERACTIVE ANALYSIS
        </Badge>
        <h2 className="text-4xl font-black text-foreground tracking-tight">Dynamic Data Explorer</h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-4xl">
          Create custom visualizations by selecting variables. Chart types automatically adapt: scatter plots with
          correlation lines for numeric data, bar charts for knowledge rates, and grouped charts for categorical
          comparisons.
        </p>
      </div>

      <Card className="p-8 bg-card border border-border shadow-xl">

        {/* ================= VARIABLE SELECTION + TOGGLE ================= */}
        <div className="space-y-6 mb-10">
          <div className="flex items-center gap-3">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">Variable Selection</h3>
          </div>

          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1">
              {/* X-axis */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-foreground uppercase tracking-wide">
                  X-Axis Variable
                </label>
                <Select value={xAxis} onValueChange={setXAxis}>
                  <SelectTrigger className="bg-input border border-border text-foreground h-12 text-base font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col.value} value={col.value} className="text-base">
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Y-axis */}
              <div className="space-y-3">
                <label className="block text-sm font-bold text-foreground uppercase tracking-wide">
                  Y-Axis Variable
                </label>
                <Select value={yAxis} onValueChange={setYAxis}>
                  <SelectTrigger className="bg-input border border-border text-foreground h-12 text-base font-semibold">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {columnOptions.map((col) => (
                      <SelectItem key={col.value} value={col.value} className="text-base">
                        {col.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* TOGGLE — only for grouped OR numeric-bar (non-PoliticalKnowledge) */}
            {(chartType === "grouped" || chartType === "bar") &&
              !(yAxis === "PoliticalKnowledge" || xAxis === "PoliticalKnowledge") && (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/40 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Display Metric</p>
                    <p className="text-sm font-bold text-foreground">
                      {showPercentages ? "Percentages" : "Counts"}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="switch"
                    aria-checked={showPercentages}
                    onClick={() => setShowPercentages((prev) => !prev)}
                    className={`relative inline-flex h-9 w-16 items-center rounded-full border transition-colors ${
                      showPercentages
                        ? "border-primary bg-primary/90"
                        : "border-border bg-muted"
                    }`}
                  >
                    <span
                      className={`inline-block h-7 w-7 transform rounded-full bg-background shadow transition-transform ${
                        showPercentages ? "translate-x-8" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>
              )}
          </div>
        </div>



        {/* ===================== MAIN CHART + SIDEBAR ===================== */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">

          {/* ========================== CHART AREA ========================== */}
          <div className="lg:col-span-3">
            <div className="bg-secondary/20 rounded-2xl p-6 border border-border/50">
              <ResponsiveContainer width="100%" height={500}>

                {/* ================== SCATTER ================== */}
                {chartType === "scatter" && (
                  <ComposedChart>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

                    <XAxis
                      dataKey="x"
                      type="number"
                      domain={["dataMin - 0.1", "dataMax + 0.1"]}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }}
                      label={{
                        value: columnOptions.find((c) => c.value === xAxis)?.label,
                        position: "insideBottom",
                        offset: -5,
                        fill: "hsl(var(--foreground))",
                        fontWeight: 700,
                      }}
                    />

                    <YAxis
                      dataKey="y"
                      type="number"
                      domain={["dataMin - 0.1", "dataMax + 0.1"]}
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12, fontWeight: 600 }}
                      label={{
                        value: columnOptions.find((c) => c.value === yAxis)?.label,
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--foreground))",
                        fontWeight: 700,
                      }}
                    />

                    <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />

                    <Scatter
                      name="Data Points"
                      data={(chartData as any).scatter}
                      fill={CHART_COLORS[1]}
                      opacity={0.7}
                    />

                    <Line
                      type="linear"
                      dataKey="y"
                      data={(chartData as any).regression}
                      stroke={CHART_COLORS[0]}
                      strokeWidth={3}
                      dot={false}
                      name="Correlation Line"
                    />
                  </ComposedChart>
                )}



                {/* ================== POLITICAL KNOWLEDGE BAR ================== */}
                {chartType === "bar" &&
                  (yAxis === "PoliticalKnowledge" || xAxis === "PoliticalKnowledge") && (
                    <BarChart data={chartData as any}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />

                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                        label={{
                          value: "Correct (%)",
                          angle: -90,
                          position: "insideLeft",
                          fill: "hsl(var(--foreground))",
                          fontWeight: 700,
                        }}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                        {(chartData as any).map((_entry: any, idx: number) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}



                {/* ================== NORMAL BAR (toggle counts/%) ================== */}
                {chartType === "bar" &&
                  !(yAxis === "PoliticalKnowledge" || xAxis === "PoliticalKnowledge") && (
                    <BarChart data={chartData as any}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

                      <XAxis
                        dataKey="name"
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />

                      <YAxis
                        stroke="hsl(var(--muted-foreground))"
                        tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                        tickFormatter={(v: number) =>
                          showPercentages ? `${v.toFixed(0)}%` : Number(v).toLocaleString()
                        }
                        label={{
                          value: showPercentages ? "Percentage (%)" : "Count",
                          angle: -90,
                          position: "insideLeft",
                          fill: "hsl(var(--foreground))",
                          fontWeight: 700,
                        }}
                      />

                      <Tooltip content={<CustomTooltip />} />

                      <Bar
                        dataKey={showPercentages ? "percentage" : "count"}
                        radius={[8, 8, 0, 0]}
                      >
                        {(chartData as any).map((_entry: any, idx: number) => (
                          <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}



                {/* ================== GROUPED (toggle counts/%) ================== */}
                {chartType === "grouped" && (
                  <BarChart data={(chartData as any).data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />

                    <XAxis
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11, fontWeight: 600 }}
                      angle={-15}
                      textAnchor="end"
                      height={80}
                    />

                    <YAxis
                      stroke="hsl(var(--muted-foreground))"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                      tickFormatter={(v: number) =>
                        showPercentages ? `${v.toFixed(0)}%` : Number(v).toLocaleString()
                      }
                      domain={showPercentages ? [0, 100] : ["auto", "auto"]}
                      label={{
                        value: showPercentages ? "Share (%)" : "Count",
                        angle: -90,
                        position: "insideLeft",
                        fill: "hsl(var(--foreground))",
                        fontWeight: 700,
                      }}
                    />

                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      wrapperStyle={{
                        color: "hsl(var(--foreground))",
                        fontWeight: 600,
                        paddingTop: "20px",
                      }}
                    />

                    {(chartData as any).seriesKeys.map((key: string, idx: number) => (
                      <Bar
                        key={key}
                        dataKey={`${key}__${showPercentages ? "percentage" : "count"}`}
                        name={`${key} ${showPercentages ? "(%)" : "(Count)"}`}
                        fill={CHART_COLORS[idx % CHART_COLORS.length]}
                        radius={[8, 8, 0, 0]}
                      />
                    ))}
                  </BarChart>
                )}


              </ResponsiveContainer>
            </div>
          </div>



          {/* ========================== STATS SIDEBAR ========================== */}
          <div className="space-y-5">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-primary" />
              <h4 className="text-lg font-bold text-foreground">Statistical Analysis</h4>
            </div>

            {/* ========= SCATTER STATS ========= */}
            {chartType === "scatter" && (
              <div className="space-y-4">
                <Card className="p-5 bg-primary/10 border border-primary/30">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Correlation (r)
                  </p>
                  <p className="text-3xl font-black text-primary">{stats.correlation}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {Math.abs(Number(stats.correlation)) > 0.7
                      ? "Strong"
                      : Math.abs(Number(stats.correlation)) > 0.4
                      ? "Moderate"
                      : "Weak"}{" "}
                    relationship
                  </p>
                </Card>

                <Card className="p-5 bg-secondary/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    R² Value
                  </p>
                  <p className="text-2xl font-black">{stats.rsquared}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {(Number(stats.rsquared) * 100).toFixed(1)}% variance explained
                  </p>
                </Card>

                <Card className="p-5 bg-secondary/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Sample Size (n)
                  </p>
                  <p className="text-2xl font-black">{stats.count}</p>
                </Card>
              </div>
            )}



            {/* ========= POLITICAL KNOWLEDGE BAR STATS (no toggle) ========= */}
            {chartType === "bar" &&
              (yAxis === "PoliticalKnowledge" || xAxis === "PoliticalKnowledge") && (
                <div className="space-y-4">
                  <Card className="p-5 bg-primary/10 border border-primary/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Overall Rate
                    </p>
                    <p className="text-3xl font-black text-primary">{stats.overallRate}</p>
                    <p className="text-xs text-muted-foreground mt-2">Correct identification</p>
                  </Card>

                  <Card className="p-5 bg-secondary/30 border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Mean by Category
                    </p>
                    <p className="text-2xl font-black">{stats.average}</p>
                  </Card>

                  <Card className="p-5 bg-secondary/30 border border-border">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      Highest Rate
                    </p>
                    <p className="text-xl font-black">{stats.highestRate}</p>
                    <p className="text-xs text-muted-foreground mt-2">{stats.highestCategory}</p>
                  </Card>
                </div>
              )}



            {/* ========= NORMAL BAR STATS (toggle applies) ========= */}
            {chartType === "bar" &&
              !(yAxis === "PoliticalKnowledge" || xAxis === "PoliticalKnowledge") && (
                <div className="space-y-4">
                  <Card className="p-5 bg-primary/10 border border-primary/30">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                      {showPercentages ? "Average (%)" : "Total Count"}
                    </p>
                    <p className="text-3xl font-black">
                      {showPercentages
                        ? stats.average + "%"
                        : Number(stats.count).toLocaleString()}
                    </p>
                  </Card>
                </div>
              )}



            {/* ========= GROUPED STATS ========= */}
            {chartType === "grouped" && (
              <div className="space-y-4">
                <Card className="p-5 bg-primary/10 border border-primary/30">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {showPercentages ? "Average Share" : "Total Responses"}
                  </p>
                  <p className="text-3xl font-black">
                    {showPercentages
                      ? `${stats.averagePercentage.toFixed(1)}%`
                      : Number(stats.count).toLocaleString()}
                  </p>
                </Card>

                <Card className="p-5 bg-secondary/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    {showPercentages ? "Top Share" : "Largest Sub-Category"}
                  </p>
                  <p className="text-2xl font-black">
                    {showPercentages
                      ? `${stats.topPercentage.value.toFixed(1)}%`
                      : Number(stats.topCount.value).toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {showPercentages
                      ? `${stats.topPercentage.subcategory} in ${stats.topPercentage.category}`
                      : `${stats.topCount.subcategory} in ${stats.topCount.category}`}
                  </p>
                </Card>

                <Card className="p-5 bg-secondary/30 border border-border">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">
                    Category Overview
                  </p>
                  <p className="text-2xl font-black">{stats.xCategories}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {stats.yCategories} sub-categories
                  </p>
                </Card>
              </div>
            )}

            {/* CHART TYPE LABEL */}
            <Card className="p-4 bg-primary/5 border border-primary/20">
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                <BarChart3 className="w-4 h-4 inline mr-1.5" />
                Chart type:{" "}
                {chartType === "scatter" && "Scatter + Correlation"}
                {chartType === "bar" && "Bar Chart"}
                {chartType === "grouped" && "Grouped Bar"}
              </p>
            </Card>
          </div>

        </div>
      </Card>
    </div>
  )
}

