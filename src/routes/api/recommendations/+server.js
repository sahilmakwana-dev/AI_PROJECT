import { json } from '@sveltejs/kit';
import { groq } from '$lib/groqClient';

export async function POST({ request }) {
	try {
		let context = 'No courses enrolled yet. Suggest beginner-friendly courses.';
		try {
			const body = await request.json();
			if (body?.context) context = body.context;
		} catch (_) {}

		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `You are an intelligent learning assistant on an AI LMS platform. The student is currently enrolled in these courses: ${context}. Based on this real data, generate exactly 3 highly personalized course recommendations that are different from their existing courses and complement their learning journey. Return your response as a valid JSON array of objects. Each object must have these exact keys: "title" (string), "reason" (string, specifically reference their enrolled courses to explain why this recommendation fits), "matchScore" (number between 80 and 99), and "icon" (a Remix Icon class string, like "ri-brain-line" or "ri-database-2-line"). Do not include any markdown formatting, code blocks, or text outside of the JSON array. Output ONLY the JSON array.`
				}
			],
			model: 'llama-3.1-8b-instant',
			temperature: 0.7,
			max_tokens: 1024
		});

		let rawContent = chatCompletion.choices[0]?.message?.content || '[]';
		rawContent = rawContent.replace(/```json/g, '').replace(/```/g, '').trim();
		const recommendations = JSON.parse(rawContent);
		
		return json({ recommendations });
	} catch (error) {
		console.error("Groq API Error:", error);
		return json({ error: 'Failed to generate recommendations' }, { status: 500 });
	}
}
