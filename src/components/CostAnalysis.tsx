import React, { useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { DollarSign } from 'lucide-react';
import benchmarkData from '../data/benchmark-results.json';

const CostAnalysis: React.FC = () => {
  const [activeView, setActiveView] = useState<'pie' | 'bar'>('pie');
  const { cost_breakdown, model_analysis } = benchmarkData;

  const costData = Object.entries(cost_breakdown).map(([model, cost]) => ({
    name: model.split('/')[1] || model.substring(0, 15),
    fullName: model,
    value: cost,
    percentage: ((cost / benchmarkData.execution_summary.total_cost) * 100).toFixed(1)
  }));

  const valueData = Object.entries(model_analysis).map(([model, data]) => ({
    model: model.split('/')[1] || model.substring(0, 15),
    fullModel: model,
    valueScore: data.value_score,
    cost: data.total_cost,
    accuracy: data.avg_accuracy * 100
  }));

  const COLORS = ['#10b981', '#06b6d4', '#fbbf24', '#f472b6', '#8b5cf6'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-black border border-green-400 p-3 text-green-400 text-sm">
          <p className="text-cyan-400 font-bold mb-2">{data.fullName || data.fullModel}</p>
          <div className="space-y-1">
            {data.value !== undefined && (
              <p>Cost: <span className="text-yellow-400">${data.value.toFixed(4)}</span></p>
            )}
            {data.percentage && (
              <p>Share: <span className="text-purple-400">{data.percentage}%</span></p>
            )}
            {data.valueScore !== undefined && (
              <p>Value Score: <span className="text-cyan-400">{data.valueScore.toFixed(2)}</span></p>
            )}
            {data.accuracy !== undefined && (
              <p>Accuracy: <span className="text-green-400">{data.accuracy.toFixed(1)}%</span></p>
            )}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="border border-green-400 bg-gray-900 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <DollarSign className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl text-cyan-400 font-bold">COST_ANALYSIS</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveView('pie')}
            className={`px-4 py-2 border transition-colors ${
              activeView === 'pie'
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400'
            }`}
          >
            DISTRIBUTION
          </button>
          <button
            onClick={() => setActiveView('bar')}
            className={`px-4 py-2 border transition-colors ${
              activeView === 'bar'
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400'
            }`}
          >
            VALUE_SCORE
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            {activeView === 'pie' ? (
              <PieChart>
                <Pie
                  data={costData}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, percentage }) => `${name}: ${percentage}%`}
                  labelLine={false}
                >
                  {costData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            ) : (
              <BarChart data={valueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="model" 
                  tick={{ fontSize: 12, fill: '#10b981' }}
                  axisLine={{ stroke: '#10b981' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#10b981' }}
                  axisLine={{ stroke: '#10b981' }}
                  label={{ value: 'Value Score', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#10b981' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="valueScore" 
                  fill="#06b6d4"
                  stroke="#0891b2"
                  strokeWidth={1}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-600 bg-black p-4">
            <h3 className="text-cyan-400 font-bold mb-3">COST_BREAKDOWN</h3>
            <div className="space-y-2">
              {costData.map((item, index) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span className="text-green-400 truncate">{item.name}</span>
                  </div>
                  <span className="text-yellow-400">${item.value.toFixed(4)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-600 bg-black p-4">
            <h3 className="text-cyan-400 font-bold mb-3">EFFICIENCY_METRICS</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Cost/Minute:</span>
                <span className="text-yellow-400">${benchmarkData.execution_summary.cost_per_minute.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Models:</span>
                <span className="text-green-400">{Object.keys(model_analysis).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate:</span>
                <span className="text-green-400">100%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CostAnalysis;