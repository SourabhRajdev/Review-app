import { useEffect, useRef } from 'react';

interface ShaderAnimationProps {
  className?: string;
  style?: React.CSSProperties;
}

export default function ShaderAnimation({ className = '', style = {} }: ShaderAnimationProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext('webgl', { antialias: true, alpha: true });
    if (!gl) return;

    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    canvas.width = width;
    canvas.height = height;

    const vertexShader = `
      attribute vec4 position;
      void main() {
        gl_Position = position;
      }
    `;

    const fragmentShader = `
      precision highp float;
      uniform float time;
      uniform vec2 resolution;

      void main() {
        vec2 uv = gl_FragCoord.xy / resolution.xy;

        // Center and aspect correct
        vec2 p = uv - 0.5;
        p.x *= resolution.x / resolution.y;

        float len = length(p);

        // Concentric rings with warm colors
        float ring1 = sin(len * 8.0 - time * 2.5) * 0.5 + 0.5;
        float ring2 = sin(len * 12.0 - time * 1.8 + 2.0) * 0.5 + 0.5;
        float ring3 = sin(len * 15.0 - time * 2.2 + 4.0) * 0.5 + 0.5;

        // Glow falloff
        float glow = exp(-len * 1.5) * 0.8;

        // Coffee brown (#C67C4E)
        vec3 coffee = vec3(0.776, 0.455, 0.302);
        // Amber (#F59E0B)
        vec3 amber = vec3(0.961, 0.620, 0.043);
        // Cream background (#FAF9F7)
        vec3 cream = vec3(0.980, 0.976, 0.969);

        // Mix colors based on rings
        vec3 color = mix(coffee, amber, ring1 * 0.6);
        color = mix(color, coffee, ring2 * 0.4);
        color = mix(color, amber, ring3 * 0.5);

        // Apply glow and fade
        color = color * glow * (ring1 + ring2 + ring3) * 0.4;
        color = mix(cream, color, glow);

        gl_FragColor = vec4(color, 1.0);
      }
    `;

    const program = gl.createProgram();
    if (!program) return;

    const vs = gl.createShader(gl.VERTEX_SHADER);
    const fs = gl.createShader(gl.FRAGMENT_SHADER);

    if (!vs || !fs) return;

    gl.shaderSource(vs, vertexShader);
    gl.shaderSource(fs, fragmentShader);

    gl.compileShader(vs);
    gl.compileShader(fs);

    if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
      console.error('Vertex shader error:', gl.getShaderInfoLog(vs));
      return;
    }

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
      console.error('Fragment shader error:', gl.getShaderInfoLog(fs));
      return;
    }

    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);

    const positions = new Float32Array([
      -1, -1, 1, -1, -1, 1, 1, -1, 1, 1, -1, 1,
    ]);

    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLoc = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const timeLoc = gl.getUniformLocation(program, 'time');
    const resolutionLoc = gl.getUniformLocation(program, 'resolution');

    gl.uniform2f(resolutionLoc, width, height);
    gl.viewport(0, 0, width, height);

    let animationId: number;
    let startTime = Date.now();

    const animate = () => {
      const elapsed = (Date.now() - startTime) * 0.001;
      gl.uniform1f(timeLoc, elapsed);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      animationId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      const newWidth = container.clientWidth;
      const newHeight = container.clientHeight;

      if (newWidth !== width || newHeight !== height) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        gl.viewport(0, 0, newWidth, newHeight);
        gl.uniform2f(resolutionLoc, newWidth, newHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', handleResize);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteProgram(program);
      gl.deleteBuffer(positionBuffer);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-[#FAF9F7] overflow-hidden ${className}`}
      style={{ height: '200px', ...style }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block' }}
      />
    </div>
  );
}
