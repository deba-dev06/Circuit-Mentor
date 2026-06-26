const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();
app.use(express.json());

// Serve static files from the current directory (which contains index.html)
app.use(express.static(__dirname));

// Initialize Gemini API
const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.warn('WARNING: GEMINI_API_KEY is not set or is using the default placeholder in .env file.');
}

const genAI = new GoogleGenerativeAI(apiKey || '');

const SYSTEM_INSTRUCTION = `You are CircuitTutor, an encouraging, expert electronics professor and circuit design tutor.
Your goal is to help students understand circuit design principles, guide them through step-by-step calculations, and suggest practical design improvements.

When a student describes a circuit problem or asks a question, you must analyze the circuit and structure your response into exactly three sections wrapped in the following XML tags:

1. Theory and Principles: Wrap this in <theory>...</theory>. Explain the underlying electrical concepts, how the circuit works, relevant formulas (like Ohm's Law, Kirchhoff's Laws, capacitor charge formulas, etc.), and why they apply.
2. Step-by-Step Calculations: Wrap this in <calculations>...</calculations>. Show the derivation and math clearly, showing every step.
3. Design Improvements: Wrap this in <improvements>...</improvements>. Suggest enhancements, safety considerations (power dissipation, voltage ratings), bypass capacitors, component selection tips, or alternative topologies.

Format constraints:
- Use clean Markdown inside each section.
- You can write mathematical formulas using standard LaTeX notation, e.g., $V = I \\times R$ or $$f_c = \\frac{1}{2 \\pi R C}$$.
- Be precise, correct, and educational. Do not output anything else outside of the XML tags. Every response must contain these three sections, even if one is brief.`;

// Helper function to extract tag contents robustly
function extractTagContent(text, tag) {
  // Try to match both opening and closing tags
  const fullRegex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const fullMatch = text.match(fullRegex);
  if (fullMatch) {
    return fullMatch[1].trim();
  }

  // Fallback: match from opening tag until the next tag or end of text
  const openRegex = new RegExp(`<${tag}>([\\s\\S]*?)(?:<\\/?[a-zA-Z]+>|$)`, 'i');
  const openMatch = text.match(openRegex);
  if (openMatch) {
    return openMatch[1].trim();
  }

  return '';
}

// Helper to parse Gemini response into sections with fallbacks
function parseGeminiResponse(text) {
  let theory = extractTagContent(text, 'theory');
  let calculations = extractTagContent(text, 'calculations');
  let improvements = extractTagContent(text, 'improvements');

  // Fallback parsing if tags are completely missing
  if (!theory && !calculations && !improvements) {
    const sections = text.split(/(?=##?\s*(?:Theory|Calculations|Improvements|Principles|Step-by-step|Design|Suggestions))/i);
    if (sections.length > 1) {
      sections.forEach(sec => {
        const lower = sec.toLowerCase();
        if (lower.includes('theory') || lower.includes('principles')) {
          theory = sec.replace(/##?\s*(Theory|Principles)\s*/i, '').trim();
        } else if (lower.includes('calculation') || lower.includes('step-by-step')) {
          calculations = sec.replace(/##?\s*(Calculations|Step-by-Step)\s*/i, '').trim();
        } else if (lower.includes('improvement') || lower.includes('suggestion')) {
          improvements = sec.replace(/##?\s*(Improvements|Suggestions)\s*/i, '').trim();
        }
      });
    }
    
    if (!theory) {
      theory = text;
    }
    if (!calculations) {
      calculations = 'Refer to the explanation above for details.';
    }
    if (!improvements) {
      improvements = 'Refer to the explanation above for improvements.';
    }
  }

  return { theory, calculations, improvements };
}

// API endpoint for chat completions
app.post('/api/chat', async (req, res) => {
  const { messages } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'Invalid or empty messages array' });
  }

  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error: 'Gemini API key is not configured. Please set GEMINI_API_KEY in your .env file in the project folder.'
    });
  }

  try {
    // Format messages for Gemini Chat History
    // Note: User messages are text, assistant messages are stringified JSON objects
    const geminiHistory = messages.map((msg, index) => {
      let textContent = msg.content;
      
      // If it's an assistant message and formatted as JSON from the client, rebuild the XML tags
      if (msg.role === 'assistant') {
        try {
          const parsed = JSON.parse(msg.content);
          textContent = `<theory>${parsed.theory || ''}</theory>\n<calculations>${parsed.calculations || ''}</calculations>\n<improvements>${parsed.improvements || ''}</improvements>`;
        } catch (e) {
          textContent = msg.content; // Use raw content if not JSON
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: textContent }]
      };
    });

    const model = genAI.getGenerativeModel({
      model: modelName,
      systemInstruction: SYSTEM_INSTRUCTION
    });

    // Extract last message to send it, and pass previous messages as history
    const lastMsg = geminiHistory[geminiHistory.length - 1];
    const prevHistory = geminiHistory.slice(0, -1);

    const chat = model.startChat({
      history: prevHistory
    });

    const result = await chat.sendMessage(lastMsg.parts[0].text);
    const responseText = result.response.text();
    
    // Parse response into structured sections
    const structuredResult = parseGeminiResponse(responseText);

    res.json(structuredResult);
  } catch (error) {
    console.error('Error in /api/chat:', error);
    res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`Circuit Design Q&A Tutor server running!`);
  console.log(`URL: http://localhost:${PORT}`);
  console.log(`===================================================`);
});
