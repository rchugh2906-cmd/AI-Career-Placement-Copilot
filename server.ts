import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON body parsing with larger limits for resume PDFs
app.use(express.json({ limit: "25mb" }));

// Initialize GoogleGenAI client lazy-style
let aiClient: GoogleGenAI | null = null;
function getAi(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is missing. Please add it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

/**
 * Helper to execute generateContent with exponential backoff retry.
 * Handles transient 503, 429, timeout, and connection/fetch errors.
 * Dynamically falls back to alternate lightweight models (gemini-2.5-flash, gemini-2.0-flash, gemini-1.5-flash, gemini-3.5-flash)
 * if quota limits or RESOURCE_EXHAUSTED errors are encountered.
 */
async function generateContentWithRetry(
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
  retries = 3,
  delayMs = 1500
): ReturnType<GoogleGenAI["models"]["generateContent"]> {
  const requestedModel = params.model || "gemini-2.5-flash";
  const fallbackModels = [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash",
    "gemini-3.5-flash"
  ];

  // Unique list maintaining insertion order: first try requested, then try the fallbacks
  const modelsToTry = Array.from(new Set([requestedModel, ...fallbackModels]));

  for (let i = 0; i < modelsToTry.length; i++) {
    const currentModel = modelsToTry[i];
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const ai = getAi();
        const callParams = { ...params, model: currentModel };
        console.log(`[AI] Requesting model "${currentModel}" (attempt ${attempt}/${retries})`);
        return await ai.models.generateContent(callParams);
      } catch (err: any) {
        const errMsg = err.message || String(err);

        // Check for 429 or RESOURCE_EXHAUSTED
        const isQuotaExceeded =
          errMsg.includes("429") ||
          errMsg.includes("RESOURCE_EXHAUSTED") ||
          errMsg.includes("Quota exceeded") ||
          err.code === 429 ||
          err.status === "RESOURCE_EXHAUSTED";

        const isTransient =
          isQuotaExceeded ||
          errMsg.includes("503") ||
          errMsg.includes("UNAVAILABLE") ||
          errMsg.includes("timeout") ||
          errMsg.includes("Timeout") ||
          errMsg.includes("fetch failed") ||
          err.code === 503 ||
          err.status === "UNAVAILABLE";

        // Check if the quota limit is hard-capped at 0
        const isHardZeroLimit = errMsg.includes("limit: 0");

        if (isHardZeroLimit) {
          console.warn(`[AI] Model "${currentModel}" has hard quota of 0. Moving directly to fallback model.`);
          break; // Break current attempt loop and move to next model
        }

        if (isTransient && attempt < retries) {
          const nextDelay = delayMs * Math.pow(2, attempt - 1);
          console.warn(
            `[AI] Model "${currentModel}" transient failure (attempt ${attempt}/${retries}): ${errMsg}. Retrying in ${nextDelay}ms...`
          );
          await new Promise((resolve) => setTimeout(resolve, nextDelay));
          continue;
        }

        // If we got here, this model failed completely for this request.
        // If there's another model left in our list, try that one.
        if (i < modelsToTry.length - 1) {
          console.warn(`[AI] Model "${currentModel}" failed completely. Trying fallback model "${modelsToTry[i + 1]}"...`);
          break; // Break retry loop to move to next model
        }

        // No more fallbacks left, throw the original error
        throw err;
      }
    }
  }
  throw new Error("Failed to generate content: All available models were exhausted or returned quota limits.");
}

// Global API Key Health Check Route
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    hasApiKey: !!process.env.GEMINI_API_KEY,
  });
});

// FEATURE 1: Resume PDF Analysis
app.post("/api/analyze-resume", async (req, res) => {
  try {
    const ai = getAi();
    const { text, pdfBase64, mimeType = "application/pdf", targetRole = "" } = req.body;

    let contents: any[] = [];

    if (pdfBase64) {
      // Pass the PDF directly to Gemini
      contents.push({
        inlineData: {
          data: pdfBase64,
          mimeType: mimeType,
        },
      });
      contents.push({
        text: `You are an expert technical recruiter and ATS auditor. Analyze this resume file thoroughly. The user's target role is: "${targetRole}". Provide an overall resume score (out of 100), detailed strengths and weaknesses, missing skills required for the target role, ATS compatibility evaluation, specific improvement suggestions, and comprehensive recruiter feedback. Make sure you conclude with exactly 3 high-impact actions they should take next.`
      });
    } else if (text) {
      contents.push({
        text: `You are an expert technical recruiter and ATS auditor. Here is the user's resume text:\n\n${text}\n\nThe user's target role is: "${targetRole}". Analyze this resume text thoroughly. Provide an overall resume score (out of 100), detailed strengths and weaknesses, missing skills required for the target role, ATS compatibility evaluation, specific improvement suggestions, and comprehensive recruiter feedback. Make sure you conclude with exactly 3 high-impact actions they should take next.`
      });
    } else {
      return res.status(400).json({ error: "Please provide either resume text or a base64 encoded PDF file." });
    }

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumeScore: { type: Type.INTEGER, description: "Overall resume score out of 100." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of strong points of the resume." },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of areas that need improvement." },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Important missing skills for the target role." },
            atsCompatibility: { type: Type.STRING, description: "Detailed evaluation of how this resume performs in Applicant Tracking Systems (ATS)." },
            improvementSuggestions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Specific and actionable recommendations for improvement." },
            recruiterFeedback: { type: Type.STRING, description: "Honest, constructive, and inspiring recruiter feedback." },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 distinct and specific actions the user should take next." }
          },
          required: ["resumeScore", "strengths", "weaknesses", "missingSkills", "atsCompatibility", "improvementSuggestions", "recruiterFeedback", "top3Actions"],
        },
      },
    });

    if (!response.text) {
      throw new Error("No response text received from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Resume Analysis Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze resume." });
  }
});

// FEATURE 2: Skill Gap Analysis
app.post("/api/skill-gap", async (req, res) => {
  try {
    const ai = getAi();
    const { targetRole, skills } = req.body;

    if (!targetRole || !skills) {
      return res.status(400).json({ error: "Both targetRole and skills are required." });
    }

    const skillsString = Array.isArray(skills) ? skills.join(", ") : skills;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: `You are an AI Career Coach.

Target Role: ${targetRole}

Current Skills:
${skillsString}

Analyze the skill gap and return:
1. Matching Skills (existingSkills - current skills matching the role)
2. Missing Skills (missingSkills - required skills that are missing)
3. Readiness Score (0-100 representing readiness level as readinessScore)
4. Top 5 Skills to Learn Next (prioritySkills - exactly 5 items)
5. 30-Day Learning Plan (learningSequence - timeline divided into concise blocks over 30 days)

Keep the response concise and student-friendly. Conclude with exactly 3 actions to take next.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            readinessScore: { type: Type.INTEGER, description: "Readiness score out of 100." },
            existingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Matching Skills." },
            missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Missing Skills." },
            prioritySkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 5 Skills to Learn Next (Exactly 5 items)." },
            learningSequence: {
              type: Type.ARRAY,
              description: "30-Day Learning Plan sequence.",
              items: {
                type: Type.OBJECT,
                properties: {
                  timeframe: { type: Type.STRING, description: "Timeframe, e.g., 'Days 1-7', 'Days 8-15'" },
                  content: { type: Type.STRING, description: "Topics and study actions for this timeframe." }
                },
                required: ["timeframe", "content"]
              }
            },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["readinessScore", "existingSkills", "missingSkills", "prioritySkills", "learningSequence", "top3Actions"],
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Skill Gap Error:", err);
    res.status(500).json({ error: err.message || "Failed to analyze skill gaps." });
  }
});

// FEATURE 3: Career Recommendation
app.post("/api/career-recommendation", async (req, res) => {
  try {
    const ai = getAi();
    const { education, skills, interests, projects, certifications } = req.body;

    const prompt = `Based on the user's background details:
- Education: ${education || "Not specified"}
- Skills: ${skills || "Not specified"}
- Interests: ${interests || "Not specified"}
- Projects: ${projects || "Not specified"}
- Certifications: ${certifications || "Not specified"}

Suggest exactly 3 customized career paths. For each, describe it, explain why it fits, list required skills, and expected future opportunities. Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            careers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING, description: "Career option role title" },
                  description: { type: Type.STRING, description: "Brief description of the career path" },
                  whyItFits: { type: Type.STRING, description: "Detailed explanation of why it fits their education, skills, interests, projects, or certifications" },
                  requiredSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Skills needed for this career option" },
                  expectedOpportunities: { type: Type.STRING, description: "Expected future trends and hiring opportunities" }
                },
                required: ["title", "description", "whyItFits", "requiredSkills", "expectedOpportunities"]
              }
            },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["careers", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Career Recommendation Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate career options." });
  }
});

// FEATURE 4: Learning Roadmap Generator
app.post("/api/learning-roadmap", async (req, res) => {
  try {
    const ai = getAi();
    const { currentSkills, targetRole, studyHoursPerWeek } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: "targetRole is required." });
    }

    const prompt = `Create a structured learning roadmap for a user who wants to transition from current skills: "${currentSkills || "Beginner / None"}" to the Target Role: "${targetRole}", committing ${studyHoursPerWeek || 10} study hours per week.
Provide a month-by-month roadmap until they are job-ready (minimum 3 months, maximum 6 months depending on gap).
For each month, provide topics, hands-on projects, and high-quality study resources. Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            months: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  month: { type: Type.STRING, description: "e.g. Month 1, Month 2" },
                  topics: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Sub-topics to master this month" },
                  projects: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Hands-on projects to build to showcase these skills" },
                  resources: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Recommended courses, documentation, or textbooks" }
                },
                required: ["month", "topics", "projects", "resources"]
              }
            },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["months", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Learning Roadmap Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate roadmap." });
  }
});

// FEATURE 5: Job Recommendation Engine
app.post("/api/job-recommendations", async (req, res) => {
  try {
    const ai = getAi();
    const { resume, skills, education, interests } = req.body;

    const prompt = `Based on the following profile details:
- Resume text/summary: ${resume || "Not provided"}
- Current Skills: ${skills || "Not provided"}
- Education: ${education || "Not provided"}
- Interests: ${interests || "Not provided"}

Recommend at least 5 suitable jobs/internships. For each recommendation, provide:
- Match score (0 to 100)
- Role Title
- Why Recommended (Reason)
- Missing Skills required for this role
- Preparation Tips

Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            jobs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  role: { type: Type.STRING, description: "Job / Internship Role Title" },
                  matchScore: { type: Type.INTEGER, description: "Score out of 100 representing how well the user matches." },
                  whyRecommended: { type: Type.STRING, description: "Detailed reasoning on why this role fits their profile." },
                  missingSkills: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key missing skills the user needs to acquire." },
                  preparationTips: { type: Type.STRING, description: "Concrete advice on preparing or applying for this specific position." }
                },
                required: ["role", "matchScore", "whyRecommended", "missingSkills", "preparationTips"]
              }
            },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["jobs", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Job Recommendations Error:", err);
    res.status(500).json({ error: err.message || "Failed to recommend jobs." });
  }
});

// FEATURE 6: Interview Question Generator
app.post("/api/generate-questions", async (req, res) => {
  try {
    const ai = getAi();
    const { targetRole, experienceLevel = "Entry Level", skills = "", projects = "" } = req.body;

    if (!targetRole) {
      return res.status(400).json({ error: "targetRole is required." });
    }

    const usePersonalizedPack = projects.trim().length > 0 || targetRole.toLowerCase().includes("intern");

    const prompt = usePersonalizedPack
      ? `You are an AI Career Coach. Generate a personalized, highly tailored interview question set for a candidate applying for:
- Target Role: "${targetRole}"
- Experience Level: "${experienceLevel}"
- Technical Skills: "${skills}"
- Key Projects: "${projects}"

Specifically, create EXACTLY the following structure of questions:
1. Exactly 5 highly relevant technical/skill-based questions based on their target role and skills (e.g. Python, Web Development, Prompt Engineering). Put these 5 questions in the "technical" array.
2. Exactly 3 project-based/architectural questions based on their specified projects (e.g. "Smart Healthcare System"). Put these 3 questions in the "hr" array.
3. Exactly 2 behavioral questions assessing their past experiences and team dynamics. Put these 2 questions in the "behavioral" array.

Ensure a healthy mix of Easy, Medium, and Hard difficulty levels. Conclude with exactly 3 actions to take next.`
      : `Generate technical, behavioral, and HR interview questions for the following candidate profile:
- Target Role: "${targetRole}"
- Experience Level: "${experienceLevel}"
- Skills: "${skills}"

Generate at least 3 Technical Questions, 3 Behavioral Questions, and 3 HR Questions. Ensure a healthy mix of Easy, Medium, and Hard difficulty levels. Include exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            technical: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" }
                },
                required: ["question", "difficulty"]
              }
            },
            behavioral: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" }
                },
                required: ["question", "difficulty"]
              }
            },
            hr: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  question: { type: Type.STRING },
                  difficulty: { type: Type.STRING, description: "Easy, Medium, or Hard" }
                },
                required: ["question", "difficulty"]
              }
            },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["technical", "behavioral", "hr", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Interview Question Error:", err);
    res.status(500).json({ error: err.message || "Failed to generate interview questions." });
  }
});

// FEATURE 7: Mock Interview Evaluation
app.post("/api/mock-interview/evaluate", async (req, res) => {
  try {
    const ai = getAi();
    const { targetRole, experienceLevel, currentQuestion, userAnswer, history = [] } = req.body;

    if (!currentQuestion) {
      return res.status(400).json({ error: "currentQuestion is required." });
    }

    const historyPrompt = history.length > 0 
      ? `Previous questions and answers:\n${history.map((h: any) => `Q: ${h.question}\nA: ${h.answer}\nEvaluation Score: ${h.score}/10`).join("\n\n")}\n\n`
      : "";

    const prompt = `Conduct a realistic technical/mock interview for:
- Target Role: "${targetRole || "Software Engineer"}"
- Experience Level: "${experienceLevel || "Entry Level"}"

${historyPrompt}Evaluate the candidate's latest response:
Latest Question: "${currentQuestion}"
Latest User Answer: "${userAnswer || "[No response provided or skipped]"}"

Evaluate and score this response (out of 10). Provide specific strengths, detailed weaknesses/omissions, a significantly improved/model answer, and then formulate the NEXT logical interview question to keep the realistic flow. Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.INTEGER, description: "A score from 1 to 10 for the user's answer." },
            strengths: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Key strong elements of their answer." },
            weaknesses: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Missing concepts or areas to improve in their answer." },
            improvedAnswer: { type: Type.STRING, description: "A highly polished model answer for this question." },
            nextQuestion: { type: Type.STRING, description: "The next single interview question to ask the user." },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["score", "strengths", "weaknesses", "improvedAnswer", "nextQuestion", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Mock Interview Evaluation Error:", err);
    res.status(500).json({ error: err.message || "Failed to evaluate response." });
  }
});

// FEATURE 8: Voice Interview Mode
app.post("/api/voice-interview/evaluate", async (req, res) => {
  try {
    const ai = getAi();
    const { targetRole, question, transcript } = req.body;

    if (!question || !transcript) {
      return res.status(400).json({ error: "question and transcript are required." });
    }

    const prompt = `Evaluate the spoken answer transcript for:
Target Role: "${targetRole || "Candidate"}"
Interview Question: "${question}"
User's Spoken Answer Transcript: "${transcript}"

Since this is a spoken/speech-to-text response:
- Ignore minor grammar or disfluency mistakes caused by raw speaking / transcription errors.
- Evaluate Communication Clarity (out of 100).
- Evaluate Confidence based on language flow, power words, and structure (out of 100).
- Evaluate Technical Accuracy (out of 100).

Your feedback text (including feedback, strengths, weaknesses) and overall tips MUST be under 250 words total and highly student-friendly.
Provide:
1. Readiness Score (overallScore, out of 100)
2. Strengths (in the feedback string, clearly list Strengths)
3. Weaknesses (in the feedback string, clearly list Weaknesses)
4. Top 5 Improvements (improvementTips array, MUST contain exactly 5 specific tips)

Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            communicationScore: { type: Type.INTEGER, description: "Communication clarity score (0-100)" },
            confidenceScore: { type: Type.INTEGER, description: "Confidence score (0-100)" },
            technicalScore: { type: Type.INTEGER, description: "Technical accuracy score (0-100)" },
            overallScore: { type: Type.INTEGER, description: "Readiness score (0-100)" },
            feedback: { type: Type.STRING, description: "Constructive feedback under 250 words, detailing Strengths and Weaknesses." },
            improvementTips: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Top 5 improvements to make (Exactly 5 items)." },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["communicationScore", "confidenceScore", "technicalScore", "overallScore", "feedback", "improvementTips", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Voice Interview Evaluation Error:", err);
    res.status(500).json({ error: err.message || "Failed to evaluate speech response." });
  }
});

// FEATURE 8.5: Voice Transcript Grammar/Punctuation Cleaner
app.post("/api/voice-interview/clean-transcript", async (req, res) => {
  try {
    const { transcript } = req.body;
    if (!transcript || !transcript.trim()) {
      return res.status(400).json({ error: "Transcript is required and cannot be empty." });
    }

    const prompt = `You are a helpful assistant. Correct the grammar, punctuation, and capitalization of the following raw speech-to-text transcript while preserving the exact original meaning and professional style of the candidate's response. Do NOT add any introductory explanation or conversational filler, and do NOT wrap it in quotes. Return ONLY the polished professional transcript text itself:

"${transcript}"`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const cleanedText = response.text ? response.text.trim() : transcript;
    res.json({ cleanedTranscript: cleanedText });
  } catch (err: any) {
    console.error("Clean Transcript Error:", err);
    res.status(500).json({ error: err.message || "Failed to clean transcript." });
  }
});

// FEATURE 9: Placement Readiness Score
app.post("/api/placement-readiness", async (req, res) => {
  try {
    const ai = getAi();
    const { resume, skills, projects, interviewPerformance, communication } = req.body;

    const prompt = `Calculate a comprehensive Placement Readiness Score based on the candidate's profile:
- Resume / Profile Details: ${resume || "Not fully specified"}
- Technical Skills: ${skills || "Not fully specified"}
- Projects / Experience: ${projects || "Not fully specified"}
- Mock Interview Performance level or history: ${interviewPerformance || "Not assessed yet"}
- Communication skills assessment: ${communication || "Not fully assessed"}

Provide:
1. Resume Quality score (0-100)
2. Technical Skills score (0-100)
3. Projects quality score (0-100)
4. Communication score (0-100)
5. Interview Readiness score (0-100)
6. Overall Placement Readiness index (0-100)
- A detailed explanation of these scores.
- A tailored improvement plan with clear next steps.
- Conclude with exactly 3 actions to take next.`;

    const response = await generateContentWithRetry({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            resumeQuality: { type: Type.INTEGER },
            technicalSkills: { type: Type.INTEGER },
            projects: { type: Type.INTEGER },
            communication: { type: Type.INTEGER },
            interviewReadiness: { type: Type.INTEGER },
            overallPlacementReadiness: { type: Type.INTEGER },
            explanation: { type: Type.STRING, description: "Detailed explanation of the scores." },
            improvementPlan: { type: Type.ARRAY, items: { type: Type.STRING }, description: "A multi-pronged strategy to raise scores." },
            top3Actions: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Exactly 3 actions to take next." }
          },
          required: ["resumeQuality", "technicalSkills", "projects", "communication", "interviewReadiness", "overallPlacementReadiness", "explanation", "improvementPlan", "top3Actions"]
        }
      }
    });

    if (!response.text) {
      throw new Error("No response text from Gemini.");
    }

    res.json(JSON.parse(response.text));
  } catch (err: any) {
    console.error("Placement Readiness Score Error:", err);
    res.status(500).json({ error: err.message || "Failed to calculate placement readiness score." });
  }
});

// Configure Vite middleware in development or serve static files in production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
