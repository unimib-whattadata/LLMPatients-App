import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "~/env";

const PATIENT_VOICE_MAP: Record<string, string> = {
  
  "john": "TX3LPVmP7r2b3yJ8", 
  
  "juanita": "21m00Tcm4TlvDq8ikWAM",
};


const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL"; 


const EMOTION_VOICE_SETTINGS: Record<string, { stability: number; style: number }> = {
  "base": { stability: 0.7, style: 0.3 },      
  "joy": { stability: 0.4, style: 0.8 },       
  "sadness": { stability: 0.6, style: 0.4 },   
  "anger": { stability: 0.3, style: 0.9 },     
  "surprise": { stability: 0.5, style: 0.7 },  
  "anticipation": { stability: 0.5, style: 0.6 }, 
  "disgust": { stability: 0.4, style: 0.5 },   
  "trust": { stability: 0.8, style: 0.4 },     
};

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const text = searchParams.get("text");
    const patientName = searchParams.get("patientName");
    const voiceIdParam = searchParams.get("voiceId");

    
    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured - please check API key" },
        { status: 401 }
      );
    }

    // Use voiceId from parameter if provided, otherwise fall back to patient name mapping
    let voiceId: string;
    if (voiceIdParam) {
      voiceId = voiceIdParam;
    } else {
      const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
      voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;
    }

    
    const emotion = searchParams.get("emotion") || "base";
    const emotionSettings = EMOTION_VOICE_SETTINGS[emotion as keyof typeof EMOTION_VOICE_SETTINGS] || { stability: 0.5, style: 0.5 };

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const ttsRequestBody = {
      text,
      model_id: "eleven_multilingual_v2",
      language_code: "it",
      voice_settings: {
        stability: emotionSettings.stability,
        similarity_boost: 0.75,
        style: emotionSettings.style,
      },
    };

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(ttsRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      
      if (response.status === 401) {
        
        if (errorData.detail?.status === "quota_exceeded") {
          return NextResponse.json(
            { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
            { status: 402 }
          );
        }
        return NextResponse.json(
          { error: "TTS service not configured - please check API key" },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: "TTS rate limit exceeded - please try again later" },
          { status: 429 }
        );
      } else if (response.status === 402) {
        return NextResponse.json(
          { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
          { status: 402 }
        );
      }
      
      return NextResponse.json(
        { error: `TTS generation failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    
    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { text: string; patientName?: string; voiceId?: string; emotion?: string };
    const { text, patientName, voiceId: voiceIdParam } = body;

    
    if (!text) {
      return NextResponse.json(
        { error: "Text parameter is required" },
        { status: 400 }
      );
    }

    
    const apiKey = process.env.ELEVENLABS_API_KEY || env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      console.error("ElevenLabs API key not configured");
      return NextResponse.json(
        { error: "TTS service not configured - please check API key" },
        { status: 401 }
      );
    }

    // Use voiceId from parameter if provided, otherwise fall back to patient name mapping
    let voiceId: string;
    if (voiceIdParam) {
      voiceId = voiceIdParam;
    } else {
      const normalizedPatientName = patientName?.toLowerCase().replace(/\s+/g, "-") || "";
      voiceId = PATIENT_VOICE_MAP[normalizedPatientName] || DEFAULT_VOICE_ID;
    }

    
    const emotion = body.emotion || "base";
    const emotionSettings = EMOTION_VOICE_SETTINGS[emotion as keyof typeof EMOTION_VOICE_SETTINGS] || { stability: 0.5, style: 0.5 };

    console.log(`🎙️ [TTS] Generating speech for patient: ${patientName || "unknown"}, voice: ${voiceId}`);

    
    const elevenLabsUrl = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`;
    
    const postRequestBody = {
      text,
      model_id: "eleven_flash_v2_5",
      language_code: "it",
      apply_text_normalization: "auto", 
      voice_settings: {
        stability: emotionSettings.stability,
        similarity_boost: 0.75,
        style: emotionSettings.style,
      },
    };

    const response = await fetch(elevenLabsUrl, {
      method: "POST",
      headers: {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      body: JSON.stringify(postRequestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [TTS] ElevenLabs API error: ${response.status} - ${errorText}`);
      
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = {};
      }
      
      
      if (response.status === 401) {
        
        if (errorData.detail?.status === "quota_exceeded") {
          return NextResponse.json(
            { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
            { status: 402 }
          );
        }
        return NextResponse.json(
          { error: "TTS service not configured - please check API key" },
          { status: 401 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { error: "TTS rate limit exceeded - please try again later" },
          { status: 429 }
        );
      } else if (response.status === 402) {
        return NextResponse.json(
          { error: "TTS quota exceeded - please check your ElevenLabs account credits" },
          { status: 402 }
        );
      }
      
      return NextResponse.json(
        { error: `TTS generation failed: ${response.statusText}` },
        { status: response.status }
      );
    }

    
    const audioBuffer = await response.arrayBuffer();

    console.log(`✅ [TTS] Successfully generated ${audioBuffer.byteLength} bytes of audio`);

    
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ [TTS] Error generating speech:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

