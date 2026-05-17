<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let currentUser = $state(null);
	let enrolledCourses = $state([]);
	let isGenerating = $state(false);
	let isLoading = $state(true);

	let recommendations = $state([]);

	const colorPalette = [
		{ color: 'text-rose-600', bg: 'bg-rose-50 border border-rose-100', icon: 'ri-brain-line' },
		{ color: 'text-emerald-600', bg: 'bg-emerald-50 border border-emerald-100', icon: 'ri-bar-chart-grouped-line' },
		{ color: 'text-blue-600', bg: 'bg-blue-50 border border-blue-100', icon: 'ri-code-s-slash-line' },
		{ color: 'text-amber-600', bg: 'bg-amber-50 border border-amber-100', icon: 'ri-lightbulb-line' },
		{ color: 'text-purple-600', bg: 'bg-purple-50 border border-purple-100', icon: 'ri-rocket-line' },
	];

	onMount(async () => {
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);

		// Load enrolled courses to give AI context
		const { data } = await supabase
			.from('enrollments')
			.select('progress, courses(title)')
			.eq('user_id', currentUser.id);

		if (data) {
			enrolledCourses = data.map(e => ({
				title: e.courses?.title || 'Unknown',
				progress: e.progress || 0
			}));
		}

		isLoading = false;

		// Auto-generate on first load
		await generateNewRecommendations();
	});

	async function generateNewRecommendations() {
		isGenerating = true;
		try {
			const context = enrolledCourses.length > 0
				? enrolledCourses.map(c => `"${c.title}" (${c.progress}% complete)`).join(', ')
				: 'No courses enrolled yet';

			const response = await fetch('/api/recommendations', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ context })
			});
			const data = await response.json();
			if (data.recommendations) {
				recommendations = data.recommendations.map((rec, i) => ({
					...rec,
					...colorPalette[i % colorPalette.length]
				}));
			}
		} catch (error) {
			console.error("Failed to fetch recommendations:", error);
		} finally {
			isGenerating = false;
		}
	}
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
		<div>
			<h1 class="text-3xl font-black text-slate-800 flex items-center gap-3">
				<i class="ri-magic-line text-primary"></i> AI Recommendations
			</h1>
			<p class="mt-2 text-slate-500 font-semibold">Personalized course suggestions powered by your real learning history.</p>
		</div>
		<button onclick={generateNewRecommendations} disabled={isGenerating} class="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2">
			{#if isGenerating}
				<i class="ri-loader-4-line animate-spin"></i> Analyzing...
			{:else}
				<i class="ri-refresh-line"></i> Refresh Insights
			{/if}
		</button>
	</div>

	<!-- AI Context Card showing what data is being used -->
	<div class="bg-gradient-to-r from-slate-50 to-indigo-50/30 rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm relative overflow-hidden">
		<div class="absolute right-0 top-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
		<div class="relative z-10 flex flex-col md:flex-row gap-6 items-start md:items-center">
			<div class="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shrink-0 shadow-md">
				<i class="ri-robot-2-fill text-3xl"></i>
			</div>
			<div class="flex-1">
				<h3 class="text-xl font-black text-slate-800 mb-2">Dex AI Learning Assistant</h3>
				{#if enrolledCourses.length === 0}
					<p class="text-slate-600 leading-relaxed font-semibold">You haven't enrolled in any courses yet. I'll suggest some great starting points for you!</p>
				{:else}
					<p class="text-slate-600 leading-relaxed mb-3 font-semibold">I've analyzed your current courses and progress. Here's what I found:</p>
					<div class="flex flex-wrap gap-2.5">
						{#each enrolledCourses as course}
							<span class="bg-white border border-slate-200 text-slate-700 text-xs px-3.5 py-2 rounded-full flex items-center gap-1.5 font-bold shadow-sm">
								<span class="w-2.5 h-2.5 rounded-full {course.progress >= 100 ? 'bg-emerald-500' : course.progress > 50 ? 'bg-blue-500' : 'bg-amber-500'}"></span>
								{course.title} — {course.progress}%
							</span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>

	<!-- Recommendations List -->
	{#if isGenerating && recommendations.length === 0}
		<div class="flex flex-col items-center justify-center h-48 gap-4 text-slate-500 font-semibold">
			<i class="ri-loader-4-line animate-spin text-4xl text-primary"></i>
			<p>Analyzing your learning profile...</p>
		</div>
	{:else if recommendations.length === 0}
		<div class="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-300 text-slate-550 shadow-sm font-semibold">
			<i class="ri-magic-line text-5xl mb-4 block opacity-40"></i>
			<p>No recommendations generated yet. Click "Refresh Insights" to get started.</p>
		</div>
	{:else}
		<div class="grid grid-cols-1 gap-6">
			{#each recommendations as rec}
				<div class="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col md:flex-row gap-6 items-center hover:border-slate-350 transition-all shadow-sm">
					<div class="w-16 h-16 rounded-full {rec.bg} {rec.color} flex items-center justify-center shrink-0 shadow-sm">
						<i class="{rec.icon} text-3xl"></i>
					</div>
					<div class="flex-1 text-center md:text-left">
						<div class="flex flex-col md:flex-row md:items-center gap-2.5 mb-2">
							<h3 class="text-xl font-black text-slate-800 tracking-tight">{rec.title}</h3>
							<span class="inline-block px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
								{rec.matchScore}% Match
							</span>
						</div>
						<p class="text-slate-600 font-semibold leading-relaxed">{rec.reason}</p>
					</div>
					<a href="/courses" class="shrink-0 px-6 py-3 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-250 transition-all w-full md:w-auto text-center shadow-sm text-sm">
						Find in Catalog
					</a>
				</div>
			{/each}
		</div>
	{/if}
</div>
