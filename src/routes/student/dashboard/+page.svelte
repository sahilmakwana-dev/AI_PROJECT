<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	// Dex AI plan integration
	import DexPanel from '$lib/components/DexPanel.svelte';

	let currentUser = $state(null);
	let enrolledCourses = $state([]);
	let isLoading = $state(true);
	let insights = $state([]);
	let insightsLoading = $state(false);

	// Derived stats
	let totalEnrolled = $derived(enrolledCourses.length);
	let completed = $derived(enrolledCourses.filter(c => c.progress >= 100).length);
	let avgProgress = $derived(
		enrolledCourses.length
			? Math.round(enrolledCourses.reduce((sum, c) => sum + (c.progress || 0), 0) / enrolledCourses.length)
			: 0
	);

	async function fetchInsights(courses) {
		insightsLoading = true;
		try {
			const res = await fetch('/api/insights', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ enrolledCourses: courses })
			});
			const data = await res.json();
			if (data.insights) insights = data.insights;
		} catch (e) {
			console.error('Insights error:', e);
		} finally {
			insightsLoading = false;
		}
	}

	onMount(async () => {
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);

		// Fetch enrollments joined with course data
		const { data, error } = await supabase
			.from('enrollments')
			.select('*, courses(*)')
			.eq('user_id', currentUser.id)
			.order('enrolled_at', { ascending: false });

		if (data) {
			enrolledCourses = data.map(e => ({
				enrollmentId: e.id,
				courseId: e.course_id,
				progress: e.progress || 0,
				enrolledAt: e.enrolled_at,
				title: e.courses?.title || 'Untitled Course',
				thumbnail: e.courses?.thumbnail_url || 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=300&q=80',
				price: e.courses?.price || 0
			}));
			// Fire AI insights in background after courses load
			fetchInsights(enrolledCourses.map(c => ({ title: c.title, progress: c.progress })));
		}

		isLoading = false;
	});
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
	<div>
		<h1 class="text-3xl font-bold text-slate-800 tracking-tight">Student Dashboard</h1>
		<p class="mt-2 text-slate-500">Welcome back, <span class="text-primary font-semibold">{currentUser?.email?.split('@')[0]}</span>! Here's your learning progress.</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		{#each [
			{ label: 'Enrolled Courses', value: totalEnrolled, icon: 'ri-book-2-line', color: 'from-blue-500 to-blue-600' },
			{ label: 'Completed', value: completed, icon: 'ri-checkbox-circle-line', color: 'from-emerald-500 to-emerald-600' },
			{ label: 'Avg. Progress', value: avgProgress + '%', icon: 'ri-bar-chart-line', color: 'from-purple-500 to-purple-600' },
			{ label: 'In Progress', value: totalEnrolled - completed, icon: 'ri-time-line', color: 'from-amber-500 to-amber-600' }
		] as stat}
			<div class="bg-white rounded-2xl p-6 border border-slate-200 hover:border-slate-300 transition-all hover:-translate-y-0.5 shadow-sm">
				<div class="flex items-center justify-between">
					<div>
						<p class="text-sm font-medium text-slate-500">{stat.label}</p>
						<p class="text-3xl font-bold text-slate-800 mt-1">{stat.value}</p>
					</div>
					<div class="w-12 h-12 rounded-xl bg-gradient-to-br {stat.color} flex items-center justify-center text-white shadow-md">
						<i class="{stat.icon} text-2xl"></i>
					</div>
				</div>
			</div>
		{/each}
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
		<!-- Active Courses -->
		<div class="lg:col-span-2 space-y-6">
			<div class="flex items-center justify-between">
				<h2 class="text-xl font-bold text-slate-800">Continue Learning</h2>
				<a href="/courses" class="text-primary hover:text-violet-850 text-sm font-semibold">Browse Catalog</a>
			</div>

			{#if isLoading}
				<div class="flex items-center justify-center h-40 text-primary">
					<i class="ri-loader-4-line animate-spin text-4xl"></i>
				</div>
			{:else if enrolledCourses.length === 0}
				<div class="text-center py-16 bg-white rounded-2xl border border-dashed border-slate-200">
					<i class="ri-book-open-line text-5xl text-slate-400 mb-4 block"></i>
					<p class="text-slate-500 font-semibold">You haven't enrolled in any courses yet.</p>
					<a href="/courses" class="mt-4 inline-block px-6 py-2.5 bg-primary text-white rounded-xl font-semibold hover:bg-violet-850 shadow-md shadow-primary/20 transition-all">Browse Courses</a>
				</div>
			{:else}
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
					{#each enrolledCourses as course}
						<div class="group bg-white rounded-2xl overflow-hidden border border-slate-200 hover:border-primary/45 hover:shadow-md transition-all shadow-sm">
							<div class="h-40 overflow-hidden relative">
								<img src={course.thumbnail} alt={course.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-550" />
								<div class="absolute inset-0 bg-gradient-to-t from-white to-transparent opacity-40"></div>
								{#if course.progress >= 100}
									<div class="absolute top-3 right-3 bg-emerald-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
										<i class="ri-check-line"></i> Completed
									</div>
								{/if}
							</div>
							<div class="p-6 relative z-10 -mt-6 bg-white rounded-t-xl">
								<h3 class="text-lg font-bold text-slate-800 mb-4 line-clamp-1">{course.title}</h3>
								<div class="space-y-2">
									<div class="flex justify-between text-xs">
										<span class="text-slate-500 font-medium">Progress</span>
										<span class="text-slate-800 font-bold">{course.progress}%</span>
									</div>
									<div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
										<div class="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-700" style="width: {course.progress}%"></div>
									</div>
								</div>
								<a href={`/student/courses/${course.courseId}`} class="mt-5 w-full py-2.5 bg-slate-50 hover:bg-primary hover:text-white text-slate-700 border border-slate-200 hover:border-primary rounded-xl transition-all font-semibold text-sm block text-center shadow-sm">
									{course.progress > 0 ? 'Resume Course' : 'Start Course'}
								</a>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Dex AI Sidebar -->
		<div class="space-y-5">
			<DexPanel {enrolledCourses} />

			<div class="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
				<h2 class="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
					<i class="ri-compass-3-line text-primary"></i> Quick Navigation
				</h2>
				<div class="space-y-2">
					<a href="/courses" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 text-sm font-medium">
						<i class="ri-book-open-line text-primary"></i> Browse Courses
					</a>
					<a href="/performance" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 text-sm font-medium">
						<i class="ri-bar-chart-box-line text-emerald-500"></i> Performance
					</a>
					<a href="/recommendations" class="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 transition-colors text-slate-600 hover:text-slate-900 text-sm font-medium">
						<i class="ri-magic-line text-violet-600"></i> AI Recommendations
					</a>
				</div>
			</div>
		</div>
	</div>
</div>

