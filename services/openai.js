// services/openai.js — Groq AI integrations (free, no billing needed)
const fs = require('fs');

const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.1-8b-instant';

const groqChat = async (messages) => {
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({ model: MODEL, messages, max_tokens: 400, temperature: 0.7 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message || JSON.stringify(data));
  return data.choices[0].message.content;
};

// ─────────────────────────────────────────────────────────────
// 1. CHATBOT — Answer questions about a stall's menu
// ─────────────────────────────────────────────────────────────
const chatWithMenu = async (stallName, menuItems, userMessage, conversationHistory = []) => {
  const menuContext = menuItems.map(item =>
    `- ${item.name} (${item.category}, Rs.${item.price}, ${item.is_veg ? 'Veg' : 'Non-Veg'}, ${item.is_available ? 'Available' : 'Unavailable'}): ${item.description || ''}`
  ).join('\n');

  const messages = [
    {
      role: 'system',
      content: `You are a helpful and friendly food assistant for "${stallName}" canteen stall at KLE Technological University.
Your job is to help students and staff find the right food items.

Current Menu:
${menuContext}

Guidelines:
- Answer queries about items, prices, availability, dietary preferences (veg/non-veg)
- Suggest items based on budget, preferences, or time constraints
- Be concise, friendly, and helpful
- If asked about items not on the menu, politely say they are not available
- Format prices as Rs.XX`,
    },
    ...conversationHistory.slice(-6).map(m => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    { role: 'user', content: userMessage },
  ];

  const reply = await groqChat(messages);
  return { reply, tokens: 0 };
};

// ─────────────────────────────────────────────────────────────
// 2. SMART SUGGESTIONS — Recommend items based on cart
// ─────────────────────────────────────────────────────────────
const getSuggestions = async (cartItems, allMenuItems) => {
  const cartSummary = cartItems.map(i => `${i.name} x${i.quantity} (Rs.${i.price})`).join(', ');
  const availableItems = allMenuItems
    .filter(i => i.is_available && !cartItems.find(c => c.menu_item_id === i.id))
    .map(i => `${i.name} (Rs.${i.price}, ${i.category})`).join(', ');

  if (!availableItems) return [];

  const messages = [{
    role: 'user',
    content: `A student at a college canteen has these items in their cart: ${cartSummary}.
Available items NOT in cart: ${availableItems}.
Suggest 2-3 complementary items that would pair well with their order.
Respond ONLY with a JSON array of item names, e.g. ["Filter Coffee", "Masala Vada"]
No explanation, just the JSON array.`,
  }];

  try {
    const text = await groqChat(messages);
    const cleaned = text.replace(/```json|```/g, '').trim();
    const names = JSON.parse(cleaned);
    return allMenuItems.filter(item => names.includes(item.name) && item.is_available);
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// 3. MENU OCR — Extract menu items from image
// Note: Groq vision support is limited, using text fallback
// ─────────────────────────────────────────────────────────────
const extractMenuFromImage = async (imagePath) => {
  // Groq doesn't support vision yet — return empty and let admin enter manually
  throw new Error('Menu OCR requires vision AI. Please enter menu items manually.');
};

module.exports = { chatWithMenu, getSuggestions, extractMenuFromImage };