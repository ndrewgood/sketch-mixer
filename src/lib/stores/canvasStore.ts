import { writable, derived } from 'svelte/store';

export interface CanvasObject {
  id: number;
  x: number;
  y: number;
  z: number;
  initialImage?: string;
}

export const showDevInfo = writable<boolean>(false);

export const geminiApiKey = writable<string>('');

export const apiKeyError = writable<boolean>(false);

export const generationMode = writable<'options' | 'instant'>('options');

export const generateOptionsPrompt = writable<string>(
  'How might these sketches be combined in a creative, childlike way? These should be ideas that can be drawn in a simple sketch.'
);

export const generateOptionCombinationPrompt = writable<string>(
  'Generate a new sketch based off of these existing sketches and the stated prompt. Keep the basic line style of the original sketches. Use the same colors as the original sketches.'
);

// Generate a new single, cohesive sketch that directly combines the two provided images.

// **Style Instructions:**
// * Replicate the exact visual style and colors of the input sketches.
// * The output should be a simple, line art drawing.
// * The lines should be slightly rough and hand-drawn, just like the originals.
// * Do not add any shading or complex details.

// **Combination Instructions:**

export const generateInstantPrompt = writable<string>(
  'How might these sketches be combined in a creative, childlike way? These should be ideas that can be drawn in a simple sketch. List 3 options for how to combine the sketches. Generate a new sketch based off of the existing sketches and the best option of the 3. Keep the basic black and white line style of the original sketches.'
);

export const responseCount = writable<number>(3);

export const canvasSize = writable<number>(200);

export const options = writable<string[]>([]);

export const canvasObjectsArr = writable<CanvasObject[]>([]);

export const combinationInProgress = writable<null | [CanvasObject, CanvasObject]>(null);

export const draggingCanvas = writable<CanvasObject | null>(null);

export const overlappedCanvases = derived(
  [canvasObjectsArr, draggingCanvas, combinationInProgress, canvasSize],
  ([$canvasObjectsArr, $draggingCanvas, $combinationInProgress, $canvasSize]) => {
    const CANVAS_SIZE = $canvasSize + 16; // 200px + 16px padding
    const MIN_OVERLAP = 50; // minimum required overlap

    if (!$draggingCanvas) return null;

    let updatedDraggingCanvas = $canvasObjectsArr.find(p => p.id === $draggingCanvas.id);
    
    if (!updatedDraggingCanvas) return null;
    
    
    let overlappingCanvases: CanvasObject[] = [];
    
    for (const canvas2 of $canvasObjectsArr) {
      if (canvas2.id === updatedDraggingCanvas.id) continue;
      
      // Calculate overlap amounts in both dimensions
      const xOverlap = Math.min(
        updatedDraggingCanvas.x + CANVAS_SIZE - canvas2.x,
        canvas2.x + CANVAS_SIZE - updatedDraggingCanvas.x
      );
      const yOverlap = Math.min(
        updatedDraggingCanvas.y + CANVAS_SIZE - canvas2.y,
        canvas2.y + CANVAS_SIZE - updatedDraggingCanvas.y
      );
      
      // Check if overlap meets minimum requirements in both dimensions
      if ((xOverlap >= MIN_OVERLAP && yOverlap >= MIN_OVERLAP)) {
        overlappingCanvases.push(canvas2);
      }
    }

    if (overlappingCanvases.length === 0) return null;

    if ($combinationInProgress !== null) return null;
    
    // Sort by z-index and get the highest one
    const highestZCanvas = overlappingCanvases.sort((a, b) => b.z - a.z)[0];
    return [$draggingCanvas, highestZCanvas];
  }
); 

