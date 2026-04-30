import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function translateGermanToEnglish(text: string): Promise<string> {
  if (!text.trim()) return "";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: text,
      config: {
        systemInstruction: "You are a highly accurate German to English translator. Translate the following German text into English. Provide only the translation, no explanations or additional text.",
      },
    });

    return response.text || "Translation failed.";
  } catch (error) {
    console.error("Translation error:", error);
    throw new Error("Failed to translate text. Please check your connection.");
  }
}

export async function getExampleSentence(word: string, level: number = 1): Promise<{ de: string; en: string }> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Provide a German example sentence using the word "${word}" and its English translation. 
      IMPORTANT: The sentence complexity must match German grammar level ${level} out of 10. 
      (Level 1 = very simple, Level 10 = highly complex/academic).
      Format your response as a JSON object: {"de": "...", "en": "..."}`,
      config: {
        systemInstruction: "You are a helpful German language tutor. Always return results in valid JSON format.",
      },
    });

    const text = response.text || "";
    try {
      const match = text.match(/\{.*\}/s);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error("Invalid response format");
    } catch (e) {
      return { de: `Hier ist ein Beispiel mit ${word}.`, en: `Here is an example with ${word}.` };
    }
  } catch (error) {
    console.error("Example sentence error:", error);
    return { de: "Fehler beim Laden des Beispiels.", en: "Error loading example." };
  }
}

export async function generateStudyGuide(vocabList: string, level: number): Promise<any[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a detailed study guide for the following German vocabulary words: ${vocabList}.
      Target Level: ${level}/10. 
      For each word, provide:
      1. Correct article (der/die/das) if applicable.
      2. Word type (Noun, Verb, Adj).
      3. An example sentence matching level ${level} complexity.
      4. English translation of the sentence.
      Return as a JSON array of objects: [{"word": "...", "article": "...", "type": "...", "example": "...", "translation": "..."}]`,
    });

    const text = response.text || "";
    const match = text.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error("Study guide generation error:", error);
    throw new Error("Failed to generate study guide.");
  }
}

export async function getNounGenders(level: number = 1): Promise<{ word: string; gender: string; en: string }[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate a list of 10 German nouns appropriate for proficiency level ${level} (out of 10).
      Level 1 focus: everyday objects, school, family, colors, basic verbs as nouns.
      Level 10 focus: abstract philosophy, specialized science, complex bureaucracy, professional terminology.
      Return them as a JSON array of objects: [{"word": "...", "gender": "der/die/das", "en": "..."}]`,
      config: {
        systemInstruction: "You are a German language expert. Always return results in valid JSON format.",
      },
    });

    const text = response.text || "[]";
    const match = text.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error("Noun genders error:", error);
    return [];
  }
}

export async function generateQuizQuestions(level: number): Promise<any[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Generate 5 multiple choice questions for German learners at level ${level}/10. 
      Level 1 hints: Basic greetings, numbers 1-20, colors, simple sentence word order (V2).
      Level 10 hints: Passiv, Konjunktiv II, specific cultural nuances, complex subordinate clauses.
      Format as JSON array: [{"question": "...", "options": ["...", "...", "...", "..."], "answer": "..."}]`,
      config: {
        systemInstruction: "Expert German tutor. Return valid JSON only.",
      },
    });
    const text = response.text || "[]";
    const match = text.match(/\[.*\]/s);
    return match ? JSON.parse(match[0]) : [];
  } catch (error) {
    console.error("Quiz generation error:", error);
    return [];
  }
}

export async function dictionaryLookup(word: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Look up the German word "${word}". 
      Return a JSON object: {"de": "${word}", "en": "...", "cat": "...", "example": {"de": "...", "en": "..."}}
      If the word is not real, return null.`,
      config: {
        systemInstruction: "You are a comprehensive German-English dictionary. Always return valid JSON.",
      }
    });

    const text = response.text || "";
    const match = text.match(/\{.*\}/s);
    return match ? JSON.parse(match[0]) : null;
  } catch (error) {
    console.error("Dictionary lookup error:", error);
    return null;
  }
}
