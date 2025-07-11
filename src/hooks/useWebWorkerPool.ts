// convex/useWebWorkerPool.ts - Web Worker Pool for iPhone CPU Optimization
import { useEffect, useRef, useCallback } from 'react';

interface WorkerTask {
  id: string;
  type: string;
  data: any;
  resolve: (result: any) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

interface WorkerPoolOptions {
  maxWorkers: number;
  taskTimeout: number;
  enableLogging: boolean;
}

export const useWebWorkerPool = (options: WorkerPoolOptions = {
  maxWorkers: 2,
  taskTimeout: 10000,
  enableLogging: false
}) => {
  const workersRef = useRef<Worker[]>([]);
  const tasksRef = useRef<Map<string, WorkerTask>>(new Map());
  const taskQueueRef = useRef<WorkerTask[]>([]);
  const availableWorkersRef = useRef<Set<number>>(new Set());

  const createWorker = useCallback((index: number): Worker => {
    const workerCode = `
      // High-performance worker for iPhone CPU optimization
      self.onmessage = function(e) {
        const { type, data, id } = e.data;
        
        try {
          switch (type) {
            case 'imageResize':
              handleImageResize(data, id);
              break;
            case 'imageCompress':
              handleImageCompress(data, id);
              break;
            case 'animationCalculation':
              handleAnimationCalculation(data, id);
              break;
            case 'dataProcessing':
              handleDataProcessing(data, id);
              break;
            case 'textProcessing':
              handleTextProcessing(data, id);
              break;
            default:
              self.postMessage({ id, error: 'Unknown task type: ' + type });
          }
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      };

      function handleImageResize({ imageData, width, height, quality = 0.8 }, id) {
        try {
          if (typeof OffscreenCanvas !== 'undefined') {
            const canvas = new OffscreenCanvas(width, height);
            const ctx = canvas.getContext('2d');
            
            if (ctx && imageData) {
              // Create ImageData from input
              const imgData = new ImageData(new Uint8ClampedArray(imageData.data), imageData.width, imageData.height);
              
              // Scale the image
              const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
              const tempCtx = tempCanvas.getContext('2d');
              tempCtx.putImageData(imgData, 0, 0);
              
              ctx.drawImage(tempCanvas, 0, 0, width, height);
              
              canvas.convertToBlob({ type: 'image/webp', quality }).then(blob => {
                const reader = new FileReader();
                reader.onload = () => {
                  self.postMessage({ id, result: reader.result });
                };
                reader.readAsDataURL(blob);
              });
            } else {
              self.postMessage({ id, error: 'Failed to get canvas context' });
            }
          } else {
            self.postMessage({ id, error: 'OffscreenCanvas not supported' });
          }
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      }

      function handleImageCompress({ imageUrl, quality = 0.8, maxWidth, maxHeight }, id) {
        try {
          fetch(imageUrl)
            .then(response => response.blob())
            .then(blob => createImageBitmap(blob))
            .then(bitmap => {
              const canvas = new OffscreenCanvas(
                maxWidth || bitmap.width,
                maxHeight || bitmap.height
              );
              const ctx = canvas.getContext('2d');
              ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
              
              return canvas.convertToBlob({ type: 'image/webp', quality });
            })
            .then(blob => {
              const reader = new FileReader();
              reader.onload = () => {
                self.postMessage({ id, result: reader.result });
              };
              reader.readAsDataURL(blob);
            })
            .catch(error => {
              self.postMessage({ id, error: error.message });
            });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      }

      function handleAnimationCalculation({ keyframes, duration, easing = 'linear', fps = 60 }, id) {
        try {
          const frames = [];
          const frameCount = Math.ceil((duration / 1000) * fps);
          
          for (let i = 0; i <= frameCount; i++) {
            const progress = i / frameCount;
            const easedProgress = applyEasing(progress, easing);
            const frame = interpolateKeyframes(keyframes, easedProgress);
            frames.push(frame);
          }
          
          self.postMessage({ id, result: frames });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      }

      function handleDataProcessing({ data, operation }, id) {
        try {
          let result;
          
          switch (operation) {
            case 'sort':
              result = [...data].sort((a, b) => {
                if (typeof a === 'string') return a.localeCompare(b);
                return a - b;
              });
              break;
            case 'filter':
              result = data.filter(item => item != null && item !== '');
              break;
            case 'unique':
              result = [...new Set(data)];
              break;
            case 'chunk':
              const chunkSize = data.chunkSize || 10;
              result = [];
              for (let i = 0; i < data.array.length; i += chunkSize) {
                result.push(data.array.slice(i, i + chunkSize));
              }
              break;
            default:
              throw new Error('Unknown data operation: ' + operation);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      }

      function handleTextProcessing({ text, operation }, id) {
        try {
          let result;
          
          switch (operation) {
            case 'sanitize':
              result = text.replace(/<[^>]*>/g, '').trim();
              break;
            case 'truncate':
              const maxLength = operation.maxLength || 100;
              result = text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
              break;
            case 'search':
              const query = operation.query;
              const regex = new RegExp(query, 'gi');
              result = text.match(regex) || [];
              break;
            default:
              throw new Error('Unknown text operation: ' + operation);
          }
          
          self.postMessage({ id, result });
        } catch (error) {
          self.postMessage({ id, error: error.message });
        }
      }

      function applyEasing(t, type) {
        switch (type) {
          case 'easeInOut':
            return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
          case 'easeOut':
            return 1 - Math.pow(1 - t, 2);
          case 'easeIn':
            return t * t;
          case 'bounce':
            const n1 = 7.5625;
            const d1 = 2.75;
            if (t < 1 / d1) return n1 * t * t;
            else if (t < 2 / d1) return n1 * (t -= 1.5 / d1) * t + 0.75;
            else if (t < 2.5 / d1) return n1 * (t -= 2.25 / d1) * t + 0.9375;
            else return n1 * (t -= 2.625 / d1) * t + 0.984375;
          default:
            return t; // linear
        }
      }

      function interpolateKeyframes(keyframes, progress) {
        if (keyframes.length === 0) return {};
        if (keyframes.length === 1) return keyframes[0];
        
        const scaledProgress = progress * (keyframes.length - 1);
        const index = Math.floor(scaledProgress);
        const nextIndex = Math.min(index + 1, keyframes.length - 1);
        const localProgress = scaledProgress - index;
        
        const current = keyframes[index];
        const next = keyframes[nextIndex];
        
        const result = {};
        for (const key in current) {
          if (typeof current[key] === 'number' && typeof next[key] === 'number') {
            result[key] = current[key] + (next[key] - current[key]) * localProgress;
          } else {
            result[key] = localProgress < 0.5 ? current[key] : next[key];
          }
        }
        
        return result;
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      const { id, result, error } = e.data;
      const task = tasksRef.current.get(id);
      
      if (task) {
        clearTimeout(task.timeout);
        tasksRef.current.delete(id);
        availableWorkersRef.current.add(index);
        
        if (error) {
          task.reject(new Error(error));
        } else {
          task.resolve(result);
        }
        
        // Process next task in queue
        processQueue();
      }
    };

    worker.onerror = (error) => {
      if (options.enableLogging) {
        console.error(`Worker ${index} error:`, error);
      }
      availableWorkersRef.current.add(index);
      processQueue();
    };

    return worker;
  }, [options.enableLogging]);

  const processQueue = useCallback(() => {
    if (taskQueueRef.current.length === 0 || availableWorkersRef.current.size === 0) {
      return;
    }

    const workerIndex = Array.from(availableWorkersRef.current)[0];
    const task = taskQueueRef.current.shift();
    
    if (task && workersRef.current[workerIndex]) {
      availableWorkersRef.current.delete(workerIndex);
      tasksRef.current.set(task.id, task);
      
      workersRef.current[workerIndex].postMessage({
        type: task.type,
        data: task.data,
        id: task.id
      });
    }
  }, []);

  const executeTask = useCallback(async (
    type: string,
    data: any
  ): Promise<any> => {
    return new Promise((resolve, reject) => {
      const id = `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const timeout = setTimeout(() => {
        const task = tasksRef.current.get(id);
        if (task) {
          tasksRef.current.delete(id);
          reject(new Error(`Task ${type} timed out after ${options.taskTimeout}ms`));
        }
      }, options.taskTimeout);

      const task: WorkerTask = {
        id,
        type,
        data,
        resolve,
        reject,
        timeout
      };

      if (availableWorkersRef.current.size > 0) {
        const workerIndex = Array.from(availableWorkersRef.current)[0];
        availableWorkersRef.current.delete(workerIndex);
        tasksRef.current.set(id, task);
        
        workersRef.current[workerIndex].postMessage({
          type,
          data,
          id
        });
      } else {
        taskQueueRef.current.push(task);
      }
    });
  }, [options.taskTimeout]);

  // Convenience methods for common tasks
  const resizeImage = useCallback((imageData: ImageData, width: number, height: number, quality?: number) => {
    return executeTask('imageResize', { imageData, width, height, quality });
  }, [executeTask]);

  const compressImage = useCallback((imageUrl: string, quality: number, maxWidth?: number, maxHeight?: number) => {
    return executeTask('imageCompress', { imageUrl, quality, maxWidth, maxHeight });
  }, [executeTask]);

  const calculateAnimation = useCallback((keyframes: any[], duration: number, easing?: string, fps?: number) => {
    return executeTask('animationCalculation', { keyframes, duration, easing, fps });
  }, [executeTask]);

  const processData = useCallback((data: any[], operation: string) => {
    return executeTask('dataProcessing', { data, operation });
  }, [executeTask]);

  const processText = useCallback((text: string, operation: string) => {
    return executeTask('textProcessing', { text, operation });
  }, [executeTask]);

  // Initialize workers
  useEffect(() => {
    // Create worker pool
    for (let i = 0; i < options.maxWorkers; i++) {
      const worker = createWorker(i);
      workersRef.current.push(worker);
      availableWorkersRef.current.add(i);
    }

    return () => {
      // Cleanup workers and tasks
      workersRef.current.forEach(worker => worker.terminate());
      workersRef.current = [];
      
      tasksRef.current.forEach(task => {
        clearTimeout(task.timeout);
        task.reject(new Error('Worker pool destroyed'));
      });
      tasksRef.current.clear();
      taskQueueRef.current = [];
      availableWorkersRef.current.clear();
    };
  }, [createWorker, options.maxWorkers]);

  return {
    executeTask,
    resizeImage,
    compressImage,
    calculateAnimation,
    processData,
    processText,
    isReady: workersRef.current.length === options.maxWorkers,
    activeWorkers: workersRef.current.length - availableWorkersRef.current.size,
    queueLength: taskQueueRef.current.length,
  };
}; 