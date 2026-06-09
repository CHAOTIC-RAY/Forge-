const text = `
\`\`\`json
{
  "message": "Hello! 👋",
  "action": "update",
  "tool_call": {"name": "search_web", "query": "JSON: { \\"name\\": \\"JSON\\", \\"type\\": \\"object\\" }"}
}
\`\`\`
`;

const safeParseJSON = (text) => {
  if (!text) return null;
  try {
    let cleaned = text.trim();
    cleaned = cleaned.replace(/^```json/g, '').replace(/```$/g, '').trim();
    
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end !== -1) {
      cleaned = cleaned.substring(start, end + 1);
    }
    cleaned = cleaned.replace(/"([^"]+)"\s*=\s*"/g, '"$1": "');
    cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("Failed to parse", e);
    return null;
  }
}

console.log(safeParseJSON(text));
