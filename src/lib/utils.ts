import { GoogleGenAI, createUserContent, Type, Modality } from '@google/genai';
import type { CanvasObject } from '$lib/stores/canvasStore';

let geminiModelOptions = "gemini-2.0-flash";
let geminiModelCombination = "gemini-2.0-flash-exp-image-generation";


const getCanvasElements = (canvasPositions: CanvasObject[]) => {
    return canvasPositions.map(pos => {
        const canvas = document.querySelector(`[data-canvas-id="${pos.id}"] canvas`) as HTMLCanvasElement;
        return canvas;
    }).filter(canvas => canvas !== null);
}

export async function getOptions(apiKey: string, promptPreable: string, canvasPositions: CanvasObject[], responseCount: number) {
      
    const ai = new GoogleGenAI({
    apiKey: apiKey,
    });

    // Get canvases by their IDs from the store
    const canvasElements = getCanvasElements(canvasPositions);
   
    if (canvasElements.length === 0) {
        console.log('No canvases found');
        return;
    }

    // Convert canvases to base64 and create content parts
    const imageParts = canvasElements.map(canvas => ({
    inlineData: {
        mimeType: "image/png",
        data: canvas.toDataURL('image/png').split(',')[1] // Remove the data URL prefix
    }
    }));

    const config = {
        responseMimeType: 'application/json',
        responseSchema: {
            type: Type.ARRAY,
            items: {
                type: Type.STRING,
                description: 'Option for a creative, childlike way to combine the sketches',
            },
        },
    }

    const prompt = `${promptPreable} List ${responseCount} options.`;

    // Create the prompt with text and all canvas images
    const response = await ai.models.generateContent({
    model: geminiModelOptions,
    config,
    contents: createUserContent([
        prompt,
        ...imageParts
    ]),
    });

    console.log(response.text);
    
    // Parse the response and update options
    if (response.text) {
    return JSON.parse(response.text);
    }
}

export async function getOptionCombination(apiKey: string, promptPreable: string, canvasPositions: CanvasObject[], option: string) {
    const ai = new GoogleGenAI({
    apiKey: apiKey,
    });

    // Get canvases by their IDs from the store
    const canvasElements = canvasPositions.map(pos => {
    const canvas = document.querySelector(`[data-canvas-id="${pos.id}"] canvas`) as HTMLCanvasElement;
    return canvas;
    }).filter(canvas => canvas !== null);

    if (canvasElements.length === 0) {
    console.log('No canvases found');
    return;
    }

    // Convert canvases to base64 and create content parts
    const imageParts = canvasElements.map(canvas => ({
    inlineData: {
        mimeType: "image/png",
        data: canvas.toDataURL('image/png').split(',')[1] // Remove the data URL prefix
    }
    }));

    const config = {
    responseModalities: [Modality.IMAGE, Modality.TEXT],
    }

    const prompt = `${promptPreable} Prompt: ${option}`;

    // Create the prompt with text and all canvas images
    const response = await ai.models.generateContent({
    model: geminiModelCombination,
    config,
    contents: createUserContent([
        prompt,
        ...imageParts
    ]),
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
            console.log(part.text);
            } else if (part.inlineData?.data) {
            return part.inlineData.data;
            }
        }
    }
}

export async function getInstantCombination(apiKey: string, promptPreable: string, canvasPositions: CanvasObject[]) {
    const ai = new GoogleGenAI({
    apiKey: apiKey,
    });

    // Get canvases by their IDs from the store
    const canvasElements = canvasPositions.map(pos => {
    const canvas = document.querySelector(`[data-canvas-id="${pos.id}"] canvas`) as HTMLCanvasElement;
    return canvas;
    }).filter(canvas => canvas !== null);

    if (canvasElements.length === 0) {
    console.log('No canvases found');
    return;
    }

    // Convert canvases to base64 and create content parts
    const imageParts = canvasElements.map(canvas => ({
    inlineData: {
        mimeType: "image/png",
        data: canvas.toDataURL('image/png').split(',')[1] // Remove the data URL prefix
    }
    }));

    const config = {
    responseModalities: [Modality.IMAGE, Modality.TEXT],
    }

    const prompt = `${promptPreable}`;

    // Create the prompt with text and all canvas images
    const response = await ai.models.generateContent({
    model: geminiModelCombination,
    config,
    contents: createUserContent([
        prompt,
        ...imageParts
    ]),
    });

    if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
            if (part.text) {
            console.log(part.text);
            } else if (part.inlineData?.data) {
            return part.inlineData.data;
            }
        }
    }
}