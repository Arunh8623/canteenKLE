// services/openai.js — OpenAI API integrations
const OpenAI = require('openai');
const fs     = require('fs');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─────────────────────────────────────────────────────────────
// 1. CHATBOT — Answer questions about a stall's menu
// ─────────────────────────────────────────────────────────────
const chatWithMenu = async (stallName, menuItems, userMessage, conversationHistory = []) => {
  const menuContext = menuItems.map(item =>
    `- ${item.name} (${item.category}, ₹${item.price}, ${item.is_veg ? 'Veg' : 'Non-Veg'}, ${item.is_available ? 'Available' : 'Unavailable'}): ${item.description || ''}`
  ).join('\n');

  const systemPrompt = `You are a helpful and friendly food assistant for "${stallName}" canteen stall at KLE Technological University.
Your job is to help students and staff find the right food items.

Current Menu:
${menuContext}

Guidelines:
- Answer queries about items, prices, availability, dietary preferences (veg/non-veg)
- Suggest items based on budget, preferences, or time constraints
- Be concise, friendly, and helpful
- If asked about items not on the menu, politely say they're not available
- Format prices as ₹XX
- You can mention estimated prep times if relevant`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.slice(-6), // keep last 3 exchanges for context
    { role: 'user', content: userMessage },
  ];

  const response = await openai.chat.completions.create({
    model:      'gpt-4o-mini',
    messages,
    max_tokens: 400,
    temperature: 0.7,
  });

  return {
    reply:  response.choices[0].message.content,
    tokens: response.usage?.total_tokens || 0,
  };
};

// ─────────────────────────────────────────────────────────────
// 2. SMART SUGGESTIONS — Recommend items based on cart
// ─────────────────────────────────────────────────────────────
const getSuggestions = async (cartItems, allMenuItems) => {
  const cartSummary = cartItems.map(i => `${i.name} x${i.quantity} (₹${i.price})`).join(', ');
  const availableItems = allMenuItems
    .filter(i => i.is_available && !cartItems.find(c => c.menu_item_id === i.id))
    .map(i => `${i.name} (₹${i.price}, ${i.category})`).join(', ');

  if (!availableItems) return [];

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{
      role: 'user',
      content: `A student at a college canteen has these items in their cart: ${cartSummary}.
Available items NOT in cart: ${availableItems}.
Suggest 2-3 complementary items that would pair well with their order.
Respond ONLY with a JSON array of item names, e.g. ["Filter Coffee", "Masala Vada"]
No explanation, just the JSON array.`,
    }],
    max_tokens: 100,
    temperature: 0.5,
  });

  try {
    const text = response.choices[0].message.content.trim();
    const cleaned = text.replace(/```json|```/g, '').trim();
    const names = JSON.parse(cleaned);
    return allMenuItems.filter(item => names.includes(item.name) && item.is_available);
  } catch {
    return [];
  }
};

// ─────────────────────────────────────────────────────────────
// 3. MENU OCR — Extract menu items from image (Vision)
// ─────────────────────────────────────────────────────────────
const extractMenuFromImage = async (imagePath) => {
  const imageBuffer = fs.readFileSync(imagePath);
  const base64Image = imageBuffer.toString('base64');
  const ext         = imagePath.split('.').pop().toLowerCase();
  const mimeType    = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : `image/${ext}`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
        {
          type: 'text',
          text: `This is a menu from a college canteen in India. Extract all menu items from this image.
Return ONLY a valid JSON array. Each object must have:
- "name": item name (string)
- "price": numeric price in INR (number, no ₹ symbol)
- "category": food category like "Breakfast", "Meals", "Snacks", "Beverages", etc. (string)
- "is_veg": true if vegetarian, false if non-vegetarian (boolean)
- "description": short description if visible, else empty string

Example: [{"name":"Masala Dosa","price":45,"category":"Breakfast","is_veg":true,"description":"Crispy dosa with potato filling"}]

Return ONLY the JSON array, no explanation, no markdown.`,
        },
      ],
    }],
    max_tokens: 2000,
  });

  const text    = response.choices[0].message.content.trim();
  const cleaned = text.replace(/```json|```/g, '').trim();
  const items   = JSON.parse(cleaned);
  return items;
};

module.exports = { chatWithMenu, getSuggestions, extractMenuFromImage };