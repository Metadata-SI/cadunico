import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard } from "./ChartCard";
import type { CategoryDatum } from "@/types/dashboard";
import { formatValue, type ValueFormat } from "@/utils/format";
import { chartPalette, chartTooltipStyle } from "./chart-theme";

export interface BarChartCardProps {
  title: string;
  description?: string;
  meta?: string;
  data: CategoryDatum[];
  /** "vertical" = barras horizontais. */
  orientation?: "horizontal" | "vertical";
  valueFormat?: ValueFormat;
  /** @deprecated As barras usam sempre a cor de marca; mantido para não quebrar chamadas existentes. */
  multicolor?: boolean;
  height?: number;
  className?: string;
}

export function BarChartCard({
  title,
  description,
  meta,
  data,
  orientation = "horizontal",
  valueFormat = "integer",
  height,
  className,
}: BarChartCardProps) {
  const isVertical = orientation === "vertical";
  const defaultHeight = isVertical ? Math.max(320, data.length * 36 + 48) : 320;
  const chartHeight = height ? Math.max(height, isVertical ? data.length * 34 + 40 : height) : defaultHeight;

  const longestLabelLength = data.reduce((length, item) => Math.max(length, (item.label || "").length), 0);
  const categoryAxisWidth = Math.min(230, Math.max(116, Math.round(longestLabelLength * 7.2)));

  const axisProps = {
    tick: { fontSize: 11, fill: "var(--color-muted-foreground)" },
    stroke: "var(--color-border)",
  };

  return (
    <ChartCard title={title} description={description} meta={meta} className={className}>
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout={isVertical ? "vertical" : "horizontal"}
            margin={
              isVertical
                ? { top: 4, right: 24, bottom: 4, left: 4 }
                : { top: 8, right: 12, bottom: 12, left: 0 }
            }
            barCategoryGap={isVertical ? "20%" : "26%"}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              horizontal={!isVertical}
              vertical={isVertical}
            />
            <XAxis
              type={isVertical ? "number" : "category"}
              interval={0}
              height={isVertical ? 30 : 76}
              {...(isVertical
                ? { tickFormatter: (v: number) => formatValue(v, valueFormat) }
                : {
                    dataKey: "label",
                    angle: -35,
                    textAnchor: "end" as const,
                    tickMargin: 8,
                    tickFormatter: (v: string) =>
                      String(v).length > 25 ? `${String(v).slice(0, 23)}…` : String(v),
                  })}
              {...axisProps}
            />
            <YAxis
              type={isVertical ? "category" : "number"}
              width={isVertical ? categoryAxisWidth : 56}
              {...(isVertical
                ? {
                    dataKey: "label",
                    tickFormatter: (v: string) =>
                      String(v).length > 30 ? `${String(v).slice(0, 28)}…` : String(v),
                  }
                : { tickFormatter: (v: number) => formatValue(v, valueFormat) })}
              {...axisProps}
            />

            <Tooltip
              {...chartTooltipStyle}
              formatter={(value) => [formatValue(Number(value), valueFormat), "Total"]}
            />
            <Bar
              dataKey="value"
              fill={chartPalette[0]}
              radius={isVertical ? [0, 6, 6, 0] : [6, 6, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
