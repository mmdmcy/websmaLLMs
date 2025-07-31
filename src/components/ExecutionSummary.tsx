import React from 'react';
import { Activity, Clock, DollarSign, Target } from 'lucide-react';
import benchmarkData from '../data/benchmark-results.json';

const ExecutionSummary: React.FC = () => {
  const { execution_summary } = benchmarkData;

  const stats = [
    {
      icon: Target,
      label: 'TOTAL_EVALUATIONS',
      value: execution_summary.total_evaluations.toString(),
      color: 'text-green-400'
    },
    {
      icon: DollarSign,
      label: 'TOTAL_COST',
      value: `$${execution_summary.total_cost.toFixed(4)}`,
      color: 'text-yellow-400'
    },
    {
      icon: Clock,
      label: 'EXECUTION_TIME',
      value: `${execution_summary.total_time_minutes.toFixed(1)}m`,
      color: 'text-cyan-400'
    },
    {
      icon: Activity,
      label: 'AVG_COST_PER_EVAL',
      value: `$${execution_summary.avg_cost_per_eval.toFixed(4)}`,
      color: 'text-purple-400'
    }
  ];

  return (
    <div className="border border-green-400 bg-gray-900 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Activity className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl text-cyan-400 font-bold">EXECUTION_SUMMARY</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <div key={index} className="border border-gray-600 bg-black p-4 hover:border-green-400 transition-colors">
            <div className="flex items-center space-x-3 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-gray-400 text-sm">{stat.label}</span>
            </div>
            <div className={`text-2xl font-bold ${stat.color}`}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">TIMESTAMP:</span>
            <span className="text-green-400 ml-2">
              {new Date(execution_summary.timestamp).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="text-gray-400">STATUS:</span>
            <span className="text-green-400 ml-2">✓ COMPLETED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExecutionSummary;