import { json } from '@sveltejs/kit';
import { groq } from '$lib/groqClient';

export async function POST({ request }) {
	try {
		const { messages, userContext } = await request.json();

		const systemPrompt = `You are Dex, an intelligent and friendly personal AI learning coach on an AI-powered LMS called "AI LMS".

Your personality: encouraging, concise, smart, and action-oriented. You call yourself "Dex" — never "AI" or "assistant".

You help students with:
- Building personalized study plans (suggest specific lessons to do today/this week)
- Course enrollment guidance (recommend which courses to take based on goals)
- Progress tracking and motivation
- Answering questions about course content
- Setting learning goals and study schedules

Student data: ${userContext || 'Guest user, not enrolled in any courses yet.'}

Platform routes:
- Browse courses: /courses
- Student dashboard: /student/dashboard
- Performance analytics: /performance
- AI Recommendations: /recommendations

Rules:
- Always refer to yourself as "Dex"
- Be warm but concise — max 100 words per response
- When suggesting lessons/courses, be specific (mention actual lesson names if available in the context)
- Use emojis occasionally to keep it lively
- If asked for a study plan, give day-by-day structure`;

		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{ role: 'system', content: systemPrompt },
				...messages
			],
			model: 'llama-3.1-8b-instant',
			temperature: 0.75,
			max_tokens: 350
		});

		const reply = chatCompletion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';
		return json({ reply });

	} catch (error) {
		console.error('Dex Chat API Error:', error);
		return json({ reply: "Hmm, I'm having a moment. Try again in a sec! 🔄" }, { status: 500 });
	}
}
