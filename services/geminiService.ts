
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CylinderRecord } from "../types";

/**
 * Custom error class for API Quota issues.
 */
export class QuotaExhaustedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaExhaustedError";
  }
}

const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Please check your environment configuration.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates content using the Vision model for OCR, focusing on industrial markings.
 */
export const performOCR = async (imageBase64: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: "Extract the cylinder serial number. Focus on markings on the shroud, neck, or body. Preserve all alphanumeric characters, dots (.), and suffixes like .S, .T, .B, .J, or .P. Return only the serial string." }
          ]
        }
      ]
    });
    return response.text?.trim() || '';
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      throw new QuotaExhaustedError("API Quota Exhausted. Please wait a moment before trying again.");
    }
    return "";
  }
};

/**
 * Extracts basic data from an unregistered cylinder using vision.
 */
export const analyzeUnregisteredCylinder = async (imageBase64: string, detectedSerial: string): Promise<CylinderRecord> => {
  const ai = getAI();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: `Analyze this cylinder image.
            
            REQUIRED BASIC FIELDS:
            1. Serial Number: Exact detected text.
            2. Gas Type: Infer from labels/color (LPG, Oxygen, etc).
            3. Gas Category: Based on gas type.
            4. Location Type: Infer if visible (Domestic/Industrial).
            5. Manufacturer: Only if visible, else "Unknown".
            
            STRICT FORBIDDEN FIELDS (Return "Not Available"):
            - Test Date, Expiry Date, Working Pressure, Test Pressure, Standard Code.
            
            Return JSON.` }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            serialNumber: { type: Type.STRING },
            gasType: { type: Type.STRING },
            gasCategory: { type: Type.STRING },
            locationType: { type: Type.STRING },
            manufacturer: { type: Type.STRING }
          },
          required: ["serialNumber", "gasType", "gasCategory", "locationType", "manufacturer"]
        }
      }
    });

    const raw = JSON.parse(response.text || "{}");

    return {
      cylinderId: "UNREG-" + Math.random().toString(36).substr(2, 4).toUpperCase(),
      serialNumber: raw.serialNumber || detectedSerial || "Unknown",
      gasType: raw.gasType || "Unknown",
      gasCategory: raw.gasCategory || "Unknown",
      manufacturer: raw.manufacturer || "Unknown",
      locationType: raw.locationType || "Unknown",
      capacity: "Not Available",
      workingPressure: "Not Available",
      testPressure: "Not Available",
      testDate: "Not Available",
      standardCode: "Not Available",
      expiryDate: "Not Available",
      inspectionDate: new Date().toLocaleDateString(),
      rustLevel: "Not Assessed",
      hazardType: "Unknown",
      capPresent: "Unknown",
      labelCondition: "Unreadable / Unknown",
      remarks: "Cylinder not part of registry",
      isUnregistered: true
    };
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      throw new QuotaExhaustedError("API Quota Exhausted.");
    }
    throw error;
  }
};

/**
 * Translates and formats text for narration using a standard model.
 */
const translateForNarration = async (text: string, languageName: string): Promise<string> => {
  const ai = getAI();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { text: `Translate the following cylinder report to ${languageName}. 
            
            FORMATTING RULES:
            1. Translate all technical terms and headings to ${languageName}.
            2. For serial numbers, IDs, and alphanumeric strings, expand them so they are read CHARACTER BY CHARACTER in ${languageName} (e.g., "A-B-1-2" or "A B 1 2").
            3. Ensure the tone is professional and clear.
            4. Return ONLY the translated text to be spoken. No commentary.
            
            REPORT:
            ${text}` }
          ]
        }
      ]
    });
    return response.text?.trim() || text;
  } catch (error) {
    console.error("Translation error:", error);
    return text;
  }
};

/**
 * Generates spoken audio (TTS) for the cylinder report.
 */
export const generateVoiceSummary = async (
  text: string, 
  languageName: string, 
  onAudioReady: (audioBuffer: AudioBuffer) => void
): Promise<{ success: boolean }> => {
  const ai = getAI();
  
  try {
    // Step 1: Translate and format the text for narration
    const formattedText = await translateForNarration(text, languageName);

    // Step 2: Generate audio from the formatted text
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Say: ${formattedText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;

    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioData = decode(base64Audio);
      const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      onAudioReady(buffer);
      return { success: true };
    }
    
    return { success: false };
    
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 429) {
      console.warn("TTS Quota Hit");
    }
    console.error("Gemini TTS Error:", error);
    return { success: false };
  }
};

/**
 * Helper to decode base64 string to Uint8Array.
 */
function decode(base64: string): Uint8Array {
  const cleaned = base64.replace(/\s/g, '');
  const binaryString = atob(cleaned);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Helper to decode raw PCM audio data into an AudioBuffer.
 */
async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
