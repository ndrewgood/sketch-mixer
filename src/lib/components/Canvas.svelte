<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { canvasObjectsArr, overlappedCanvases, combinationInProgress, draggingCanvas, geminiApiKey, generateOptionsPrompt, responseCount, options, generationMode, apiKeyError, showDevInfo } from '$lib/stores/canvasStore';
  import { getOptions } from '$lib/utils';
  const deleteIconPath = '/svg/icon-delete.svg';
  const downloadIconPath = '/svg/icon-download.svg';
  const moveIconPath = '/svg/icon-move.svg';
  const undoIconPath = '/svg/icon-undo.svg';

  export let id: number;
  export let handleInstantCombination: () => Promise<void>;

  let canvasContainer: HTMLDivElement;
  let p5Instance: any;
  let strokeHistory: Array<{points: Array<{x: number, y: number}>, color: string}> = [];
  let currentStroke: {points: Array<{x: number, y: number}>, color: string} | null = null;
  
  // Make canvas draggable
  let position = { 
    x: browser ? (window.innerWidth / 2) - 100 : 0,  // 100 is half the canvas width
    y: browser ? (window.innerHeight / 2) - 100 : 0  // 100 is half the canvas height
  };
  let canvasSize = {
    width: 200,
    height: 200
  }
  let dragOffset = { x: 0, y: 0 };

  const colors = ['#343434', '#EF1E44', '#FF6D12', '#F4EA2B', '#2DD218', '#1255FF', '#AE33D4'];
  let currentColorIndex = 0;

  // Initialize position in store only if not already present
  canvasObjectsArr.update(objects => {
    const existingObject = objects.find(p => p.id === id);
    if (existingObject) {
      // Use the position from the store instead of the default position
      position.x = existingObject.x;
      position.y = existingObject.y;
      return objects; // Don't modify the store since we're using its values
    } else {
      // Add new object if it doesn't exist
      return [...objects, { 
        id, 
        x: position.x, 
        y: position.y, 
        z: objects.length + 1,
      }];
    }
  });

  function handleMouseDown(event: MouseEvent) {
    const dragHandle = event.target as HTMLElement;
    if (dragHandle.closest('.drag-handle')) {
      $draggingCanvas = $canvasObjectsArr.find(p => p.id === id) ?? null;
      dragOffset.x = event.clientX - position.x;
      dragOffset.y = event.clientY - position.y;
      
      // Update z-indices in store
      canvasObjectsArr.update(objects => {
        const maxZ = objects.length;
        const currentZ = objects.find(p => p.id === id)?.z || 1;
        
        return objects.map(p => {
          if (p.id === id) {
            return { ...p, z: maxZ };
          } else if (p.z > currentZ) {
            // Only decrease z-index for items that were above the dragged item
            return { ...p, z: p.z - 1 };
          }
          return p;
        });
      });
      
      
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp, { once: true });
    }
  }

  function handleMouseMove(event: MouseEvent) {
    if (id == $draggingCanvas?.id) {
      if ($combinationInProgress && $combinationInProgress?.find(c => c.id === id)) {
        $combinationInProgress = null;
        $options = [];
      }

      position.x = event.clientX - dragOffset.x;
      position.y = event.clientY - dragOffset.y;
      canvasContainer.style.transform = `translate(${position.x}px, ${position.y}px)`;
      
      canvasObjectsArr.update(objects => 
        objects.map(p => p.id === id ? { ...p, x: position.x, y: position.y } : p)
      );
    }
  }

  function handleMouseUp() {
    if ($overlappedCanvases !== null) {
      if ($geminiApiKey.length !== 39) {
        $showDevInfo = true;
        $apiKeyError = true;
      } else {
        const [canvas1, canvas2] = $overlappedCanvases;

        combinationInProgress.set([$overlappedCanvases[0], $overlappedCanvases[1]]);

        const canvas2Position = $canvasObjectsArr.find(p => p.id === canvas2.id);
        
        if (canvas2Position) {
          const newX = canvas2Position.x;
          const newY = canvas2Position.y + canvasSize.height + 70;
          
          requestAnimationFrame(() => {
            position.x = newX;
            position.y = newY;
            canvasContainer.style.transform = `translate(${newX}px, ${newY}px)`;
            
            canvasObjectsArr.update(objects =>
              objects.map(p => p.id === id ? { ...p, x: newX, y: newY } : p)
            );
          });
        }

        if ($generationMode === 'options') {
          handleCombination();
        } else if ($generationMode === 'instant') {
          handleInstantCombination();
        }
      }
    }
    $draggingCanvas = null;
    window.removeEventListener('mousemove', handleMouseMove);
  }

  async function handleCombination() {
    if ($combinationInProgress) {
      $options = await getOptions($geminiApiKey, $generateOptionsPrompt, $combinationInProgress, $responseCount);
    }
  }

  function deleteCanvas() {
    if ($combinationInProgress && $combinationInProgress?.find(c => c.id === id)) {
      $combinationInProgress = null;
      $options = [];
    }
    // Remove from store and update z-indices
    canvasObjectsArr.update(objects => {
      const deletedCanvas = objects.find(p => p.id === id);
      const deletedZ = deletedCanvas?.z || 0;
      
      const filteredObjects = objects.filter(p => p.id !== id);
      // Only decrease z-index for canvases that were above the deleted one
      return filteredObjects.map(obj => ({
        ...obj,
        z: obj.z > deletedZ ? obj.z - 1 : obj.z
      }));
    });
    // Remove from DOM
    canvasContainer.remove();
  }

  function downloadCanvas() {
    // Download the canvas as an image
    const canvas = p5Instance.canvas;
    const link = document.createElement('a');
    link.href = canvas.toDataURL();
    link.download = `canvas-${id}.png`;
    link.click();
  }

  function toggleColor() {
    // Toggle the color of the p5 brush
    currentColorIndex = (currentColorIndex + 1) % colors.length;
  }

  function undoStroke() {

    if (strokeHistory.length > 0 && !$combinationInProgress?.find(c => c.id === id)) {
      if ($canvasObjectsArr.find(p => p.id === id)?.initialImage) {
        p5Instance.loadImage($canvasObjectsArr.find(p => p.id === id)?.initialImage, (img: any) => {
          p5Instance.image(img, 0, 0, canvasSize.width, canvasSize.height);
        });
      } else {
        p5Instance.background(255);
      }
          
      strokeHistory.pop();
      // Redraw canvas with updated history
      strokeHistory.forEach(stroke => {
        p5Instance.stroke(stroke.color);
        p5Instance.strokeWeight(4);
        for (let i = 1; i < stroke.points.length; i++) {
          p5Instance.line(
            stroke.points[i-1].x,
            stroke.points[i-1].y,
            stroke.points[i].x,
            stroke.points[i].y
          );
        }
      });
    }
  }
  

  onMount(() => {
    if (!browser) return;

    let cleanup: (() => void) | undefined;
    
    // Handle async setup
    (async () => {
      const p5Module = await import('p5');
      const p5 = p5Module.default;

      const sketch = (p: any) => {
        let isDrawing = false;

        p.setup = () => {
          const canvas = p.createCanvas(canvasSize.width, canvasSize.height);
          canvas.style('border-radius', '12px');
          canvas.mousePressed(() => { 
            if (!$combinationInProgress?.find(c => c.id === id)) {
              isDrawing = true;
              currentStroke = {
                points: [],
                color: colors[currentColorIndex]
              };
            }
          });
          canvas.mouseReleased(() => { 
            isDrawing = false;
            if (currentStroke && currentStroke.points.length > 0) {
              strokeHistory.push(currentStroke);
              currentStroke = null;
            }
          });
          p.background(255);

          // Load initial image if provided
          if ($canvasObjectsArr.find(p => p.id === id)?.initialImage) {
            p.loadImage($canvasObjectsArr.find(p => p.id === id)?.initialImage, (img: any) => {
              p.image(img, 0, 0, canvasSize.width, canvasSize.height);
            });
          }
        };

        p.draw = () => {
          if (isDrawing && currentStroke) {
            p.stroke(currentStroke.color);
            p.strokeWeight(4);
            
            // Add current point to stroke
            currentStroke.points.push({ x: p.mouseX, y: p.mouseY });
            
            // Draw only the latest line segment
            if (currentStroke.points.length > 1) {
              const lastIdx = currentStroke.points.length - 1;
              p.line(
                currentStroke.points[lastIdx-1].x,
                currentStroke.points[lastIdx-1].y,
                currentStroke.points[lastIdx].x,
                currentStroke.points[lastIdx].y
              );
            }
          }
        };
      };

      p5Instance = new p5(sketch, canvasContainer);
      cleanup = () => {
        p5Instance.remove();
        // Remove from store when component is destroyed
        canvasObjectsArr.update(objects => objects.filter(p => p.id !== id));
      };
    })();

    return () => cleanup?.();
  });
</script>

<div
  class="canvas-container {$draggingCanvas?.id === id ? '' : 'transitioning'}"
  aria-label="Draggable canvas"
  bind:this={canvasContainer}
  data-canvas-id={id}
  style="transform: translate({position.x}px, {position.y}px); z-index: {$canvasObjectsArr.find(p => p.id === id)?.z};"
>
  <div class="canvas-controls">
    <button
      class="download-button"
      aria-label="Download canvas"
      on:click={downloadCanvas}
    >
      <img src={downloadIconPath} alt="Download" width="24" height="24" />
    </button>

    <button
      class="color-button"
      aria-label="Toggle color"
      on:click={toggleColor}
    >
      <div class="color-button-outer">
        <div class="color-button-inner" style="background: {colors[currentColorIndex]}"></div>
      </div>
    </button>

    <button 
      class="drag-handle" 
      aria-label="Drag canvas"
      on:mousedown={handleMouseDown}
    >
      <img src={moveIconPath} alt="Move" width="24" height="24" />
    </button>

    <button
      class="undo-button"
      aria-label="Undo stroke"
      on:click={undoStroke}
    >
      <img src={undoIconPath} alt="Undo" width="24" height="24" />
    </button>

    <button
      class="delete-button"
      aria-label="Delete canvas"
      on:click={deleteCanvas}
    >
      <img src={deleteIconPath} alt="Delete" width="24" height="24" />
    </button>
  </div>
</div>

<style>

  :global(body) {
    --canvas-background: #ececec50;
    --icon-stroke: rgba(17, 15, 15, 0.25);
    --icon-stroke-hover: rgba(17, 15, 15, 0.5);
  }

  .canvas-container {
    position: absolute;
    background: var(--canvas-background);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    border-radius: 16px;
    padding: 8px;
    padding-top: 4px;
    touch-action: none;
    border: 2px solid rgba(0, 0, 0, 0.05);
    box-shadow: 0px 1px 24px rgba(0, 0, 0, 0.06);
    backdrop-filter: blur(6px);
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .canvas-controls {
    display: flex;
    gap: 2px;
    align-items: center;
  }

  .canvas-controls button {
    padding: 4px;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    background: none;
    cursor: pointer;
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    -webkit-touch-callout: none;
    -webkit-tap-highlight-color: transparent;
  }

  .canvas-controls button img {
    pointer-events: none;
    transition: all 0.2s ease;
    opacity: 0.25;
  }

  .canvas-controls button:hover img {
    opacity: 0.5;
  }

  .canvas-controls button:hover .color-button-outer {
    border-color: var(--icon-stroke-hover);
  }

  .drag-handle {
    width: 100%;
  }

  .color-button-outer {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2px solid var(--icon-stroke);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
  }

  .color-button-inner {
    width: 12px;
    height: 12px;
    border-radius: 50%;
  }

  .drag-handle {
    cursor: grab !important;
  }

  .drag-handle:active {
    cursor: grabbing !important;
  }
  
  :global(.transitioning) {
    transition: transform 300ms cubic-bezier(0.090, 0.545, 0.305, 0.955) !important;
  }
</style> 