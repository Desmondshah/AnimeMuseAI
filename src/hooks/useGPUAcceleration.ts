// convex/useGPUAcceleration.ts - GPU Acceleration for iPhone Graphics
import { useEffect, useState, useRef, useCallback } from 'react';

interface GPUAccelerationState {
  isSupported: boolean;
  webGLVersion: '1' | '2' | null;
  maxTextureSize: number;
  maxViewportSize: number;
  supportedExtensions: string[];
  gpuInfo: {
    vendor: string;
    renderer: string;
    version: string;
  };
}

interface GPUOptimizationOptions {
  enableImageProcessing: boolean;
  enableTransitions: boolean;
  enableParticles: boolean;
  maxParticles: number;
  texturePoolSize: number;
  enableDebugMode: boolean;
}

export const useGPUAcceleration = (options: GPUOptimizationOptions = {
  enableImageProcessing: true,
  enableTransitions: true,
  enableParticles: false,
  maxParticles: 100,
  texturePoolSize: 20,
  enableDebugMode: false
}) => {
  const [state, setState] = useState<GPUAccelerationState>({
    isSupported: false,
    webGLVersion: null,
    maxTextureSize: 0,
    maxViewportSize: 0,
    supportedExtensions: [],
    gpuInfo: {
      vendor: '',
      renderer: '',
      version: ''
    }
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const glRef = useRef<WebGLRenderingContext | WebGL2RenderingContext | null>(null);
  const texturePoolRef = useRef<Map<string, WebGLTexture>>(new Map());
  const shaderProgramsRef = useRef<Map<string, WebGLProgram>>(new Map());

  // Initialize WebGL context and detect capabilities
  const initializeGPU = useCallback(async () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      canvasRef.current = canvas;

      // Try WebGL2 first, then WebGL1
      let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
      let webGLVersion: '1' | '2' | null = null;

      gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
      if (gl) {
        webGLVersion = '2';
      } else {
        gl = canvas.getContext('webgl') as WebGLRenderingContext;
        if (gl) {
          webGLVersion = '1';
        }
      }

      if (!gl) {
        setState(prev => ({ ...prev, isSupported: false }));
        return;
      }

      glRef.current = gl;

      // Get GPU capabilities
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxViewportSize = gl.getParameter(gl.MAX_VIEWPORT_DIMS)[0];
      const supportedExtensions = gl.getSupportedExtensions() || [];

      // Get GPU info
      let gpuInfo = {
        vendor: gl.getParameter(gl.VENDOR) || '',
        renderer: gl.getParameter(gl.RENDERER) || '',
        version: gl.getParameter(gl.VERSION) || ''
      };

      // Try to get unmasked info
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuInfo = {
          vendor: gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || gpuInfo.vendor,
          renderer: gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || gpuInfo.renderer,
          version: gpuInfo.version
        };
      }

      setState({
        isSupported: true,
        webGLVersion,
        maxTextureSize,
        maxViewportSize,
        supportedExtensions,
        gpuInfo
      });

      if (options.enableDebugMode) {
        console.log('GPU Acceleration Initialized:', {
          webGLVersion,
          maxTextureSize,
          maxViewportSize,
          gpuInfo,
          extensions: supportedExtensions.length
        });
      }

      // Initialize shader programs
      await initializeShaders();

    } catch (error) {
      console.error('GPU initialization failed:', error);
      setState(prev => ({ ...prev, isSupported: false }));
    }
  }, [options.enableDebugMode]);

  // Initialize common shader programs
  const initializeShaders = useCallback(async () => {
    if (!glRef.current) return;

    const gl = glRef.current;

    // Simple vertex shader
    const vertexShaderSource = `
      attribute vec2 a_position;
      attribute vec2 a_texCoord;
      uniform vec2 u_resolution;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 zeroToOne = a_position / u_resolution;
        vec2 zeroToTwo = zeroToOne * 2.0;
        vec2 clipSpace = zeroToTwo - 1.0;
        
        gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);
        v_texCoord = a_texCoord;
      }
    `;

    // Image processing fragment shader
    const imageFragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform float u_brightness;
      uniform float u_contrast;
      uniform float u_saturation;
      varying vec2 v_texCoord;
      
      void main() {
        vec4 color = texture2D(u_image, v_texCoord);
        
        // Apply brightness
        color.rgb += u_brightness;
        
        // Apply contrast
        color.rgb = (color.rgb - 0.5) * u_contrast + 0.5;
        
        // Apply saturation
        float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
        color.rgb = mix(vec3(gray), color.rgb, u_saturation);
        
        gl_FragColor = color;
      }
    `;

    // Blur fragment shader
    const blurFragmentShaderSource = `
      precision mediump float;
      uniform sampler2D u_image;
      uniform vec2 u_resolution;
      uniform float u_radius;
      varying vec2 v_texCoord;
      
      void main() {
        vec2 texelSize = 1.0 / u_resolution;
        vec4 color = vec4(0.0);
        float total = 0.0;
        
        for (float x = -4.0; x <= 4.0; x += 1.0) {
          for (float y = -4.0; y <= 4.0; y += 1.0) {
            vec2 offset = vec2(x, y) * texelSize * u_radius;
            float weight = 1.0 - length(vec2(x, y)) / 4.0;
            color += texture2D(u_image, v_texCoord + offset) * weight;
            total += weight;
          }
        }
        
        gl_FragColor = color / total;
      }
    `;

    // Create shader programs
    const imageProgram = createShaderProgram(gl, vertexShaderSource, imageFragmentShaderSource);
    const blurProgram = createShaderProgram(gl, vertexShaderSource, blurFragmentShaderSource);

    if (imageProgram) shaderProgramsRef.current.set('image', imageProgram);
    if (blurProgram) shaderProgramsRef.current.set('blur', blurProgram);

  }, []);

  // Helper function to create shader programs
  const createShaderProgram = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    vertexShaderSource: string,
    fragmentShaderSource: string
  ): WebGLProgram | null => {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);

    if (!vertexShader || !fragmentShader) return null;

    const program = gl.createProgram();
    if (!program) return null;

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }

    return program;
  };

  // Helper function to create shaders
  const createShader = (
    gl: WebGLRenderingContext | WebGL2RenderingContext,
    type: number,
    source: string
  ): WebGLShader | null => {
    const shader = gl.createShader(type);
    if (!shader) return null;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  };

  // Process image using GPU
  const processImage = useCallback(async (
    imageElement: HTMLImageElement,
    effects: {
      brightness?: number;
      contrast?: number;
      saturation?: number;
      blur?: number;
    } = {}
  ): Promise<string> => {
    if (!state.isSupported || !glRef.current || !canvasRef.current) {
      return imageElement.src;
    }

    const gl = glRef.current;
    const canvas = canvasRef.current;

    // Set canvas size
    canvas.width = imageElement.width;
    canvas.height = imageElement.height;
    gl.viewport(0, 0, canvas.width, canvas.height);

    // Get appropriate shader program
    const programKey = effects.blur ? 'blur' : 'image';
    const program = shaderProgramsRef.current.get(programKey);
    
    if (!program) {
      console.warn('Shader program not available:', programKey);
      return imageElement.src;
    }

    gl.useProgram(program);

    // Create texture
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, imageElement);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    // Set up geometry
    const positions = new Float32Array([
      0, 0,
      canvas.width, 0,
      0, canvas.height,
      canvas.width, canvas.height
    ]);

    const texCoords = new Float32Array([
      0, 0,
      1, 0,
      0, 1,
      1, 1
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);

    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'a_position');
    const texCoordLocation = gl.getAttribLocation(program, 'a_texCoord');

    gl.enableVertexAttribArray(positionLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    gl.enableVertexAttribArray(texCoordLocation);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.vertexAttribPointer(texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);

    if (effects.blur) {
      const radiusLocation = gl.getUniformLocation(program, 'u_radius');
      gl.uniform1f(radiusLocation, effects.blur);
    } else {
      const brightnessLocation = gl.getUniformLocation(program, 'u_brightness');
      const contrastLocation = gl.getUniformLocation(program, 'u_contrast');
      const saturationLocation = gl.getUniformLocation(program, 'u_saturation');
      
      gl.uniform1f(brightnessLocation, effects.brightness || 0);
      gl.uniform1f(contrastLocation, effects.contrast || 1);
      gl.uniform1f(saturationLocation, effects.saturation || 1);
    }

    // Draw
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Convert to data URL
    return canvas.toDataURL('image/webp', 0.9);
  }, [state.isSupported]);

  // Apply hardware acceleration to DOM element
  const accelerateElement = useCallback((element: HTMLElement) => {
    if (!state.isSupported) return;

    // Apply GPU acceleration CSS properties
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform, opacity';
    element.style.backfaceVisibility = 'hidden';
    element.style.perspective = '1000px';
    element.style.webkitBackfaceVisibility = 'hidden';
    element.style.webkitPerspective = '1000px';
    element.style.webkitTransform = 'translateZ(0)';
  }, [state.isSupported]);

  // Create optimized CSS transition
  const createTransition = useCallback((
    element: HTMLElement,
    property: string,
    duration: number,
    easing: string = 'ease-out'
  ) => {
    if (!state.isSupported) return;

    accelerateElement(element);
    element.style.transition = `${property} ${duration}ms ${easing}`;
  }, [state.isSupported, accelerateElement]);

  // Cleanup
  useEffect(() => {
    initializeGPU();

    return () => {
      // Cleanup WebGL resources
      if (glRef.current) {
        const gl = glRef.current;
        
        // Delete textures
        texturePoolRef.current.forEach(texture => {
          gl.deleteTexture(texture);
        });
        texturePoolRef.current.clear();

        // Delete shader programs
        shaderProgramsRef.current.forEach(program => {
          gl.deleteProgram(program);
        });
        shaderProgramsRef.current.clear();
      }
    };
  }, [initializeGPU]);

  return {
    state,
    processImage,
    accelerateElement,
    createTransition,
    isSupported: state.isSupported,
    webGLVersion: state.webGLVersion,
    maxTextureSize: state.maxTextureSize,
    gpuInfo: state.gpuInfo,
  };
}; 