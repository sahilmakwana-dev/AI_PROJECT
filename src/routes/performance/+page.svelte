<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let currentUser = $state(null);
	let enrolledCourses = $state([]);
	let isLoading = $state(true);

	let avgProgress = $derived(
		enrolledCourses.length
			? Math.round(enrolledCourses.reduce((s, c) => s + (c.progress || 0), 0) / enrolledCourses.length)
			: 0
	);
	let completed = $derived(enrolledCourses.filter(c => c.progress >= 100).length);

	onMount(async () => {
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);

		const { data } = await supabase
			.from('enrollments')
			.select('*, courses(*)')
			.eq('user_id', currentUser.id)
			.order('enrolled_at', { ascending: false });

		if (data) {
			enrolledCourses = data.map(e => ({
				courseId: e.course_id,
				progress: e.progress || 0,
				enrolledAt: new Date(e.enrolled_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' }),
				title: e.courses?.title || 'Untitled',
				price: e.courses?.price || 0
			}));
		}
		isLoading = false;
	});
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
	<div>
		<h1 class="text-3xl font-black text-slate-800 tracking-tight">Performance Analytics</h1>
		<p class="mt-2 text-slate-500 font-semibold">Track your course progress and overall learning standing.</p>
	</div>

	{#if isLoading}
		<div class="flex items-center justify-center h-64 text-primary">
			<i class="ri-loader-4-line animate-spin text-4xl"></i>
		</div>
	{:else if enrolledCourses.length === 0}
		<div class="text-center py-24 bg-white rounded-2xl border border-dashed border-slate-300 shadow-sm">
			<i class="ri-bar-chart-box-line text-5xl text-slate-400 mb-4 block"></i>
			<p class="text-slate-650 font-bold text-lg">No performance data yet.</p>
			<p class="text-slate-500 mt-2 font-medium">Enroll in a course to start tracking your progress.</p>
			<a href="/courses" class="mt-6 inline-block px-6 py-2.5 bg-primary text-white rounded-xl font-bold hover:bg-violet-850 shadow-md shadow-primary/20 transition-all">Browse Courses</a>
		</div>
	{:else}
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
			<!-- Summary Card -->
			<div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-1 space-y-6">
				<h2 class="text-lg font-bold text-slate-800 flex items-center gap-2">
					<i class="ri-focus-2-line text-primary"></i> Overall Progress
				</h2>

				<!-- Circular progress visual -->
				<div class="flex flex-col items-center justify-center py-6 gap-4">
					<div class="relative w-32 h-32">
						<svg class="w-full h-full -rotate-90" viewBox="0 0 100 100">
							<circle cx="50" cy="50" r="40" fill="none" stroke="#f1f5f9" stroke-width="10"/>
							<circle cx="50" cy="50" r="40" fill="none" stroke="url(#grad)" stroke-width="10"
								stroke-dasharray="{avgProgress * 2.51} 251"
								stroke-linecap="round"/>
							<defs>
								<linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
									<stop offset="0%" style="stop-color:#4F46E5"/>
									<stop offset="100%" style="stop-color:#EC4899"/>
								</linearGradient>
							</defs>
						</svg>
						<div class="absolute inset-0 flex flex-col items-center justify-center">
							<span class="text-3xl font-black text-slate-800">{avgProgress}%</span>
							<span class="text-xs text-slate-500 font-bold">Avg. Progress</span>
						</div>
					</div>
					<div class="grid grid-cols-2 gap-4 w-full text-center mt-4">
						<div class="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm">
							<p class="text-2xl font-black text-slate-805">{enrolledCourses.length}</p>
							<p class="text-xs text-slate-500 mt-1 font-bold">Enrolled</p>
						</div>
						<div class="bg-slate-50 border border-slate-200/60 rounded-xl p-3 shadow-sm">
							<p class="text-2xl font-black text-emerald-600">{completed}</p>
							<p class="text-xs text-slate-500 mt-1 font-bold">Completed</p>
						</div>
					</div>
				</div>
			</div>

			<!-- Course Progress Table -->
			<div class="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm lg:col-span-2">
				<h2 class="text-lg font-bold text-slate-808 mb-6 flex items-center gap-2">
					<i class="ri-history-line text-secondary"></i> Course Progress
				</h2>

				<div class="space-y-5">
					{#each enrolledCourses as course}
						<div class="p-4 rounded-xl bg-slate-50 border border-slate-200/60 hover:border-slate-300 transition-all shadow-sm">
							<div class="flex items-center justify-between mb-3">
								<div>
									<h4 class="font-bold text-slate-800 text-sm leading-snug">{course.title}</h4>
									<p class="text-xs text-slate-500 mt-0.5 font-semibold">Enrolled on {course.enrolledAt}</p>
								</div>
								<div class="text-right">
									<span class="text-lg font-black {course.progress >= 100 ? 'text-emerald-600' : course.progress > 50 ? 'text-blue-600' : 'text-amber-600'}">
										{course.progress}%
									</span>
									{#if course.progress >= 100}
										<p class="text-xs text-emerald-600 font-bold mt-0.5">Completed ✓</p>
									{:else}
										<p class="text-xs text-slate-500 font-semibold mt-0.5">In Progress</p>
									{/if}
								</div>
							</div>
							<div class="w-full bg-slate-200/70 rounded-full h-2 overflow-hidden border border-slate-100">
								<div class="h-2 rounded-full bg-gradient-to-r transition-all duration-700
									{course.progress >= 100 ? 'from-emerald-500 to-teal-400' : 'from-primary to-secondary'}"
									style="width: {course.progress}%">
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
