import React from 'react';
import { Info, Github, Zap, DollarSign, Clock, Target } from 'lucide-react';

const SystemInfo: React.FC = () => {
  const features = [
    { icon: Zap, text: 'Lightning fast: ~2 min demos', color: 'text-yellow-400' },
    { icon: DollarSign, text: 'Cost efficient: $0.03 - $0.60', color: 'text-green-400' },
    { icon: Target, text: 'Production ready: Reliable models only', color: 'text-cyan-400' },
    { icon: Clock, text: 'Beautiful exports: HTML, JSON, CSV', color: 'text-purple-400' }
  ];

  const presets = [
    { name: 'Lightning', models: 3, samples: 10, cost: '$0.03', desc: 'Perfect for testing' },
    { name: 'Quick', models: 5, samples: 25, cost: '$0.08', desc: 'Rapid benchmarking' },
    { name: 'Standard', models: 8, samples: 50, cost: '$0.25', desc: 'Comprehensive evaluation' },
    { name: 'Comprehensive', models: 12, samples: 100, cost: '$0.60', desc: 'Full enterprise evaluation' }
  ];

  return (
    <div className="border border-green-400 bg-gray-900 p-6">
      <div className="flex items-center space-x-3 mb-6">
        <Info className="w-5 h-5 text-cyan-400" />
        <h2 className="text-xl text-cyan-400 font-bold">SYSTEM_INFO</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* About smaLLMs */}
        <div className="border border-gray-600 bg-black p-4">
          <div className="text-cyan-400 mb-3 flex items-center">
            <span className="text-yellow-400">$</span>
            <span className="ml-2">./smaLLMs --info</span>
          </div>
          <div className="space-y-2 text-sm">
            <div className="text-green-400">✓ Enterprise-grade benchmarking platform</div>
            <div className="text-green-400">✓ Small Language Models (1B-7B params)</div>
            <div className="text-green-400">✓ One command setup: python smaLLMs.py</div>
            <div className="text-green-400">✓ Cost-optimized with intelligent sampling</div>
          </div>
          
          <div className="mt-4 pt-3 border-t border-gray-700">
            <div className="space-y-2">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center space-x-2 text-xs">
                  <feature.icon className={`w-3 h-3 ${feature.color}`} />
                  <span className={feature.color}>{feature.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Evaluation Presets */}
        <div className="border border-gray-600 bg-black p-4">
          <div className="text-cyan-400 mb-3 flex items-center">
            <span className="text-yellow-400">$</span>
            <span className="ml-2">./smaLLMs --presets</span>
          </div>
          <div className="space-y-3">
            {presets.map((preset, index) => (
              <div key={index} className="border-b border-gray-700 pb-2 last:border-b-0">
                <div className="flex justify-between items-start mb-1">
                  <span className="text-purple-400 font-bold text-sm">{preset.name}:</span>
                  <span className="text-yellow-400 text-sm">{preset.cost}</span>
                </div>
                <div className="text-xs text-gray-400">
                  {preset.models} models, {preset.samples} samples
                </div>
                <div className="text-xs text-green-400">{preset.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Start */}
        <div className="border border-gray-600 bg-black p-4">
          <div className="text-cyan-400 mb-3 flex items-center">
            <span className="text-yellow-400">$</span>
            <span className="ml-2">./smaLLMs --quickstart</span>
          </div>
          <div className="space-y-2 text-xs">
            <div className="text-gray-400"># Clone repository</div>
            <div className="text-green-400">git clone https://github.com/mmdmcy/smaLLMs.git</div>
            
            <div className="text-gray-400 mt-3"># Install dependencies</div>
            <div className="text-green-400">pip install -r requirements.txt</div>
            
            <div className="text-gray-400 mt-3"># Run evaluation</div>
            <div className="text-green-400">python smaLLMs.py</div>
            
            <div className="text-gray-400 mt-3"># Export results</div>
            <div className="text-green-400">python simple_exporter.py</div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-700">
            <a 
              href="https://github.com/mmdmcy/smaLLMs" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-cyan-400 hover:text-green-400 transition-colors text-sm"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
            </a>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-600 text-center">
        <div className="text-xs text-gray-400">
          smaLLMs © 2025 • MIT License • Built by{' '}
          <a 
            href="https://github.com/mmdmcy" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-green-400 transition-colors"
          >
            mmdmcy
          </a>
        </div>
        <div className="text-green-400 text-sm mt-2">
          Ready for next evaluation...
        </div>
      </div>
    </div>
  );
};

export default SystemInfo;