
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { CylinderRecord } from "../types";

/**
 * Generates content using the Vision model for OCR.
 */
export const performOCR = async (imageBase64: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: [
        {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: "Extract the cylinder serial number from this image. Focus on alphanumeric markings. Return only the serial string." }
          ]
        }
      ]
    });
    return response.text?.trim() || '';
  } catch (error) {
    return "";
  }
};

/**
 * Extracts basic data from an unregistered cylinder using vision.
 */
export const analyzeUnregisteredCylinder = async (imageBase64: string, detectedSerial: string): Promise<CylinderRecord> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
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
    remarks: "Cylinder not part of 180-cylinder registry",
    isUnregistered: true
  };
};

/**
 * Generates spoken audio (TTS) for the cylinder report.
 * Strictly translates technical data into the target language.
 */
export const generateVoiceSummary = async (
  text: string, 
  languageName: string, 
  onAudioReady: (audioBuffer: AudioBuffer) => void
): Promise<{ success: boolean; errorType?: 'quota' | 'other' }> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // High-reliability prompt for TTS modality.
  // Direct command to translate everything, including IDs and numbers, into the target language.
  const prompt = `Speak the following data in ${languageName}. Translate every word, letter, and digit into ${languageName} phonetics. Do not speak English. 
  
  Data to speak:
  ${text}`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    // Reliable extraction by finding the first part containing inlineData.
    const audioPart = response.candidates?.[0]?.content?.parts?.find(p => !!p.inlineData);
    const base64Audio = audioPart?.inlineData?.data;

    if (base64Audio) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const audioData = decode(base64Audio);
      const buffer = await decodeAudioData(audioData, audioContext, 24000, 1);
      onAudioReady(buffer);
      return { success: true };
    }
    
    return { success: false, errorType: 'other' };
    
  } catch (error: any) {
    const errorStr = JSON.stringify(error).toLowerCase();
    const isQuotaError = errorStr.includes('429') || errorStr.includes('quota');
    return { success: false, errorType: isQuotaError ? 'quota' : 'other' };
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
