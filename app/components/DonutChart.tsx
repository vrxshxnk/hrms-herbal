"use client";


import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

interface DonutChartProps {
  percentage: number;
  color: string;
}

export const DonutChart = ({ percentage, color }: DonutChartProps) => {
  const data = [
    { value: percentage },
    { value: 100 - percentage },
  ];

  return (
    <div className="w-16 h-16 relative flex items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            innerRadius={20}
            outerRadius={28}
            startAngle={90}
            endAngle={-270}
            dataKey="value"
            stroke="none"
          >
            <Cell fill={color} />
            <Cell fill="#f1f5f9" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <span className="absolute text-xs font-bold text-slate-800">
        {percentage}%
      </span>
    </div>
  );
};