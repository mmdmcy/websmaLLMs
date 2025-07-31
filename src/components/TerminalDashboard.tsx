import React, { useState, useEffect } from 'react';
import { Terminal, Activity, DollarSign, Clock, Target, Zap, Github } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import benchmarkData from '../data/benchmark-results.json';

const TerminalDashboard: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [typedText, setTypedText] = useState('');
  const fullText = 'smaLLMs v2.1.0 - Small Language Model Benchmarking Platform';

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const typeTimer = setTimeout(() => {
      if (typedText.length < fullText.length) {
        setTypedText(fullText.slice(0, typedText.length + 1));
      }
    }, 50);
    return () => clearTimeout(typeTimer);
  }, [typedText, fullText]);

  const { execution_summary, model_analysis, rankings, cost_breakdown } = benchmarkData;

  // Prepare chart data
  const accuracyData = Object.entries(model_analysis).map(([model, data]) => ({
    model: model.split('/')[1]?.substring(0, 12) || model.substring(0, 12),
    accuracy: (data.avg_accuracy * 100).toFixed(1),
    cost: data.total_cost,
    latency: data.avg_latency.toFixed(0)
  }));

  const costData = Object.entries(cost_breakdown).map(([model, cost]) => ({
    name: model.split('/')[1]?.substring(0, 10) || model.substring(0, 10),
    value: cost,
    percentage: ((cost / execution_summary.total_cost) * 100).toFixed(1)
  }));

  const COLORS = ['#00ff00', '#00ffff', '#ffff00', '#ff00ff', '#ff8000'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 border border-green-400 p-2 text-green-400 text-xs">
          <p className="text-cyan-400">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey}: {entry.value}
              {entry.dataKey === 'accuracy' && '%'}
              {entry.dataKey === 'cost' && ' USD'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-black text-green-400 p-4">
      {/* Terminal Header */}
      <div className="border border-green-400 bg-gray-900 mb-4">
        <div className="bg-green-400 text-black px-4 py-2 flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4" />
            <span className="font-bold">smaLLMs Terminal Dashboard</span>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span>{currentTime.toLocaleTimeString()}</span>
            <a href="https://github.com/mmdmcy/smaLLMs" target="_blank" rel="noopener noreferrer" className="hover:underline">
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
        
        <div className="p-4">
          <div className="text-cyan-400 mb-2">
            $ ./smaLLMs --status --dashboard
          </div>
          <div className="text-green-400">
            {typedText}<span className="animate-pulse">█</span>
          </div>
          <div className="text-yellow-400 text-sm mt-1">
            [INFO] Benchmark evaluation completed successfully
          </div>
        </div>
      </div>

      {/* Main Dashboard Grid */}
      <div className="grid grid-cols-12 gap-4 h-[calc(100vh-200px)]">
        
        {/* Left Column - Stats & Rankings */}
        <div className="col-span-4 space-y-4">
          
          {/* Execution Summary */}
          <div className="border border-green-400 bg-gray-900 p-4 h-48">
            <div className="text-cyan-400 mb-3 flex items-center">
              <Activity className="w-4 h-4 mr-2" />
              EXECUTION_SUMMARY
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-gray-400">TOTAL_EVALS:</div>
                <div className="text-green-400 font-bold text-lg">{execution_summary.total_evaluations}</div>
              </div>
              <div>
                <div className="text-gray-400">TOTAL_COST:</div>
                <div className="text-yellow-400 font-bold text-lg">${execution_summary.total_cost.toFixed(4)}</div>
              </div>
              <div>
                <div className="text-gray-400">EXEC_TIME:</div>
                <div className="text-cyan-400 font-bold text-lg">{execution_summary.total_time_minutes.toFixed(1)}m</div>
              </div>
              <div>
                <div className="text-gray-400">AVG_COST:</div>
                <div className="text-magenta-400 font-bold text-lg">${execution_summary.avg_cost_per_eval.toFixed(4)}</div>
              </div>
            </div>
            <div className="mt-4 text-xs">
              <div className="text-gray-400">TIMESTAMP: {new Date(execution_summary.timestamp).toLocaleString()}</div>
              <div className="text-green-400">STATUS: ✓ COMPLETED</div>
            </div>
          </div>

          {/* Performance Rankings */}
          <div className="border border-green-400 bg-gray-900 p-4 flex-1">
            <div className="text-cyan-400 mb-3 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              PERFORMANCE_RANKINGS
            </div>
            <div className="space-y-2 text-sm">
              {rankings.performance.slice(0, 3).map(([model, data], index) => (
                <div key={model} className="flex items-center justify-between border-b border-gray-700 pb-2">
                  <div className="flex items-center space-x-2">
                    <span className={`w-6 h-6 flex items-center justify-center rounded text-xs font-bold ${
                      index === 0 ? 'bg-yellow-400 text-black' : 
                      index === 1 ? 'bg-gray-400 text-black' : 'bg-orange-400 text-black'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-green-400 truncate w-24">
                      {model.split('/')[1]?.substring(0, 12) || model.substring(0, 12)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-cyan-400 font-bold">{(data.avg_accuracy * 100).toFixed(1)}%</div>
                    <div className="text-gray-400 text-xs">${data.total_cost.toFixed(3)}</div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-4 text-xs">
              <div className="text-yellow-400">BEST_PERFORMER: {rankings.performance[0][0].split('/')[1]}</div>
              <div className="text-green-400">COST_LEADER: {rankings.cost_efficiency[0][0].split('/')[1]}</div>
            </div>
          </div>
        </div>

        {/* Center Column - Charts */}
        <div className="col-span-5 space-y-4">
          
          {/* Accuracy Chart */}
          <div className="border border-green-400 bg-gray-900 p-4 h-64">
            <div className="text-cyan-400 mb-3 flex items-center">
              <Target className="w-4 h-4 mr-2" />
              ACCURACY_COMPARISON
            </div>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={accuracyData}>
                <XAxis 
                  dataKey="model" 
                  tick={{ fontSize: 10, fill: '#4ade80' }}
                  axisLine={{ stroke: '#22c55e' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#4ade80' }}
                  axisLine={{ stroke: '#22c55e' }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="accuracy" fill="#00ff00" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Cost Distribution */}
          <div className="border border-green-400 bg-gray-900 p-4 flex-1">
            <div className="text-cyan-400 mb-3 flex items-center">
              <DollarSign className="w-4 h-4 mr-2" />
              COST_DISTRIBUTION
            </div>
            <div className="flex items-center h-32">
              <div className="w-32 h-32">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={costData}
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      dataKey="value"
                    >
                      {costData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 ml-4 space-y-1 text-xs">
                {costData.map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      ></div>
                      <span className="text-green-400 w-20 truncate">{entry.name}</span>
                    </div>
                    <span className="text-yellow-400">${parseFloat(entry.value.toString()).toFixed(3)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Detailed Results & System Info */}
        <div className="col-span-3 space-y-4">
          
          {/* System Status */}
          <div className="border border-green-400 bg-gray-900 p-4 h-32">
            <div className="text-cyan-400 mb-3 flex items-center">
              <Zap className="w-4 h-4 mr-2" />
              SYSTEM_STATUS
            </div>
            <div className="text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-400">CPU:</span>
                <span className="text-green-400">█████████░ 90%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MEM:</span>
                <span className="text-yellow-400">███████░░░ 70%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">API:</span>
                <span className="text-green-400">CONNECTED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">MODELS:</span>
                <span className="text-cyan-400">{Object.keys(model_analysis).length} LOADED</span>
              </div>
            </div>
          </div>

          {/* Model Details */}
          <div className="border border-green-400 bg-gray-900 p-4 flex-1">
            <div className="text-cyan-400 mb-3 flex items-center">
              <Clock className="w-4 h-4 mr-2" />
              MODEL_METRICS
            </div>
            <div className="space-y-3 text-xs">
              {Object.entries(model_analysis).map(([model, data]) => (
                <div key={model} className="border-b border-gray-700 pb-2">
                  <div className="text-green-400 font-bold mb-1 truncate">
                    {model.split('/')[1] || model}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-gray-400">ACC:</span>
                      <span className="text-cyan-400 ml-1">{(data.avg_accuracy * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                      <span className="text-gray-400">LAT:</span>
                      <span className="text-yellow-400 ml-1">{data.avg_latency.toFixed(0)}ms</span>
                    </div>
                    <div>
                      <span className="text-gray-400">COST:</span>
                      <span className="text-green-400 ml-1">${data.total_cost.toFixed(3)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">VAL:</span>
                      <span className="text-magenta-400 ml-1">{data.value_score.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Terminal Commands */}
      <div className="border border-green-400 bg-gray-900 p-4 mt-4">
        <div className="grid grid-cols-3 gap-8 text-sm">
          <div>
            <div className="text-cyan-400 mb-2">$ ./smaLLMs --info</div>
            <div className="text-xs space-y-1">
              <div className="text-green-400">✓ Enterprise-grade benchmarking platform</div>
              <div className="text-green-400">✓ Small Language Models (1B-7B params)</div>
              <div className="text-green-400">✓ One command setup: python smaLLMs.py</div>
              <div className="text-green-400">✓ Cost-optimized with intelligent sampling</div>
            </div>
          </div>
          
          <div>
            <div className="text-cyan-400 mb-2">$ ./smaLLMs --features</div>
            <div className="text-xs space-y-1">
              <div className="text-yellow-400">⚡ Lightning fast: ~2 min demos</div>
              <div className="text-yellow-400">💰 Cost efficient: $0.03 - $0.60</div>
              <div className="text-yellow-400">🎯 Production ready: Reliable models only</div>
              <div className="text-yellow-400">📊 Beautiful exports: HTML, JSON, CSV</div>
            </div>
          </div>
          
          <div>
            <div className="text-cyan-400 mb-2">$ ./smaLLMs --presets</div>
            <div className="text-xs space-y-1">
              <div className="text-magenta-400">Lightning: 3 models, 10 samples, $0.03</div>
              <div className="text-magenta-400">Quick: 5 models, 25 samples, $0.08</div>
              <div className="text-magenta-400">Standard: 8 models, 50 samples, $0.25</div>
              <div className="text-magenta-400">Comprehensive: 12 models, 100 samples, $0.60</div>
            </div>
          </div>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-700">
          <div className="flex items-center justify-between text-xs">
            <div className="text-gray-400">
              smaLLMs © 2025 • MIT License • Built by 
              <a href="https://github.com/mmdmcy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline ml-1">
                mmdmcy
              </a>
            </div>
            <div className="text-green-400">
              Ready for next evaluation...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TerminalDashboard;