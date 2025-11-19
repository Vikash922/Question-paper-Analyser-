import { GoogleGenAI, Type, Schema } from "@google/genai";
import { AnalysisGroup, ExtractionResult } from "../types";

// Constants for Image Optimization
const MAX_IMAGE_DIMENSION = 1536; // 1536px is sufficient for OCR
const IMAGE_QUALITY = 0.8; // 80% quality reduces size significantly with good text clarity

/**
 * Compresses and resizes images client-side before sending to API.
 * This reduces bandwidth usage and speeds up processing.
 */
const compressImage = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions if resizing is needed
        if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
          if (width > height) {
            height *= MAX_IMAGE_DIMENSION / width;
            width = MAX_IMAGE_DIMENSION;
          } else {
            width *= MAX_IMAGE_DIMENSION / height;
            height = MAX_IMAGE_DIMENSION;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          // Fallback to original if canvas context fails
          resolve((event.target?.result as string).split(',')[1]);
          return;
        }

        // Draw and compress
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', IMAGE_QUALITY);
        resolve(dataUrl.split(',')[1]); // Remove data URL prefix
      };

      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
};

// Helper to convert file to base64
const fileToGenerativePart = async (file: File): Promise<{ inlineData: { data: string; mimeType: string } }> => {
  
  // If it's an image, compress it first
  if (file.type.startsWith('image/')) {
    try {
      const compressedBase64 = await compressImage(file);
      return {
        inlineData: {
          data: compressedBase64,
          mimeType: 'image/jpeg', // We convert all images to jpeg during compression
        },
      };
    } catch (e) {
      console.warn("Image compression failed, falling back to original file", e);
      // Fallthrough to standard reader below
    }
  }

  // Standard handling for PDFs and Text (or failed image compression)
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      // Remove data url prefix (e.g. "data:application/pdf;base64,")
      const base64Data = base64String.split(',')[1];
      resolve({
        inlineData: {
          data: base64Data,
          mimeType: file.type,
        },
      });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

/**
 * Step 1: Extract raw questions from a single file.
 * Uses Gemini to OCR/Extract text and identify the year.
 */
export const extractQuestionsFromFile = async (
  file: File
): Promise<ExtractionResult> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Schema for extraction
  const extractionSchema: Schema = {
    type: Type.OBJECT,
    properties: {
      year: { type: Type.STRING, description: "The year of the exam paper found in the text/header. If not found, use 'Unknown'." },
      questions: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "List of all exam questions extracted from the document. Exclude instructions, headers, and footers."
      }
    },
    required: ["year", "questions"]
  };

  const filePart = await fileToGenerativePart(file);

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        filePart,
        { text: `Extract every exam question from this document.
        
        STRICT NORMALIZATION RULES:
        1. Remove all numbering and labels (e.g., '1.', 'Q1.', '(a)', '2)').
        2. Correct any OCR spelling mistakes automatically.
        3. If a question is broken across multiple lines, merge it into a single coherent sentence.
        4. Keep the COMPLETE, exact meaning of the question.
        5. Do NOT shorten or summarize the question.
        6. Detect the Year of the exam.` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: extractionSchema,
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  try {
    const result = JSON.parse(text);
    // Enforce Rule 5: Remove duplicate copies locally from this file
    const uniqueQuestions = Array.from(new Set(result.questions || [])) as string[];
    
    return {
      questions: uniqueQuestions,
      year: result.year || "Unknown",
      sourceFile: file.name
    };
  } catch (e) {
    console.error("Failed to parse extraction JSON", e);
    return { questions: [], year: "Unknown", sourceFile: file.name };
  }
};

/**
 * Step 2: Analyze the aggregated list of questions.
 * Groups them, finds frequencies, and generates answers.
 */
export const analyzeRepeatedQuestions = async (
  allExtractions: ExtractionResult[]
): Promise<AnalysisGroup[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // ---------------------------------------------------------
  // CLIENT-SIDE OPTIMIZATION:
  // Flatten and deduplicate exact matches before sending to AI.
  // This reduces input tokens and processing load significantly.
  // ---------------------------------------------------------
  const questionMap = new Map<string, { text: string; years: string[] }>();

  allExtractions.forEach(ex => {
    const safeYear = ex.year || "Unknown";
    ex.questions.forEach(q => {
      if (!q || typeof q !== 'string') return;
      
      const cleanText = q.trim();
      if (cleanText.length < 3) return; // Skip noise/empty

      // Normalize key for matching (lowercase, collapse spaces)
      // This handles exact string matches client-side (e.g. copy-pasted questions)
      const key = cleanText.toLowerCase().replace(/\s+/g, ' ');

      if (questionMap.has(key)) {
        const entry = questionMap.get(key)!;
        entry.years.push(safeYear);
      } else {
        questionMap.set(key, {
          text: cleanText,
          years: [safeYear]
        });
      }
    });
  });

  // Construct the pre-processed payload
  // We combine years for identical strings here, so the AI only sees unique text strings.
  const preProcessedData = Array.from(questionMap.values()).map(item => ({
    question: item.text,
    years: item.years // keep all years, duplication of years handled by AI aggregation or set if strictly needed
  }));

  const analysisSchema: Schema = {
    type: Type.ARRAY,
    items: {
      type: Type.OBJECT,
      properties: {
        id: { type: Type.STRING },
        normalizedQuestion: { type: Type.STRING, description: "The cleanest, most complete version of the question." },
        type: { type: Type.STRING, enum: ["Long Question", "Short Question", "Very Short Question", "MCQ"] },
        years: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Combined list of years from all merged variants." },
        frequency: { type: Type.NUMBER, description: "Total count of appearances across all years." },
        variants: { type: Type.ARRAY, items: { type: Type.STRING }, description: "2 to 4 distinct example variants." },
        answer: { type: Type.STRING, description: "A detailed, exam-quality model answer." }
      },
      required: ["id", "normalizedQuestion", "type", "years", "frequency", "variants", "answer"]
    }
  };

  // We use gemini-2.5-flash for its large context window and speed.
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: {
      parts: [
        { text: `You are an expert Exam Question Analyzer.
        
        INPUT DATA:
        I have pre-grouped identical text strings. The input is a JSON list of objects: { "question": "...", "years": [...] }.

        YOUR TASK:
        1. **Semantic Grouping**: Analyze the list and merge questions that have the SAME MEANING but different wording (e.g., "Define Photosynthesis" == "What do you mean by Photosynthesis?").
        2. **Aggregation**: For each semantic group, combine their "years" lists and sum their occurrences to calculate total frequency.
        3. **Analysis**:
           - Create a 'normalizedQuestion' (best version).
           - Determine 'type'.
           - Select 2-4 distinct 'variants' from the inputs.
           - Generate a **HIGH QUALITY, DETAILED ACADEMIC ANSWER**.
        4. **Output**: Return a JSON array sorted by frequency (descending).

        INPUT JSON:
        ${JSON.stringify(preProcessedData)}` }
      ]
    },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema
    }
  });

  const text = response.text;
  if (!text) throw new Error("No analysis response from AI");

  try {
    return JSON.parse(text) as AnalysisGroup[];
  } catch (e) {
    console.error("JSON Parse Error in Analysis", e);
    throw new Error("Failed to parse analysis results.");
  }
};