# CircuitMentor ⚡

An AI-powered circuit design assistant that helps students, hobbyists, and engineers understand electronic circuits through theory, calculations, and design recommendations.

## 🚀 Features

- 📖 Explains circuit theory in simple language
- 🔢 Provides step-by-step calculations
- ⚙️ Suggests circuit improvements and optimizations
- 🧮 Supports mathematical equations using KaTeX
- 💡 Includes quick example prompts
- 📱 Responsive modern UI
- ⚡ Fast AI-powered responses

---

## Preview

The application allows users to describe an electronic circuit problem and receive structured responses divided into:

- **Theory & Principles**
- **Step-by-Step Calculations**
- **Design Improvements**

---

## Technologies Used

### Frontend
- HTML5
- CSS3
- Vanilla JavaScript

### Libraries
- KaTeX (Math Rendering)
- Google Fonts
  - Space Mono
  - Syne

### Backend
- REST API (`/api/chat`)
- Compatible with LLMs such as Google Gemini

---

## API Response Format

The backend should return JSON in the following format:

```json
{
  "theory": "...",
  "calculations": "...",
  "improvements": "..."
}
```

---

## Example Prompt

```
I have a 9V battery and want to power a red LED requiring 20mA.
What resistor should I use?
```

The AI returns:

- Circuit explanation
- Formula derivation
- Resistor calculation
- Practical design tips

---

## Future Improvements

- Image upload for circuit diagrams
- Circuit simulation support
- Component recommendations
- Export answers as PDF
- Conversation history
- Dark/Light theme toggle
- SPICE integration
- Voice input

---

## Target Users

- Electronics students
- Engineering learners
- Teachers

---

## Development

This project was rapidly prototyped using AI-assisted development tools and then customized, tested, and refined through iterative development. The focus was on creating a clean user experience and integrating an AI backend for structured circuit analysis.

Developed with ❤️ to make learning electronics easier using AI.
