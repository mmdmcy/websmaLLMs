import React, { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ScatterChart, Scatter } from 'recharts';
import { TrendingUp } from 'lucide-react';
import benchmarkData from '../data/benchmark-results.json';

const ModelPerformance: React.FC<{ model_analysis?: any }> = ({ model_analysis }) => {
  // fallback to bundled benchmark data when prop not provided (prevents runtime errors)
  const safeModelAnalysis = model_analysis ?? benchmarkData.model_analysis ?? {};
  const [activeChart, setActiveChart] = useState<'accuracy' | 'latency'>('accuracy');

  const chartData = Object.entries(safeModelAnalysis).map(([model, data]: [string, any]) => ({
    model: model.split('/')[1] || model.substring(0, 15),
    fullModel: model,
    accuracy: Number.isFinite(data?.avg_accuracy) ? Math.round(data.avg_accuracy * 100) : 0,
    latency: Number.isFinite(data?.avg_latency) ? Math.round(data.avg_latency) : 0,
    cost: Number.isFinite(data?.total_cost) ? data.total_cost : 0,
    valueScore: Number.isFinite(data?.value_score) ? data.value_score : 0
  }));

  const CustomTooltip = ({ active, payload, label: _label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload || {};
      const cost = Number.isFinite(data.cost) ? data.cost : null;
      const valueScore = Number.isFinite(data.valueScore) ? data.valueScore : null;
      return (
        <div className="bg-black border border-green-400 p-3 text-green-400 text-sm">
          <p className="text-cyan-400 font-bold mb-2">{data.fullModel}</p>
          <div className="space-y-1">
            <p>Accuracy: <span className="text-yellow-400">{data.accuracy ?? 0}%</span></p>
            <p>Latency: <span className="text-purple-400">{data.latency ?? 0}ms</span></p>
            {cost !== null ? (
              <p>Cost: <span className="text-green-400">${cost.toFixed(4)}</span></p>
            ) : null}
            {valueScore !== null ? (
              <p>Value Score: <span className="text-cyan-400">{valueScore.toFixed(2)}</span></p>
            ) : null}
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
          <TrendingUp className="w-5 h-5 text-cyan-400" />
          <h2 className="text-xl text-cyan-400 font-bold">MODEL_PERFORMANCE</h2>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveChart('accuracy')}
            className={`px-4 py-2 border transition-colors ${
              activeChart === 'accuracy'
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400'
            }`}
          >
            ACCURACY
          </button>
          <button
            onClick={() => setActiveChart('latency')}
            className={`px-4 py-2 border transition-colors ${
              activeChart === 'latency'
                ? 'border-green-400 bg-green-400 text-black'
                : 'border-gray-600 text-gray-400 hover:border-green-400 hover:text-green-400'
            }`}
          >
            LATENCY
          </button>
        </div>
      </div>

      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          {activeChart === 'accuracy' ? (
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="model" 
                tick={{ fontSize: 12, fill: '#10b981' }}
                axisLine={{ stroke: '#10b981' }}
              />
              <YAxis 
                tick={{ fontSize: 12, fill: '#10b981' }}
                axisLine={{ stroke: '#10b981' }}
                label={{ value: 'Accuracy (%)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#10b981' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar 
                dataKey="accuracy" 
                fill="#10b981"
                stroke="#22c55e"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
              />
            </BarChart>
          ) : (
            <ScatterChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="accuracy"
                tick={{ fontSize: 12, fill: '#10b981' }}
                axisLine={{ stroke: '#10b981' }}
                label={{ value: 'Accuracy (%)', position: 'insideBottom', offset: -10, style: { textAnchor: 'middle', fill: '#10b981' } }}
              />
              <YAxis 
                dataKey="latency"
                tick={{ fontSize: 12, fill: '#10b981' }}
                axisLine={{ stroke: '#10b981' }}
                label={{ value: 'Latency (ms)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#10b981' } }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Scatter 
                dataKey="latency" 
                fill="#fbbf24"
                stroke="#f59e0b"
                strokeWidth={2}
              />
            </ScatterChart>
          )}
        </ResponsiveContainer>
      </div>

      <div className="mt-4 text-xs text-gray-400">
        <span className="text-cyan-400">TIP:</span> Click chart buttons to switch views • Hover over data points for details
      </div>
    </div>
  );
};

export default ModelPerformance;