const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';

if (!apiKey || apiKey === 'your_gemini_api_key_here') {
  console.error('ERROR: GEMINI_API_KEY is not configured in your .env file.');
  console.error('Please configure it before running the tests.');
  process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

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

// Parsing function to test
function parseResponse(text) {
  const theory = extractTagContent(text, 'theory');
  const calculations = extractTagContent(text, 'calculations');
  const improvements = extractTagContent(text, 'improvements');
  return { theory, calculations, improvements };
}

// Test cases definition
const TEST_CASES = [
  {
    name: 'Voltage Divider',
    prompt: 'I have a 12V supply and want a 5V output under a no-load condition. How do I choose the resistor values?'
  },
  {
    name: 'RC Low-Pass Filter',
    prompt: 'I need to design a passive RC low-pass filter with a cutoff frequency of 1kHz. What values of R and C should I use?'
  },
  {
    name: 'Op-Amp Amplifier',
    prompt: 'I need a non-inverting amplifier with a voltage gain of 11. I am using a standard op-amp. What resistors should I choose?'
  },
  {
    name: 'LED Driver Circuit',
    prompt: 'How do I power a blue LED (forward voltage 3.2V, forward current 20mA) from a 5V microcontroller pin?'
  },
  {
    name: 'BJT Switch Circuit',
    prompt: 'I want to use an NPN transistor (2N3904) to switch a 12V relay that draws 50mA. How do I calculate the base resistor value using a 5V control signal?'
  }
];

async function runTests() {
  console.log(`===================================================`);
  console.log(`Starting Circuit Design Q&A Tutor Test Suite`);
  console.log(`Using model: ${modelName}`);
  console.log(`===================================================`);

  const model = genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: SYSTEM_INSTRUCTION
  });

  let passed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const tc = TEST_CASES[i];
    console.log(`\n[Test Case ${i + 1}/${TEST_CASES.length}] Testing: ${tc.name}`);
    console.log(`Prompt: "${tc.prompt}"`);
    console.log(`Sending request to Gemini...`);
    
    try {
      const result = await model.generateContent(tc.prompt);
      const text = result.response.text();
      
      console.log(`Parsing response tags...`);
      const parsed = parseResponse(text);

      let tcPassed = true;
      const issues = [];

      if (!parsed.theory) {
        tcPassed = false;
        issues.push('Missing <theory> section');
      }
      if (!parsed.calculations) {
        tcPassed = false;
        issues.push('Missing <calculations> section');
      }
      if (!parsed.improvements) {
        tcPassed = false;
        issues.push('Missing <improvements> section');
      }

      if (tcPassed) {
        passed++;
        console.log(`\x1b[32m✔ SUCCESS: All XML tags successfully parsed for ${tc.name}!\x1b[0m`);
        console.log(`Theory length: ${parsed.theory.length} chars`);
        console.log(`Calculations length: ${parsed.calculations.length} chars`);
        console.log(`Improvements length: ${parsed.improvements.length} chars`);
        
        // Output a small preview of the calculation step
        const calcLines = parsed.calculations.split('\n').filter(l => l.trim()).slice(0, 2);
        console.log(`Calculations preview:\n   > ${calcLines.join('\n   > ')}...`);
      } else {
        console.log(`\x1b[31m✘ FAILED: ${tc.name} failed validation!\x1b[0m`);
        console.log(`Issues: ${issues.join(', ')}`);
        console.log(`Raw Output preview:\n`, text.substring(0, 300) + '...\n');
      }
    } catch (error) {
      console.log(`\x1b[31m✘ ERROR: Failed to execute request for ${tc.name}\x1b[0m`);
      console.error(error);
    }
  }

  console.log(`\n===================================================`);
  console.log(`Test Suite Completed!`);
  console.log(`Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`===================================================`);

  if (passed === TEST_CASES.length) {
    console.log(`\x1b[32mAll test cases passed successfully!\x1b[0m`);
    process.exit(0);
  } else {
    console.log(`\x1b[31mSome test cases failed. Please review response formats above.\x1b[0m`);
    process.exit(1);
  }
}

runTests();
