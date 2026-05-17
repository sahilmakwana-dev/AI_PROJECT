<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let myCourses = $state([]);
	let isLoading = $state(true);
	let currentUser = $state(null);

	onMount(async () => {
		// Get logged-in teacher from custom auth session
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);

		// Filter courses by this teacher's ID only
		const { data } = await supabase
			.from('courses')
			.select('*')
			.eq('teacher_id', currentUser.id)
			.order('created_at', { ascending: false });

		if (data) {
			myCourses = data.map(c => ({
				id: c.id,
				title: c.title,
				students: 0,
				revenue: '₹0.00',
				status: 'Published',
				price: c.price
			}));
		}
		isLoading = false;
	});
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold text-white">Teacher Dashboard</h1>
			<p class="mt-2 text-slate-400">Manage your courses, view student progress, and upload new content.</p>
		</div>
		<a href="/teacher/courses/new" class="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium rounded-xl hover:scale-105 transition-transform flex items-center gap-2 shadow-lg shadow-emerald-500/20">
			<i class="ri-add-line text-lg"></i> Create New Course
		</a>
	</div>

	<!-- Course List -->
	<div class="bg-panel rounded-2xl p-6 border border-slate-700/50 shadow-lg">
		<h2 class="text-lg font-bold text-white mb-6">My Courses</h2>
		<div class="overflow-x-auto">
			<table class="w-full text-left border-collapse">
				<thead>
					<tr class="border-b border-slate-700">
						<th class="py-3 px-4 text-sm font-semibold text-slate-400">Course Title</th>
						<th class="py-3 px-4 text-sm font-semibold text-slate-400">Students</th>
						<th class="py-3 px-4 text-sm font-semibold text-slate-400">Revenue</th>
						<th class="py-3 px-4 text-sm font-semibold text-slate-400">Status</th>
						<th class="py-3 px-4 text-sm font-semibold text-slate-400">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-slate-700/50">
					{#if isLoading}
						<tr>
							<td colspan="5" class="py-8 text-center text-slate-400">Loading courses...</td>
						</tr>
					{:else if myCourses.length === 0}
						<tr>
							<td colspan="5" class="py-8 text-center text-slate-400">No courses published yet. Click "Create New Course" to get started!</td>
						</tr>
					{:else}
						{#each myCourses as course}
							<tr class="hover:bg-slate-800/30 transition-colors">
								<td class="py-4 px-4">
									<a href={`/teacher/courses/${course.id}`} class="font-medium text-white hover:text-primary transition-colors">{course.title}</a>
									<div class="text-xs text-slate-400 mt-1">₹{course.price || 0}</div>
								</td>
								<td class="py-4 px-4 text-slate-300">{course.students}</td>
								<td class="py-4 px-4 text-emerald-400 font-medium">{course.revenue}</td>
								<td class="py-4 px-4">
									<span class="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400 border border-blue-500/20">
										Published
									</span>
								</td>
								<td class="py-4 px-4 flex gap-2">
									<a href={`/teacher/courses/${course.id}`} class="text-slate-400 hover:text-white transition-colors p-2 bg-slate-800 rounded-lg"><i class="ri-settings-4-line"></i></a>
								</td>
							</tr>
						{/each}
					{/if}
				</tbody>
			</table>
		</div>
	</div>
</div>
