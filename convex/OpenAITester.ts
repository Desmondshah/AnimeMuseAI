// convex/OpenAITester.ts - OpenAI Integration with Performance Optimization
import { useCallback, useRef, useState, useEffect } from 'react';
import { usePerformanceMonitor } from './optimizationUtils';
import { useIntelligentCache } from './storageActions';
import { useHapticFeedback } from './iPad-hooks';

interface OpenAITestConfig {
  model: string;
  temperature: number;
  maxTokens: number;
  useCache: boolean;
  enablePerformanceOptimization: boolean;
}

interface OpenAIResponse {
  success: boolean;
  data?: any;
  error?: string;
  performanceMetrics?: {
    responseTime: number;
    tokenCount: number;
    cacheHit: boolean;
  };
}

export class OpenAITester {
  private apiKey: string;
  private baseUrl: string;
  private cache?: any;
  private performanceMonitor?: any;
  private haptics?: any;

  constructor(
    apiKey: string, 
    cache?: any, 
    performanceMonitor?: any, 
    haptics?: any
  ) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.openai.com/v1';
    this.cache = cache;
    this.performanceMonitor = performanceMonitor;
    this.haptics = haptics;
  }

  async testChatCompletion(
    prompt: string, 
    config: Partial<OpenAITestConfig> = {}
  ): Promise<OpenAIResponse> {
    const startTime = performance.now();
    const cacheKey = `openai_chat_${this.hashString(prompt)}_${JSON.stringify(config)}`;
    
    // Check cache first if enabled
    if (config.useCache && this.cache) {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        this.haptics?.triggerSuccess();
        return {
          success: true,
          data: cachedResponse,
          performanceMetrics: {
            responseTime: performance.now() - startTime,
            tokenCount: cachedResponse.usage?.total_tokens || 0,
            cacheHit: true
          }
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: config.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: config.temperature ?? 0.7,
          max_tokens: config.maxTokens || 150
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = performance.now() - startTime;

      // Cache the response
      if (config.useCache && this.cache) {
        this.cache.set(cacheKey, data, 30 * 60 * 1000); // 30 minutes TTL
      }

      this.haptics?.triggerSuccess();

      return {
        success: true,
        data,
        performanceMetrics: {
          responseTime,
          tokenCount: data.usage?.total_tokens || 0,
          cacheHit: false
        }
      };

    } catch (error) {
      this.haptics?.triggerError();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performanceMetrics: {
          responseTime: performance.now() - startTime,
          tokenCount: 0,
          cacheHit: false
        }
      };
    }
  }

  async testImageGeneration(
    prompt: string,
    size: '256x256' | '512x512' | '1024x1024' = '512x512'
  ): Promise<OpenAIResponse> {
    const startTime = performance.now();
    const cacheKey = `openai_image_${this.hashString(prompt)}_${size}`;

    // Check cache
    if (this.cache) {
      const cachedResponse = this.cache.get(cacheKey);
      if (cachedResponse) {
        this.haptics?.triggerSuccess();
        return {
          success: true,
          data: cachedResponse,
          performanceMetrics: {
            responseTime: performance.now() - startTime,
            tokenCount: 0,
            cacheHit: true
          }
        };
      }
    }

    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          n: 1,
          size
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = performance.now() - startTime;

      // Cache the response
      if (this.cache) {
        this.cache.set(cacheKey, data, 60 * 60 * 1000); // 1 hour TTL for images
      }

      this.haptics?.triggerSuccess();

      return {
        success: true,
        data,
        performanceMetrics: {
          responseTime,
          tokenCount: 0,
          cacheHit: false
        }
      };

    } catch (error) {
      this.haptics?.triggerError();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performanceMetrics: {
          responseTime: performance.now() - startTime,
          tokenCount: 0,
          cacheHit: false
        }
      };
    }
  }

  async testModeration(text: string): Promise<OpenAIResponse> {
    const startTime = performance.now();
    
    try {
      const response = await fetch(`${this.baseUrl}/moderations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input: text })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const responseTime = performance.now() - startTime;

      return {
        success: true,
        data,
        performanceMetrics: {
          responseTime,
          tokenCount: 0,
          cacheHit: false
        }
      };

    } catch (error) {
      this.haptics?.triggerError();
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        performanceMetrics: {
          responseTime: performance.now() - startTime,
          tokenCount: 0,
          cacheHit: false
        }
      };
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  getCacheStats() {
    return this.cache?.getStats() || null;
  }

  clearCache() {
    this.cache?.clear();
  }
}

export const useOpenAITester = (apiKey?: string) => {
  const [tester, setTester] = useState<OpenAITester | null>(null);
  const cache = useIntelligentCache();
  const { monitor } = usePerformanceMonitor();
  const { triggerSuccess, triggerError } = useHapticFeedback();

  useEffect(() => {
    if (apiKey) {
      const newTester = new OpenAITester(apiKey, cache, monitor, { triggerSuccess, triggerError });
      setTester(newTester);
    }
  }, [apiKey, cache, monitor, triggerSuccess, triggerError]);

  const testChatCompletion = useCallback(async (
    prompt: string, 
    config?: Partial<OpenAITestConfig>
  ) => {
    if (!tester) {
      throw new Error('OpenAI tester not initialized - API key required');
    }
    return await tester.testChatCompletion(prompt, config);
  }, [tester]);

  const testImageGeneration = useCallback(async (
    prompt: string,
    size?: '256x256' | '512x512' | '1024x1024'
  ) => {
    if (!tester) {
      throw new Error('OpenAI tester not initialized - API key required');
    }
    return await tester.testImageGeneration(prompt, size);
  }, [tester]);

  const testModeration = useCallback(async (text: string) => {
    if (!tester) {
      throw new Error('OpenAI tester not initialized - API key required');
    }
    return await tester.testModeration(text);
  }, [tester]);

  return {
    tester,
    testChatCompletion,
    testImageGeneration,
    testModeration,
    isReady: !!tester,
    getCacheStats: () => tester?.getCacheStats(),
    clearCache: () => tester?.clearCache()
  };
};
