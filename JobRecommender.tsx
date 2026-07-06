export interface ResumeAnalysisResponse {
  resumeScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  atsCompatibility: string;
  improvementSuggestions: string[];
  recruiterFeedback: string;
  top3Actions: string[];
}

export interface SkillGapResponse {
  readinessScore: number;
  existingSkills: string[];
  missingSkills: string[];
  prioritySkills: string[];
  learningSequence: {
    timeframe: string;
    content: string;
  }[];
  top3Actions: string[];
}

export interface CareerOption {
  title: string;
  description: string;
  whyItFits: string;
  requiredSkills: string[];
  expectedOpportunities: string;
}

export interface CareerRecommendationResponse {
  careers: CareerOption[];
  top3Actions: string[];
}

export interface RoadmapMonth {
  month: string;
  topics: string[];
  projects: string[];
  resources: string[];
}

export interface LearningRoadmapResponse {
  months: RoadmapMonth[];
  top3Actions: string[];
}

export interface RecommendedJob {
  role: string;
  matchScore: number;
  whyRecommended: string;
  missingSkills: string[];
  preparationTips: string;
}

export interface JobRecommendationsResponse {
  jobs: RecommendedJob[];
  top3Actions: string[];
}

export interface QuestionItem {
  question: string;
  difficulty: string;
}

export interface InterviewQuestionsResponse {
  technical: QuestionItem[];
  behavioral: QuestionItem[];
  hr: QuestionItem[];
  top3Actions: string[];
}

export interface MockInterviewResponse {
  score: number;
  strengths: string[];
  weaknesses: string[];
  improvedAnswer: string;
  nextQuestion: string;
  top3Actions: string[];
}

export interface VoiceInterviewResponse {
  communicationScore: number;
  confidenceScore: number;
  technicalScore: number;
  overallScore: number;
  feedback: string;
  improvementTips: string[];
  top3Actions: string[];
}

export interface PlacementReadinessResponse {
  resumeQuality: number;
  technicalSkills: number;
  projects: number;
  communication: number;
  interviewReadiness: number;
  overallPlacementReadiness: number;
  explanation: string;
  improvementPlan: string[];
  top3Actions: string[];
}

export type ActiveTab = 
  | "resume"
  | "skillgap"
  | "careers"
  | "roadmap"
  | "jobs"
  | "questions"
  | "mock"
  | "voice"
  | "readiness";
