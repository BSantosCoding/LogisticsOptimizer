
import { GoogleGenAI } from "@google/genai";
import { Deal, Product, OptimizationPriority, OptimizationResult } from "../types";
import { calculatePacking } from "./logisticsEngine";

export const optimizeLogistics = async (
  products: Product[],
  deals: Deal[],
  priority: OptimizationPriority,
  marginPercentage: number,
  ignoreWeight: boolean,
  ignoreVolume: boolean
): Promise<OptimizationResult> => {
  
  // 1. Deterministic Calculation (The Math)
  const { assignments, unassigned } = calculatePacking(products, deals, marginPercentage, priority, ignoreWeight, ignoreVolume);
  
  const totalCost = assignments.reduce((sum, a) => sum + a.deal.cost, 0);

  // 2. AI Safety & Efficiency Analysis
  let reasoning = "";
  
  try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const model = "gemini-2.5-flash"; 
      
      // Prepare data for the LLM
      const promptData = {
          assignments: assignments.map(a => ({
              container: a.deal.carrierName,
              type: a.deal.containerType,
              contents: a.assignedProducts.map(p => ({
                  name: p.name,
                  unNumber: p.unNumber,
                  hazardClass: p.hazardClass,
                  weight: p.weightKg
              }))
          })),
          unassigned: unassigned.map(p => ({
              name: p.name,
              reason: "Capacity or Constraints",
              hazmat: `${p.unNumber || ''} ${p.hazardClass || ''}`
          }))
      };

      const prompt = `
      You are a Chemical Logistics Safety Officer (IMDG Code/49 CFR Specialist). Review this packing plan.
      
      Plan Data: ${JSON.stringify(promptData)}
      
      Task:
      1. SAFETY CHECK: Scan for incompatible goods packed in the same container based on Hazard Class (e.g., Oxidizers 5.1 with Flammables 3, Corrosives 8, etc.). If products have UN numbers, use them for specific checks.
      2. SUMMARY: Briefly analyze the cost and load efficiency.
      3. UNASSIGNED: Explain why items might be left behind (focus on restrictions vs capacity).
      
      Format:
      - If Dangerous Goods incompatibilities are found, start with "🔴 SAFETY WARNING".
      - If clear, start with "🟢 SAFETY CHECK PASSED".
      - Use bullet points.
      - Keep it under 150 words.
      `;

      const response = await ai.models.generateContent({
          model,
          contents: prompt
      });
      
      reasoning = response.text || "AI Analysis completed but returned no text.";

  } catch (error) {
      console.error("Gemini Error:", error);
      reasoning = "⚠️ AI Analysis Unavailable (Check API Key).\n\n" + 
      `Optimization complete using ${priority} priority.\n` + 
      `${assignments.length} containers used. ${unassigned.length} items unassigned.`;
  }

  return {
    assignments,
    unassignedProducts: unassigned,
    totalCost,
    reasoning,
    safetyMarginUsed: marginPercentage
  };
};
