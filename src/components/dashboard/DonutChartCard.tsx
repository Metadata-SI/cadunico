import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ChartCard } from "./ChartCard";
import type { CategoryDatum } from "@/types/dashboard";
import { formatValue, share, sum } from "@/utils/format";
import { chartPalette, chartTooltipStyle } from "./chart-theme";

export interface DonutChartCardProps {
  title: string;
  description?: string | undefined;
  meta?: string | undefined;
  data: CategoryDatum[];
  height?: number;
  className?: string | undefined;
}

export function DonutChartCard({
  title,
  description,
  meta,
  data,
  height,
  className,
}: DonutChartCardProps) {
  const total = sum(data);
  const minHeight = data.length > 6 ? 320 + Math.ceil(data.length / 3) * 22 : 300;
  const chartHeight = height ? Math.max(height, minHeight) : minHeight;

  return (
    <ChartCard title={title} description={description} meta={meta} className={className}>
      <div style={{ height: chartHeight }} className="w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="label"
              innerRadius="50%"
              outerRadius="75%"
              paddingAngle={2}
              stroke="var(--color-card)"
              strokeWidth={2}
            >
              {data.map((item, index) => (
                <Cell key={item.label} fill={chartPalette[index % chartPalette.length] ?? chartPalette[0]!} />
              ))}
            </Pie>
            <Tooltip
              {...chartTooltipStyle}
              formatter={(value, name) => [
                `${formatValue(Number(value))} (${formatValue(share(Number(value), total), "percent")})`,
                String(name),
              ]}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ paddingTop: "12px" }}
              formatter={(value) => (
                <span className="text-xs text-muted-foreground">{String(value)}</span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </ChartCard>
  );
}
