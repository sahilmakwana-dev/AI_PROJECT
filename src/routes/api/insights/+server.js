import { json } from '@sveltejs/kit';
import { groq } from '$lib/groqClient';

export async function POST({ request }) {
	try {
		const { enrolledCourses } = await request.json();

		let coursesSummary = 'No courses enrolled yet.';
		if (enrolledCourses && enrolledCourses.length > 0) {
			coursesSummary = enrolledCourses
				.map(c => `"${c.title}": ${c.progress}% complete`)
				.join('; ');
		}

		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `You are an AI performance coach for a Learning Management System. 
Analyze the student's course progress and generate exactly 3 concise, actionable insights.

Student's current progress: ${coursesSummary}

Return ONLY a valid JSON array of 3 objects. Each object must have:
- "title": short insight title (max 6 words)
- "message": actionable advice (max 20 words)  
- "type": one of "success", "warning", "info", or "tip"
- "icon": a Remix Icon class (e.g. "ri-fire-line", "ri-trophy-line", "ri-time-line", "ri-lightbulb-line")

Output ONLY the JSON array, no markdown, no extra text.`
				}
			],
			model: 'llama-3.1-8b-instant',
			temperature: 0.6,
			max_tokens: 512
		});

		let raw = chatCompletion.choices[0]?.message?.content || '[]';
		raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
		const insights = JSON.parse(raw);

		return json({ insights });
	} catch (error) {
		console.error('Insights API Error:', error);
		return json({ error: 'Failed to generate insights' }, { status: 500 });
	}
}
