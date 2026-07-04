export const geminiService = {
  async getVibeSuggestion(vibe: string, venueType: string) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vibe',
          payload: { vibe, venueType }
        })
      });
      const data = await response.json();
      return data.text || "⚠️ AI is cooling down. Focus on the floor.";
    } catch (error) {
      console.error("Gemini Proxy Error:", error);
      return "⚠️ AI is cooling down. Focus on the floor.";
    }
  },

  async getPrepPlan(items: string) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'prep',
          payload: { items }
        })
      });
      const data = await response.json();
      return data.text || "Prepare by speed-rail standards. Parallelize builds.";
    } catch (error) {
       console.error("Gemini Proxy Error:", error);
       return "Prepare by speed-rail standards. Parallelize builds.";
    }
  },

  async getManagerStrategy(stats: string) {
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'strategy',
          payload: { stats }
        })
      });
      const data = await response.json();
      return data.text || "Monitor real-time consumption patterns for immediate adjustments.";
    } catch (error) {
       console.error("Gemini Proxy Error:", error);
       return "Monitor real-time consumption patterns for immediate adjustments.";
    }
  }
};
