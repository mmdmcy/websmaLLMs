import React, { useState, useEffect } from 'react';
import { Terminal, Github, Clock } from 'lucide-react';

const TerminalHeader: React.FC = () => {
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

  return (
    <div className="border-b-2 border-green-400 bg-gray-900">
      {/* Terminal Title Bar */}
      <div className="bg-green-400 text-black px-6 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <Terminal className="w-5 h-5" />
          <span className="font-bold text-lg">smaLLMs Terminal Dashboard</span>
        </div>
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4" />
            <span className="font-mono">{currentTime.toLocaleTimeString()}</span>
          </div>
          <a 
            href="https://github.com/mmdmcy/smaLLMs" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:underline transition-all"
          >
            <Github className="w-4 h-4" />
            <span>GitHub</span>
          </a>
        </div>
      </div>

      {/* Terminal Command Line */}
      <div className="px-6 py-4 bg-black">
        <div className="text-cyan-400 mb-2">
          <span className="text-yellow-400">user@smaLLMs:~$</span> ./smaLLMs --dashboard --status
        </div>
        <div className="text-green-400 text-lg">
          {typedText}<span className="animate-pulse text-white">█</span>
        </div>
        <div className="text-yellow-400 text-sm mt-2">
          [INFO] Benchmark evaluation completed successfully • Results loaded • Dashboard ready
        </div>
      </div>
    </div>
  );
};

export default TerminalHeader;