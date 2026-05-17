<script>
	import { supabase } from '$lib/supabaseClient';

	let plan = $state(null);
	let isLoading = $state(true);
	let error = $state(false);

	let { enrolledCourses = [] } = $props();
	let hasLoaded = $state(false);

	$effect(() => {
		if (enrolledCourses.length > 0 && !hasLoaded) {
			hasLoaded = true;
			loadPlan();
		} else if (enrolledCourses.length === 0) {
			isLoading = false;
		}
	});

	async function loadPlan() {
		isLoading = true;
		error = false;
		try {
			const stored = localStorage.getItem('currentUser');
			if (!stored) { isLoading = false; return; }
			const user = JSON.parse(stored);

			// Fetch completions and all lessons for context
			const [{ data: compData }, { data: allLessons }] = await Promise.all([
				supabase.from('lesson_completions')
					.select('material_id, course_id')
					.eq('user_id', user.id),
				supabase.from('course_materials')
					.select('id, title, course_id')
					.in('course_id', enrolledCourses.map(c => c.courseId))
			]);

			const res = await fetch('/api/dex', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					enrolledCourses,
					completedLessons: compData || [],
					allLessons: allLessons || []
				})
			});
			const data = await res.json();
			if (data.plan) plan = data.plan;
			else error = true;
		} catch (err) {
			console.error('Dex load plan error:', err);
			error = true;
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="rounded-2xl overflow-hidden border border-violet-100 shadow-xl bg-white">

	<!-- Header -->
	<div class="px-6 py-5 flex items-center justify-between border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50">
		<div class="flex items-center gap-3">
			<div class="w-11 h-11 rounded-xl flex flex-col items-center justify-center bg-gradient-to-br from-primary to-secondary shadow-md shadow-primary/20">
				<span class="text-[11px] font-black text-white leading-none tracking-widest">DEX</span>
				<i class="ri-sparkling-2-fill text-white/80 text-xs mt-0.5"></i>
			</div>
			<div>
				<h2 class="text-slate-800 font-bold text-base tracking-wide">Dex AI <span class="text-primary text-xs font-semibold ml-1">• Your Learning Assistant</span></h2>
				<p class="text-slate-500 text-xs mt-0.5">
					{#if plan?.motivationTag}
						<span class="px-2 py-0.5 rounded-full text-xs font-semibold bg-violet-100 border border-violet-200 text-violet-700">
							{plan.motivationTag}
						</span>
					{:else}
						Generating your plan...
					{/if}
				</p>
			</div>
		</div>
		<div class="text-right text-xs text-slate-500">
			<p>{new Date().toLocaleDateString('en-IN', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
		</div>
	</div>

	<!-- Body -->
	<div class="p-6 space-y-5">
		{#if isLoading}
			<div class="space-y-3">
				{#each [1,2,3] as _}
					<div class="h-14 rounded-xl animate-pulse bg-slate-100 border border-slate-200"></div>
				{/each}
			</div>

		{:else if error || !plan}
			<div class="text-center py-6 text-slate-505">
				<i class="ri-error-warning-line text-3xl mb-2 block text-slate-400"></i>
				<p class="text-sm font-semibold">Dex couldn't load your plan. Enroll in courses to get started!</p>
				<a href="/courses" class="mt-4 inline-block text-xs font-semibold text-white px-5 py-2.5 rounded-xl bg-primary hover:bg-violet-850 shadow-md shadow-primary/20 transition-all">Browse Courses</a>
			</div>

		{:else}
			<!-- Greeting -->
			{#if plan.greeting}
				<p class="text-slate-655 text-sm leading-relaxed italic font-medium">"{plan.greeting}"</p>
			{/if}

			<!-- Today's Plan -->
			{#if plan.todayPlan?.length > 0}
				<div>
					<h3 class="text-xs font-bold uppercase tracking-widest text-violet-700 mb-3 flex items-center gap-2">
						<i class="ri-calendar-check-line"></i> Today's Lessons
					</h3>
					<div class="space-y-2.5">
						{#each plan.todayPlan as item, i}
							<div class="flex items-start gap-3 p-3.5 rounded-xl bg-violet-50/50 border border-violet-100/60">
								<div class="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 text-xs font-bold text-white bg-gradient-to-br from-primary to-secondary">
									{i + 1}
								</div>
								<div class="flex-1 min-w-0">
									<p class="text-slate-800 text-sm font-bold leading-snug">{item.lessonTitle}</p>
									<p class="text-slate-500 text-xs mt-0.5 font-semibold">{item.courseTitle}</p>
									{#if item.reason}
										<p class="text-slate-505 text-xs mt-1.5 italic leading-relaxed font-semibold">{item.reason}</p>
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/if}

			<!-- Progress Summary -->
			{#if plan.progressSummary}
				<div class="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100">
					<p class="text-emerald-805 text-xs leading-relaxed flex items-start gap-2 font-semibold">
						<i class="ri-bar-chart-line shrink-0 mt-0.5 text-sm text-emerald-600"></i>
						{plan.progressSummary}
					</p>
				</div>
			{/if}

			<!-- Next Up -->
			{#if plan.nextUp}
				<div class="p-3.5 rounded-xl bg-indigo-50 border border-indigo-100">
					<p class="text-indigo-805 text-xs leading-relaxed flex items-start gap-2 font-semibold">
						<i class="ri-arrow-right-circle-line shrink-0 mt-0.5 text-sm text-indigo-600"></i>
						<span><strong class="text-slate-800 font-bold">Up next: </strong>{plan.nextUp}</span>
					</p>
				</div>
			{/if}
		{/if}
	</div>

	<!-- Footer CTA -->
	<div class="px-6 pb-5 flex gap-3">
		<a href="/recommendations" class="flex-1 py-2.5 text-center text-sm font-bold text-white rounded-xl transition-all bg-primary hover:bg-violet-850 shadow-md shadow-primary/20">
			<i class="ri-magic-line mr-1"></i> Course Suggestions
		</a>
		<a href="/performance" class="flex-1 py-2.5 text-center text-sm font-bold rounded-xl transition-all bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm">
			<i class="ri-bar-chart-box-line mr-1"></i> My Progress
		</a>
	</div>
</div>
