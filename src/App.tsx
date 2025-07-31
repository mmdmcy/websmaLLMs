import React from 'react';
import TerminalHeader from './components/TerminalHeader';
import ExecutionSummary from './components/ExecutionSummary';
import ModelPerformance from './components/ModelPerformance';
import CostAnalysis from './components/CostAnalysis';
import BenchmarkDetails from './components/BenchmarkDetails';
import SystemInfo from './components/SystemInfo';

function App() {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <TerminalHeader />
      <div className="container mx-auto px-6 py-4 space-y-8">
        <ExecutionSummary />
        <ModelPerformance />
        <CostAnalysis />
        <BenchmarkDetails />
        <SystemInfo />
      </div>
    </div>
  );
}

export default App;