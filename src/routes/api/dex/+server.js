import { json } from '@sveltejs/kit';
import { groq } from '$lib/groqClient';

export async function POST({ request }) {
	try {
		const { enrolledCourses, completedLessons, allLessons } = await request.json();

		const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

		let courseContext = 'The student has no courses enrolled yet.';
		if (enrolledCourses && enrolledCourses.length > 0) {
			courseContext = enrolledCourses.map(c => {
				const done = completedLessons?.filter(l => l.course_id === c.courseId).length || 0;
				const total = allLessons?.filter(l => l.course_id === c.courseId).length || 0;
				const pending = allLessons?.filter(l => l.course_id === c.courseId && !completedLessons?.find(cl => cl.material_id === l.id));
				const nextLesson = pending?.[0]?.title || null;
				return `Course: "${c.title}" | Progress: ${c.progress}% (${done}/${total} lessons done) | Next lesson: ${nextLesson || 'All done!'}`;
			}).join('\n');
		}

		const chatCompletion = await groq.chat.completions.create({
			messages: [
				{
					role: 'system',
					content: `You are Dex AI, a smart and friendly personal learning coach on an AI-powered LMS platform. Today is ${today}.

Your job is to:
1. Create a personalized "Today's Study Plan" — specific lessons the student should focus on today (2-3 max)
2. Give a motivational progress summary
3. Suggest what to tackle next after today

Student's course data:
${courseContext}

Respond ONLY as a valid JSON object with these exact keys:
{
  "greeting": "short personalized greeting (1 sentence)",
  "todayPlan": [
    { "courseTitle": string, "lessonTitle": string, "reason": string (max 12 words) }
  ],
  "progressSummary": "2 sentences max about overall progress",
  "nextUp": "1 sentence about what to focus on after today's plan",
  "motivationTag": "a very short motivational label like 'On Fire! 🔥' or 'Great Pace! 💪'"
}

Output ONLY the JSON. No markdown, no extra text.`
				}
			],
			model: 'llama-3.1-8b-instant',
			temperature: 0.75,
			max_tokens: 600
		});

		let raw = chatCompletion.choices[0]?.message?.content || '{}';
		raw = raw.replace(/```json/g, '').replace(/```/g, '').trim();
		const plan = JSON.parse(raw);

		return json({ plan });
	} catch (error) {
		console.error('Dex API Error:', error);
		return json({ error: 'Dex is unavailable right now.' }, { status: 500 });
	}
}
