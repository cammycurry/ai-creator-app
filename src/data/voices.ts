export type PlatformVoice = {
  id: string;           // ElevenLabs voice_id
  name: string;         // Display name
  gender: "female" | "male";
  age: "young" | "mature";
  tone: string;         // "energetic", "calm", "warm", "professional"
  description: string;  // Short description
  previewUrl: string;   // ElevenLabs preview audio URL
};

export const PLATFORM_VOICES: PlatformVoice[] = [
  {
    id: "21m00Tcm4TlvDq8ikWAM",
    name: "Rachel",
    gender: "female",
    age: "young",
    tone: "calm",
    description: "Calm and natural, great for testimonials",
    previewUrl: "https://api.elevenlabs.io/v1/voices/21m00Tcm4TlvDq8ikWAM/preview",
  },
  {
    id: "AZnzlk1XvdvUeBnXmlld",
    name: "Domi",
    gender: "female",
    age: "young",
    tone: "energetic",
    description: "Energetic and confident, great for product reviews",
    previewUrl: "https://api.elevenlabs.io/v1/voices/AZnzlk1XvdvUeBnXmlld/preview",
  },
  {
    id: "EXAVITQu4vr4xnSDxMaL",
    name: "Bella",
    gender: "female",
    age: "young",
    tone: "warm",
    description: "Warm and friendly, perfect for lifestyle content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/EXAVITQu4vr4xnSDxMaL/preview",
  },
  {
    id: "MF3mGyEYCl7XYWbV9V6O",
    name: "Elli",
    gender: "female",
    age: "young",
    tone: "professional",
    description: "Clear and professional, ideal for educational content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/MF3mGyEYCl7XYWbV9V6O/preview",
  },
  {
    id: "TxGEqnHWrfWFTfGW9XjX",
    name: "Josh",
    gender: "male",
    age: "young",
    tone: "warm",
    description: "Warm and natural male voice, great for storytelling",
    previewUrl: "https://api.elevenlabs.io/v1/voices/TxGEqnHWrfWFTfGW9XjX/preview",
  },
  {
    id: "VR6AewLTigWG4xSOukaG",
    name: "Arnold",
    gender: "male",
    age: "mature",
    tone: "professional",
    description: "Deep and authoritative, good for professional content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/VR6AewLTigWG4xSOukaG/preview",
  },
  {
    id: "pNInz6obpgDQGcFmaJgB",
    name: "Adam",
    gender: "male",
    age: "mature",
    tone: "calm",
    description: "Calm and measured, perfect for advice and tips",
    previewUrl: "https://api.elevenlabs.io/v1/voices/pNInz6obpgDQGcFmaJgB/preview",
  },
  {
    id: "yoZ06aMxZJJ28mfd3POQ",
    name: "Sam",
    gender: "male",
    age: "young",
    tone: "energetic",
    description: "Upbeat and engaging, great for hype content",
    previewUrl: "https://api.elevenlabs.io/v1/voices/yoZ06aMxZJJ28mfd3POQ/preview",
  },
];

export function getVoice(id: string): PlatformVoice | undefined {
  return PLATFORM_VOICES.find((v) => v.id === id);
}

export function getVoicesByGender(gender: "female" | "male"): PlatformVoice[] {
  return PLATFORM_VOICES.filter((v) => v.gender === gender);
}
