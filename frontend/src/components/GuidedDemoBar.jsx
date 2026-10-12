import React, { useState } from 'react';
import { Play, Sparkles, ArrowRight, ShieldCheck, Zap, RotateCcw, Check, HelpCircle } from 'lucide-react';

export function GuidedDemoBar({ actions, config, status, isBusy }) {
  const [currentStep, setCurrentStep] = useState(0);

  const demoSteps = [
    {
      title: 'Stage 1: High-Load FIFO Baseline (Bufferbloat Onset)',
      actionText: 'Configure Baseline & Run',
      preset: 'high',
      mode: 'baseline',
      explanation:
        'Injects 82 Mbps of offered traffic across 6 contending stations into a 50 Mbps Wi-Fi bottleneck under standard FIFO scheduling. All packets share a single queue in arrival order. Notice how the buffer fills to 100%, causing ~70-90 ms delay and indiscriminate packet drops for real-time video/voice.',
    },
    {
      title: 'Stage 2: Static QoS (Strict Priority Scheduling)',
      actionText: 'Switch to Static QoS & Run',
      preset: 'high',
      mode: 'static_qos',
      explanation:
        'Real-time traffic is evacuated first, reducing video/voice latency down to ~8-15 ms. However, best-effort and bulk queues are completely starved during continuous heavy load, causing 100% loss for background flows.',
    },
    {
      title: 'Stage 3: Adaptive Closed-Loop QoS (Dynamic Throttling & Recovery)',
      actionText: 'Activate Adaptive QoS & Run',
      preset: 'high',
      mode: 'adaptive_qos',
      explanation:
        'Under normal load, Weighted Fair Queueing (WFQ) prevents bulk starvation. Once sustained congestion is detected, the controller dynamically clamps bulk traffic to a 20% quota and protects voice/video. Once traffic eases, hysteresis verifies health for 10 steps before restoring full capacity.',
    },
  ];

  const current = demoSteps[currentStep];

  const handleRunStage = async () => {
    // 1. Reset simulation
    await actions.reset();
    // 2. Set preset and mode
    await actions.setPreset(current.preset, current.mode);
    // 3. Start simulation
    await actions.start();
  };

  return (
    <div className="rounded-2xl bg-gradient-to-r from-indigo-950/80 via-slate-900/90 to-sky-950/80 border border-indigo-500/40 p-4 sm:p-5 shadow-2xl backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Guided Experiment Demonstration Walkthrough
            </h4>
            <span className="text-[11px] text-slate-400">
              Interactive 3-stage validation of Wi-Fi congestion and adaptive QoS optimization.
            </span>
          </div>
        </div>

        {/* Stepper buttons */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800">
          {demoSteps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStep(idx)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                currentStep === idx
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Stage {idx + 1}
            </button>
          ))}
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 mb-3">
        <div className="text-xs font-bold text-sky-400 mb-1">{current.title}</div>
        <p className="text-xs text-slate-300 leading-relaxed">{current.explanation}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="text-[11px] text-slate-400">
          Target: <b className="text-slate-200">{current.preset.toUpperCase()} Load (82 Mbps)</b> &bull; Mode: <b className="text-indigo-400">{current.mode.toUpperCase()}</b>
        </div>

        <div className="flex items-center gap-2">
          {currentStep > 0 && (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Previous
            </button>
          )}

          <button
            onClick={handleRunStage}
            disabled={isBusy}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {current.actionText}
          </button>

          {currentStep < demoSteps.length - 1 && (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            >
              Next <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
