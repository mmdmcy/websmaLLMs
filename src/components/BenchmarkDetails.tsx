import React, { useState } from 'react';
import { Target, ChevronDown, ChevronUp } from 'lucide-react';
import benchmarkData from '../data/benchmark-results.json';

const BenchmarkDetails: React.FC = () => {
  const [sortBy, setSortBy] = useState<'accuracy' | 'cost' | 'latency' | 'value'>('accuracy');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { model_analysis, rankings } = benchmarkData || {};
  const safeModelAnalysis = model_analysis ?? {};
  const safeRankings = rankings ?? { performance: [], cost_efficiency: [] };

  const handleSort = (column: 'accuracy' | 'cost' | 'latency' | 'value') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
  };

  const sortedData = (Object.entries(safeModelAnalysis) as [string, any][]).sort(([, a], [, b]) => {
    let valueA: number, valueB: number;
    
    switch (sortBy) {
      case 'accuracy':
        valueA = a.avg_accuracy;
        valueB = b.avg_accuracy;
        break;
      case 'cost':
        valueA = a.total_cost;
        valueB = b.total_cost;
        break;
      case 'latency':
        valueA = a.avg_latency;
        valueB = b.avg_latency;
        break;
      case 'value':
        valueA = a.value_score;
        valueB = b.value_score;
        break;
      default:
        return 0;
    }

    return sortOrder === 'asc' ? valueA - valueB : valueB - valueA;
  });

  const SortIcon = ({ column }: { column: string }) => {
    if (sortBy !== column) return null;
    return sortOrder === 'asc' ? 
      <ChevronUp className="w-4 h-4 inline ml-1" /> : 
      <ChevronDown className="w-4 h-4 inline ml-1" />;
  };

  return (
    <div className="border border-green-400 bg-gray-900 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Target className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl text-cyan-400 font-bold">BENCHMARK_DETAILS</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Rankings */}
        <div className="border border-gray-600 bg-black p-4">
          <h3 className="text-cyan-400 font-bold mb-4">PERFORMANCE_RANKINGS</h3>
          <div className="space-y-3">
            {(safeRankings.performance ?? []).slice(0, 3).map((entry: any, index: number) => {
              const [model, data] = entry as [any, any];
              return (
              <div key={String(model)} className="flex items-center justify-between border-b border-gray-700 pb-2">
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                    index === 0 ? 'bg-yellow-400 text-black' : 
                    index === 1 ? 'bg-gray-400 text-black' : 'bg-orange-400 text-black'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-green-400 text-sm">
                    {String(model).split('/')[1] || String(model).substring(0, 20)}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="text-cyan-400 font-bold">{Number.isFinite((data as any)?.avg_accuracy) ? ((data as any).avg_accuracy * 100).toFixed(1) : '0.0'}%</div>
                  <div className="text-gray-400 text-xs">${Number.isFinite((data as any)?.total_cost) ? (data as any).total_cost.toFixed(4) : '0.0000'}</div>
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Cost Efficiency Rankings */}
        <div className="border border-gray-600 bg-black p-4">
          <h3 className="text-cyan-400 font-bold mb-4">COST_EFFICIENCY</h3>
          <div className="space-y-3">
            {(safeRankings.cost_efficiency ?? []).slice(0, 3).map((entry: any, index: number) => {
              const [model, data] = entry as [any, any];
              return (
              <div key={String(model)} className="flex items-center justify-between border-b border-gray-700 pb-2">
                <div className="flex items-center space-x-3">
                  <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                    index === 0 ? 'bg-green-400 text-black' : 
                    index === 1 ? 'bg-cyan-400 text-black' : 'bg-purple-400 text-black'
                  }`}>
                    {index + 1}
                  </span>
                  <span className="text-green-400 text-sm">
                    {String(model).split('/')[1] || String(model).substring(0, 20)}
                  </span>
                </div>
                <div className="text-right text-sm">
                  <div className="text-yellow-400 font-bold">${Number.isFinite((data as any)?.total_cost) ? (data as any).total_cost.toFixed(4) : '0.0000'}</div>
                  <div className="text-gray-400 text-xs">Score: {Number.isFinite((data as any)?.value_score) ? (data as any).value_score.toFixed(2) : '0.00'}</div>
                </div>
              </div>
            );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Results Table */}
      <div className="mt-6 border border-gray-600 bg-black overflow-hidden">
        <div className="p-4 border-b border-gray-600">
          <h3 className="text-cyan-400 font-bold">DETAILED_RESULTS</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-800">
              <tr>
                <th className="px-4 py-3 text-left text-gray-400">MODEL</th>
                <th 
                  className="px-4 py-3 text-left text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                  onClick={() => handleSort('accuracy')}
                >
                  ACCURACY <SortIcon column="accuracy" />
                </th>
                <th 
                  className="px-4 py-3 text-left text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                  onClick={() => handleSort('latency')}
                >
                  LATENCY <SortIcon column="latency" />
                </th>
                <th 
                  className="px-4 py-3 text-left text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                  onClick={() => handleSort('cost')}
                >
                  COST <SortIcon column="cost" />
                </th>
                <th 
                  className="px-4 py-3 text-left text-gray-400 cursor-pointer hover:text-green-400 transition-colors"
                  onClick={() => handleSort('value')}
                >
                  VALUE_SCORE <SortIcon column="value" />
                </th>
                <th className="px-4 py-3 text-left text-gray-400">SUCCESS_RATE</th>
              </tr>
            </thead>
            <tbody>
              {sortedData.map(([model, data], index) => (
                <tr key={model} className={`border-b border-gray-700 hover:bg-gray-800 transition-colors ${
                  index % 2 === 0 ? 'bg-gray-900' : 'bg-black'
                }`}>
                  <td className="px-4 py-3 text-green-400 font-medium">
                    {model.split('/')[1] || model}
                  </td>
                  <td className="px-4 py-3 text-cyan-400 font-bold">
                    {(data.avg_accuracy * 100).toFixed(1)}%
                  </td>
                  <td className="px-4 py-3 text-purple-400">
                    {data.avg_latency.toFixed(0)}ms
                  </td>
                  <td className="px-4 py-3 text-yellow-400">
                    ${data.total_cost.toFixed(4)}
                  </td>
                  <td className="px-4 py-3 text-pink-400">
                    {data.value_score.toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-green-400">
                    {(data.success_rate * 100).toFixed(0)}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default BenchmarkDetails;