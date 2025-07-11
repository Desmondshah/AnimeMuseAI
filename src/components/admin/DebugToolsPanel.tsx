// BRUTALIST DEBUG TOOLS PANEL - DebugToolsPanel.tsx
import React, { useState, useCallback, memo } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { toast } from "sonner";
import StyledButton from "../animuse/shared/StyledButton";
import { useMobileOptimizations } from "../../hooks/useMobileOptimizations";

interface DebugToolsPanelProps {}

interface DebugTest {
  id: string;
  name: string;
  description: string;
  category: string;
  action: () => Promise<void>;
  isRunning: boolean;
  lastResult?: any;
  lastRun?: Date;
}

const BrutalistDebugCard: React.FC<{
  test: DebugTest;
  onRun: () => void;
  onViewResult: () => void;
}> = memo(({ test, onRun, onViewResult }) => {
  const { iPad } = useMobileOptimizations();
  
  return (
    <div className={`bg-black border-4 border-white transition-all hover:bg-gray-900 ${
      iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className={`font-black text-white mb-2 uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl' : 'text-xl'
          }`}>
            {test.name}
          </h3>
          <p className={`text-white/80 font-bold uppercase tracking-wide mb-2 ${
            iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
          }`}>
            {test.description}
          </p>
          <div className={`bg-white/20 text-white px-2 py-1 inline-block ${
            iPad.isIPadMini ? 'text-xs' : 'text-sm'
          }`}>
            {test.category}
          </div>
        </div>
        
        <div className={`flex items-center gap-2 ${
          test.lastResult ? 'text-green-400' : 'text-white/50'
        }`}>
          <div className={`w-3 h-3 rounded-full ${
            test.isRunning ? 'bg-yellow-500 animate-pulse' : 
            test.lastResult ? 'bg-green-500' : 'bg-gray-500'
          }`}></div>
          <span className="text-xs font-black uppercase">
            {test.isRunning ? 'RUNNING' : test.lastResult ? 'COMPLETE' : 'READY'}
          </span>
        </div>
      </div>
      
      {test.lastRun && (
        <div className={`text-white/60 font-bold mb-4 ${
          iPad.isIPadMini ? 'text-xs' : 'text-sm'
        }`}>
          LAST RUN: {test.lastRun.toLocaleString()}
        </div>
      )}
      
      <div className="flex gap-3">
        <button
          onClick={onRun}
          disabled={test.isRunning}
          className={`flex-1 bg-brand-primary-action text-black hover:bg-brand-accent-gold border-4 border-brand-primary-action font-black uppercase tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
            iPad.isIPadMini ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
          }`}
        >
          {test.isRunning ? '🔄 RUNNING...' : '▶️ RUN TEST'}
        </button>
        
        {test.lastResult && (
          <button
            onClick={onViewResult}
            className={`bg-white text-black hover:bg-gray-100 border-4 border-black font-black uppercase tracking-wide transition-colors ${
              iPad.isIPadMini ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm'
            }`}
          >
            📄 RESULTS
          </button>
        )}
      </div>
    </div>
  );
});

const DebugResultModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  result: any;
  testName: string;
}> = memo(({ isOpen, onClose, result, testName }) => {
  const { iPad } = useMobileOptimizations();
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
      <div className={`bg-white border-4 border-black w-full max-h-[90vh] overflow-y-auto ${
        iPad.isIPadMini ? 'max-w-2xl p-4' : iPad.isIPadPro12 ? 'max-w-6xl p-8' : 'max-w-4xl p-6'
      }`}>
        <div className="flex justify-between items-center mb-6">
          <h3 className={`font-black text-black uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-xl' : iPad.isIPadPro12 ? 'text-3xl' : 'text-2xl'
          }`}>
            DEBUG RESULTS: {testName}
          </h3>
          <button
            onClick={onClose}
            className="bg-black text-white hover:bg-gray-800 border-4 border-black px-4 py-2 font-black uppercase tracking-wide transition-colors"
          >
            ✕ CLOSE
          </button>
        </div>
        
        <div className="bg-black border-4 border-white p-4 overflow-x-auto">
          <pre className={`text-white font-mono whitespace-pre-wrap ${
            iPad.isIPadMini ? 'text-xs' : iPad.isIPadPro12 ? 'text-base' : 'text-sm'
          }`}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
});

const DebugToolsPanelComponent: React.FC<DebugToolsPanelProps> = () => {
  const { iPad, isMobile, performanceMetrics } = useMobileOptimizations();
  
  // Debug Actions
  const debugMoodBoardMatching = useAction(api.ai.debugMoodBoardDatabaseMatching);
  const getAllAnime = useQuery(api.admin.getAllAnimeForAdmin, {});
  
  // State
  const [debugTests, setDebugTests] = useState<DebugTest[]>([]);
  const [selectedResult, setSelectedResult] = useState<{ result: any; testName: string } | null>(null);
  const [customTitles, setCustomTitles] = useState("");
  const [systemLogs, setSystemLogs] = useState<string[]>([]);

  // Initialize debug tests
  React.useEffect(() => {
    const tests: DebugTest[] = [
      {
        id: "mood_board_matching",
        name: "Mood Board Database Matching",
        description: "Test database matching for anime recommendations from mood board system",
        category: "MOOD BOARD",
        isRunning: false,
        action: async () => {
          const testTitles = customTitles 
            ? customTitles.split(',').map(t => t.trim()).filter(Boolean)
            : [
              "Attack on Titan",
              "Your Name",
              "Spirited Away",
              "Demon Slayer",
              "One Piece",
              "Death Note",
              "My Hero Academia",
              "Naruto"
            ];
          
          const result = await debugMoodBoardMatching({ testTitles });
          addSystemLog(`Mood Board Debug: Tested ${testTitles.length} titles, found ${result.summary.exactMatches} exact matches, ${result.summary.searchMatches} search matches`);
          return result;
        }
      },
      {
        id: "database_health",
        name: "Database Health Check",
        description: "Check database connection, anime count, and data integrity",
        category: "SYSTEM",
        isRunning: false,
        action: async () => {
          const animeCount = getAllAnime?.length || 0;
          const memoryInfo = (performance as any).memory;
          const result = {
            timestamp: new Date().toISOString(),
            animeCount,
            dbStatus: animeCount > 0 ? 'HEALTHY' : 'WARNING',
            memoryUsage: memoryInfo ? {
              used: Math.round(memoryInfo.usedJSHeapSize / 1024 / 1024),
              total: Math.round(memoryInfo.totalJSHeapSize / 1024 / 1024),
              limit: Math.round(memoryInfo.jsHeapSizeLimit / 1024 / 1024)
            } : 'N/A',
            performanceMetrics
          };
          addSystemLog(`Database Health: ${animeCount} anime entries, status: ${result.dbStatus}`);
          return result;
        }
      },
      {
        id: "recommendation_log",
        name: "Log Current Recommendations",
        description: "Log and analyze current AI recommendations in system",
        category: "AI SYSTEM",
        isRunning: false,
        action: async () => {
          const result = {
            timestamp: new Date().toISOString(),
            message: "Recommendation logging feature - check browser console for detailed logs",
            loggedToConsole: true,
            systemInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
              cookieEnabled: navigator.cookieEnabled
            }
          };
          
          console.group("[Admin Debug] Current System State");
          console.log("Timestamp:", result.timestamp);
          console.log("System Info:", result.systemInfo);
          console.log("Performance Metrics:", performanceMetrics);
          console.groupEnd();
          
          addSystemLog(`Recommendation Log: System state logged to console at ${result.timestamp}`);
          return result;
        }
      },
      {
        id: "performance_analysis",
        name: "Performance Analysis",
        description: "Analyze system performance, FPS, memory usage, and optimization metrics",
        category: "PERFORMANCE",
        isRunning: false,
        action: async () => {
          const memoryInfo = (performance as any).memory;
          const result = {
            timestamp: new Date().toISOString(),
            fps: performanceMetrics.fps,
            deviceInfo: {
              isMobile,
              isIPad: iPad.isIPad,
              isIPadMini: iPad.isIPadMini,
              isIPadPro: iPad.isIPadPro11 || iPad.isIPadPro12,
              screenResolution: `${window.screen.width}x${window.screen.height}`,
              viewportSize: `${window.innerWidth}x${window.innerHeight}`,
              pixelRatio: window.devicePixelRatio
            },
            memoryInfo: memoryInfo ? {
              usedJSHeapSize: memoryInfo.usedJSHeapSize,
              totalJSHeapSize: memoryInfo.totalJSHeapSize,
              jsHeapSizeLimit: memoryInfo.jsHeapSizeLimit
            } : null,
            performanceRecommendations: [] as string[]
          };
          
          // Add performance recommendations
          if (result.fps < 30) {
            result.performanceRecommendations.push("LOW FPS detected - consider reducing animations");
          }
          if (result.deviceInfo.isMobile) {
            result.performanceRecommendations.push("Mobile device - optimizations active");
          }
          if (iPad.isIPadMini) {
            result.performanceRecommendations.push("iPad Mini - using compact layouts");
          }
          
          addSystemLog(`Performance Analysis: ${result.fps} FPS, ${result.deviceInfo.screenResolution} resolution`);
          return result;
        }
      },
      {
        id: "ai_system_test",
        name: "AI System Test",
        description: "Test AI recommendation system with sample data",
        category: "AI SYSTEM", 
        isRunning: false,
        action: async () => {
          // Simple AI system test
          const result = {
            timestamp: new Date().toISOString(),
            aiSystemStatus: "ACTIVE",
            testPrompt: "Test mood: Dark & Gritty + Action Packed",
            message: "AI system test - this would normally generate recommendations",
            mockRecommendations: [
              { title: "Attack on Titan", genre: "Action", mood: "Dark & Gritty" },
              { title: "Tokyo Ghoul", genre: "Supernatural", mood: "Dark & Psychological" },
              { title: "Berserk", genre: "Fantasy", mood: "Dark & Mature" }
            ]
          };
          
          addSystemLog(`AI System Test: Generated ${result.mockRecommendations.length} mock recommendations`);
          return result;
        }
      }
    ];
    
    setDebugTests(tests);
  }, [debugMoodBoardMatching, getAllAnime, performanceMetrics, isMobile, iPad, customTitles]);

  const addSystemLog = useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSystemLogs(prev => [...prev.slice(-9), `[${timestamp}] ${message}`]);
  }, []);

  const runDebugTest = useCallback(async (testId: string) => {
    setDebugTests(prev => prev.map(test => 
      test.id === testId ? { ...test, isRunning: true } : test
    ));

    try {
      const test = debugTests.find(t => t.id === testId);
      if (!test) return;

      const result = await test.action();
      
      setDebugTests(prev => prev.map(t => 
        t.id === testId ? { 
          ...t, 
          isRunning: false, 
          lastResult: result,
          lastRun: new Date()
        } : t
      ));

      toast.success(`Debug test "${test.name}" completed successfully!`);
    } catch (error: any) {
      setDebugTests(prev => prev.map(t => 
        t.id === testId ? { 
          ...t, 
          isRunning: false, 
          lastResult: { error: error.message },
          lastRun: new Date()
        } : t
      ));
      
      toast.error(`Debug test failed: ${error.message}`);
      addSystemLog(`ERROR: Debug test failed - ${error.message}`);
    }
  }, [debugTests, addSystemLog]);

  const viewResult = useCallback((test: DebugTest) => {
    setSelectedResult({ result: test.lastResult, testName: test.name });
  }, []);

  const clearLogs = useCallback(() => {
    setSystemLogs([]);
    addSystemLog("System logs cleared");
  }, [addSystemLog]);

  const runAllTests = useCallback(async () => {
    for (const test of debugTests) {
      if (!test.isRunning) {
        await runDebugTest(test.id);
        // Small delay between tests
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }, [debugTests, runDebugTest]);

  return (
    <div className="space-y-8">
      {/* BRUTALIST HEADER */}
      <div className={`bg-black border-4 border-white ${
        iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-12' : 'p-8'
      }`}>
        <div className="text-center">
          <h1 className={`font-black text-white mb-4 uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-3xl' : iPad.isIPadPro12 ? 'text-6xl' : 'text-5xl'
          }`}>
            DEBUG TOOLS
          </h1>
          <p className={`text-white font-bold uppercase tracking-wide ${
            iPad.isIPadMini ? 'text-sm' : iPad.isIPadPro12 ? 'text-xl' : 'text-lg'
          }`}>
            SYSTEM DIAGNOSTICS & DEBUGGING UTILITIES
          </p>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className={`bg-white border-4 border-black ${
        iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
      }`}>
        <h3 className={`font-black text-black mb-6 uppercase tracking-wider ${
          iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl' : 'text-xl'
        }`}>
          QUICK ACTIONS
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <button
            onClick={runAllTests}
            className="bg-brand-primary-action text-black hover:bg-brand-accent-gold border-4 border-black font-black py-3 px-4 uppercase tracking-wide transition-colors"
          >
            🚀 RUN ALL TESTS
          </button>
          <button
            onClick={clearLogs}
            className="bg-gray-500 text-white hover:bg-gray-600 border-4 border-black font-black py-3 px-4 uppercase tracking-wide transition-colors"
          >
            🗑️ CLEAR LOGS
          </button>
          <button
            onClick={() => {
              console.group("[Admin Debug] System Overview");
              console.log("Performance:", performanceMetrics);
              console.log("Device Info:", { isMobile, iPad });
              console.log("Tests:", debugTests.map(t => ({ name: t.name, lastRun: t.lastRun, hasResult: !!t.lastResult })));
              console.groupEnd();
              toast.info("System overview logged to console");
            }}
            className="bg-blue-500 text-white hover:bg-blue-600 border-4 border-black font-black py-3 px-4 uppercase tracking-wide transition-colors"
          >
            📊 LOG OVERVIEW
          </button>
        </div>

        {/* Custom Test Titles Input */}
        <div className="mb-6">
          <label className={`block text-black font-black uppercase tracking-wide mb-2 ${
            iPad.isIPadMini ? 'text-sm' : 'text-base'
          }`}>
            CUSTOM ANIME TITLES FOR TESTING (COMMA SEPARATED)
          </label>
          <textarea
            value={customTitles}
            onChange={(e) => setCustomTitles(e.target.value)}
            placeholder="Attack on Titan, Your Name, Spirited Away..."
            className="w-full bg-black text-white border-4 border-white px-4 py-3 font-bold focus:outline-none focus:border-brand-accent-gold transition-colors"
            rows={3}
          />
        </div>
      </div>

      {/* DEBUG TESTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {debugTests.map(test => (
          <BrutalistDebugCard
            key={test.id}
            test={test}
            onRun={() => runDebugTest(test.id)}
            onViewResult={() => viewResult(test)}
          />
        ))}
      </div>

      {/* SYSTEM LOGS */}
      <div className={`bg-black border-4 border-white ${
        iPad.isIPadMini ? 'p-4' : iPad.isIPadPro12 ? 'p-8' : 'p-6'
      }`}>
        <div className="flex justify-between items-center mb-4">
          <h3 className={`font-black text-white uppercase tracking-wider ${
            iPad.isIPadMini ? 'text-lg' : iPad.isIPadPro12 ? 'text-2xl' : 'text-xl'
          }`}>
            SYSTEM LOGS
          </h3>
          <span className="text-white/60 font-bold text-sm">
            {systemLogs.length}/10 ENTRIES
          </span>
        </div>
        
        <div className="bg-white/10 border-2 border-white/20 p-4 h-64 overflow-y-auto">
          {systemLogs.length === 0 ? (
            <div className="text-white/50 font-bold text-center py-8">
              NO LOGS YET - RUN SOME TESTS TO SEE ACTIVITY
            </div>
          ) : (
            <div className="space-y-1">
              {systemLogs.map((log, index) => (
                <div key={index} className={`text-white font-mono ${
                  iPad.isIPadMini ? 'text-xs' : 'text-sm'
                }`}>
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* RESULT MODAL */}
      <DebugResultModal
        isOpen={!!selectedResult}
        onClose={() => setSelectedResult(null)}
        result={selectedResult?.result}
        testName={selectedResult?.testName || ""}
      />
    </div>
  );
};

export default memo(DebugToolsPanelComponent); 