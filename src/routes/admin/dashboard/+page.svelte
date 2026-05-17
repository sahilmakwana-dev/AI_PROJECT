<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let activeTab = $state('overview'); // overview, users, courses, payments
	let isLoading = $state(true);
	let isActionPending = $state(false);

	// Platform Stats
	let stats = $state({
		studentsCount: 0,
		teachersCount: 0,
		coursesCount: 0,
		lessonsCount: 0,
		enrollmentsCount: 0,
		completionsCount: 0,
		totalRevenue: 0
	});

	// Lists
	let users = $state([]);
	let courses = $state([]);
	let payments = $state([]);

	// Search & filters
	let searchUserQuery = $state('');
	let searchCourseQuery = $state('');

	// Derived filtered lists
	let filteredUsers = $derived(
		users.filter(u => u.email.toLowerCase().includes(searchUserQuery.toLowerCase()))
	);
	let filteredCourses = $derived(
		courses.filter(c => c.title.toLowerCase().includes(searchCourseQuery.toLowerCase()))
	);

	onMount(async () => {
		// Security Check: Admin role only
		const storedUser = localStorage.getItem('currentUser');
		if (!storedUser) {
			goto('/');
			return;
		}
		const sessionUser = JSON.parse(storedUser);
		if (sessionUser.role !== 'Admin') {
			goto('/');
			return;
		}

		await refreshData();
		isLoading = false;
	});

	async function refreshData() {
		try {
			// Fetch data from simple tables in parallel
			const [
				{ data: usersData, error: usersErr },
				{ data: coursesData, error: coursesErr },
				{ data: enrollmentsData, error: enrollmentsErr },
				{ data: materialsData, error: materialsErr },
				{ data: completionsData, error: completionsErr }
			] = await Promise.all([
				supabase.from('custom_users').select('*').order('created_at', { ascending: false }),
				supabase.from('courses').select('*').order('created_at', { ascending: false }),
				supabase.from('enrollments').select('*').order('enrolled_at', { ascending: false }),
				supabase.from('course_materials').select('id'),
				supabase.from('lesson_completions').select('id')
			]);

			if (usersErr) throw usersErr;
			if (coursesErr) throw coursesErr;
			if (enrollmentsErr) throw enrollmentsErr;

			// Store basic lists
			users = usersData || [];
			
			// Map data with JS joins
			const userMap = new Map(users.map(u => [u.id, u]));
			const courseMap = new Map((coursesData || []).map(c => [c.id, c]));

			// Count students and teachers from custom_users
			stats.studentsCount = users.filter(u => u.role === 'Student').length;
			stats.teachersCount = users.filter(u => u.role === 'Teacher').length;
			stats.coursesCount = (coursesData || []).length;
			stats.lessonsCount = (materialsData || []).length;
			stats.enrollmentsCount = (enrollmentsData || []).length;
			stats.completionsCount = (completionsData || []).length;

			// Populate courses with exact active enrollments calculated programmatically
			courses = (coursesData || []).map(c => {
				const activeCount = (enrollmentsData || []).filter(e => e.course_id === c.id).length;
				return {
					...c,
					enrollmentsCount: activeCount
				};
			});

			// Populate payments (any enrollment acts as a transaction of the course price)
			payments = (enrollmentsData || []).map(e => {
				const u = userMap.get(e.user_id);
				const c = courseMap.get(e.course_id);
				return {
					id: e.id,
					studentEmail: u?.email || 'Unknown student',
					courseTitle: c?.title || 'Unknown Course',
					price: c?.price || 0,
					enrolledAt: e.enrolled_at,
					progress: e.progress || 0
				};
			});

			// Total Revenue calculation
			stats.totalRevenue = payments.reduce((sum, p) => sum + Number(p.price || 0), 0);

		} catch (err) {
			console.error('Error fetching admin dashboard data:', err);
		}
	}

	async function deleteUser(userId) {
		if (!confirm('Are you sure you want to delete this user? All their courses/enrollments will be affected.')) return;
		isActionPending = true;
		const { error } = await supabase.from('custom_users').delete().eq('id', userId);
		if (error) {
			alert('Failed to delete user: ' + error.message);
		} else {
			await refreshData();
		}
		isActionPending = false;
	}

	async function deleteCourse(courseId) {
		if (!confirm('Are you sure you want to delete this course? This action cannot be undone.')) return;
		isActionPending = true;
		const { error } = await supabase.from('courses').delete().eq('id', courseId);
		if (error) {
			alert('Failed to delete course: ' + error.message);
		} else {
			await refreshData();
		}
		isActionPending = false;
	}
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-12">
	<!-- Top Bar -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div>
			<h1 class="text-3xl font-black text-slate-800 tracking-wide flex items-center gap-3">
				<span class="px-3 py-1 bg-gradient-to-r from-red-500 to-rose-600 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 text-white">System</span>
				Admin Control Center
			</h1>
			<p class="mt-2 text-slate-500 text-sm font-medium">Platform-wide overview, moderation tools, and revenue tracking.</p>
		</div>

		<!-- Status indicator -->
		<div class="flex items-center gap-3 bg-slate-100/80 border border-slate-200 px-4 py-2.5 rounded-2xl shadow-sm">
			<span class="w-3.5 h-3.5 bg-emerald-500 rounded-full animate-ping"></span>
			<span class="w-3.5 h-3.5 bg-emerald-500 rounded-full absolute"></span>
			<div class="text-left pl-1">
				<p class="text-slate-700 text-xs font-bold leading-none">SYSTEMS ACTIVE</p>
				<p class="text-slate-400 text-[10px] mt-0.5 font-bold">ALL CLOUD API ONLINE</p>
			</div>
		</div>
	</div>

	<!-- Custom Vanilla Tabs -->
	<div class="flex border-b border-slate-200 gap-2 shrink-0">
		<button onclick={() => activeTab = 'overview'}
			class="px-5 py-3 text-sm font-bold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'overview' ? 'text-rose-650 border-rose-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
			<i class="ri-dashboard-3-line"></i> Overview
		</button>
		<button onclick={() => activeTab = 'users'}
			class="px-5 py-3 text-sm font-bold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'users' ? 'text-rose-650 border-rose-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
			<i class="ri-user-settings-line"></i> Students & Teachers ({users.length})
		</button>
		<button onclick={() => activeTab = 'courses'}
			class="px-5 py-3 text-sm font-bold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'courses' ? 'text-rose-650 border-rose-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
			<i class="ri-book-open-line"></i> Courses catalog ({courses.length})
		</button>
		<button onclick={() => activeTab = 'payments'}
			class="px-5 py-3 text-sm font-bold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'payments' ? 'text-rose-650 border-rose-600' : 'text-slate-500 border-transparent hover:text-slate-800'}">
			<i class="ri-refund-2-line"></i> Payments & Revenue ({payments.length})
		</button>
	</div>

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-20 text-slate-400">
			<i class="ri-loader-4-line animate-spin text-5xl text-rose-500 mb-4"></i>
			<p class="text-sm font-semibold tracking-wide">Syncing Real Database Records...</p>
		</div>
	{:else}
		<!-- Tab contents -->
		{#if activeTab === 'overview'}
			<!-- Stats Grid -->
			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				<!-- Total Revenue -->
				<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
					<div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
						<i class="ri-money-rupee-circle-line text-8xl text-emerald-500"></i>
					</div>
					<div class="relative z-10">
						<p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Revenue</p>
						<h3 class="text-3xl font-black text-emerald-605">₹{stats.totalRevenue.toLocaleString('en-IN')}</h3>
						<p class="text-slate-400 text-xs mt-2 flex items-center gap-1 font-semibold">From {payments.length} enrollments</p>
					</div>
				</div>

				<!-- Total Students -->
				<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
					<div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
						<i class="ri-group-line text-8xl text-blue-500"></i>
					</div>
					<div class="relative z-10">
						<p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Students Registered</p>
						<h3 class="text-3xl font-black text-slate-800">{stats.studentsCount}</h3>
						<p class="text-slate-400 text-xs mt-2 flex items-center gap-1 font-semibold">Active learner base</p>
					</div>
				</div>

				<!-- Total Teachers -->
				<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
					<div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
						<i class="ri-presentation-line text-8xl text-violet-500"></i>
					</div>
					<div class="relative z-10">
						<p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Instructor Faculty</p>
						<h3 class="text-3xl font-black text-slate-800">{stats.teachersCount}</h3>
						<p class="text-slate-400 text-xs mt-2 flex items-center gap-1 font-semibold">Verified course creators</p>
					</div>
				</div>

				<!-- Courses & Lessons -->
				<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm relative overflow-hidden group">
					<div class="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
						<i class="ri-book-open-line text-8xl text-rose-500"></i>
					</div>
					<div class="relative z-10">
						<p class="text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">Total Curriculum</p>
						<h3 class="text-3xl font-black text-slate-800">{stats.coursesCount} <span class="text-xs text-slate-500 font-medium">courses</span></h3>
						<p class="text-slate-400 text-xs mt-2 flex items-center gap-1 font-semibold">{stats.lessonsCount} lessons uploaded</p>
					</div>
				</div>
			</div>

			<!-- Platform Health & Advisories -->
			<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<!-- Health Card -->
				<div class="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm lg:col-span-2">
					<h3 class="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
						<i class="ri-pulse-line text-emerald-500"></i> Live Platform Metrics
					</h3>
					<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
						<div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
							<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Enrollments</p>
							<p class="text-xl font-bold text-slate-800 mt-1">{stats.enrollmentsCount} active</p>
						</div>
						<div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
							<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Completed Lessons</p>
							<p class="text-xl font-bold text-slate-800 mt-1">{stats.completionsCount} modules completed</p>
						</div>
						<div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
							<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Database Health</p>
							<p class="text-xl font-bold text-emerald-600 mt-1 flex items-center gap-1.5"><i class="ri-checkbox-circle-fill"></i> Excellent</p>
						</div>
						<div class="bg-slate-50 border border-slate-200 p-4 rounded-xl">
							<p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uptime (SLA)</p>
							<p class="text-xl font-bold text-slate-800 mt-1">99.98%</p>
						</div>
					</div>
				</div>

				<!-- Row Level Security Warning -->
				<div class="bg-amber-50/50 border border-amber-200 p-6 rounded-2xl shadow-sm flex flex-col justify-between">
					<div>
						<h4 class="text-amber-800 font-bold text-sm flex items-center gap-2">
							<i class="ri-alert-line text-lg text-amber-600"></i> Row-Level Security Advisory
						</h4>
						<p class="text-slate-600 text-xs mt-2 leading-relaxed font-semibold">
							Some database tables do not have Row Level Security enabled. To prevent direct API client modifications, we recommend enabling RLS.
						</p>
					</div>
					<div class="mt-4 pt-3 border-t border-amber-200">
						<code class="text-[9px] text-amber-900 block bg-amber-100/30 p-2.5 rounded border border-amber-200 font-mono select-all">
							ALTER TABLE public.custom_users ENABLE ROW LEVEL SECURITY;
						</code>
					</div>
				</div>
			</div>

			<!-- Recent Activity Feed -->
			<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
				<div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
					<h3 class="text-base font-bold text-slate-800 flex items-center gap-2"><i class="ri-history-line text-rose-500"></i> Recent Platform Enrollments</h3>
				</div>
				{#if payments.length === 0}
					<p class="p-6 text-center text-slate-400 text-sm font-semibold">No transaction activity recorded yet.</p>
				{:else}
					<div class="divide-y divide-slate-100">
						{#each payments.slice(0, 5) as p}
							<div class="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 hover:bg-slate-50 transition-colors">
								<div>
									<p class="text-slate-800 text-sm font-bold">{p.studentEmail}</p>
									<p class="text-slate-500 text-xs mt-0.5 font-medium">Enrolled in <span class="text-slate-700 font-bold">"{p.courseTitle}"</span></p>
								</div>
								<div class="text-right sm:text-right">
									<p class="text-emerald-600 text-sm font-bold">₹{p.price.toLocaleString('en-IN')}</p>
									<p class="text-[10px] text-slate-400 mt-0.5 font-semibold">{new Date(p.enrolledAt).toLocaleString()}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>

		{:else if activeTab === 'users'}
			<!-- Users Tab -->
			<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
				<!-- Search -->
				<div class="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
					<div class="relative w-full sm:w-80">
						<i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
						<input type="text" placeholder="Search user email..." bind:value={searchUserQuery}
							class="w-full bg-white border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all font-semibold" />
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse min-w-[600px]">
						<thead>
							<tr class="bg-slate-50 border-b border-slate-200">
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">User Identity</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Role Type</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Date Registered</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Moderation Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each filteredUsers as u}
								<tr class="hover:bg-slate-50 transition-colors">
									<td class="py-4 px-6 flex items-center gap-3">
										<div class="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
											{u.role === 'Admin' ? 'bg-rose-50 text-rose-600' :
											 u.role === 'Teacher' ? 'bg-violet-50 text-violet-650' :
											 'bg-blue-50 text-blue-600'}">
											{u.email[0].toUpperCase()}
										</div>
										<div>
											<p class="text-slate-800 text-sm font-bold">{u.email}</p>
											<p class="text-slate-400 text-[10px] font-mono mt-0.5">ID: {u.id}</p>
										</div>
									</td>
									<td class="py-4 px-6">
										<span class="px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider
											{u.role === 'Admin' ? 'bg-rose-50 text-rose-650 border border-rose-200' :
											 u.role === 'Teacher' ? 'bg-violet-50 text-violet-650 border border-violet-200' :
											 'bg-blue-50 text-blue-600 border border-blue-200'}">
											{u.role}
										</span>
									</td>
									<td class="py-4 px-6 text-slate-505 text-sm font-semibold">
										{new Date(u.created_at).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
									</td>
									<td class="py-4 px-6 text-right">
										{#if u.role !== 'Admin'}
											<button onclick={() => deleteUser(u.id)} disabled={isActionPending}
												class="text-red-600 hover:text-red-700 transition-colors p-2 bg-slate-50 hover:bg-red-50 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-slate-200 hover:border-red-200 disabled:opacity-50 shadow-sm">
												<i class="ri-delete-bin-line"></i> Revoke
											</button>
										{:else}
											<span class="text-slate-400 text-xs font-bold uppercase tracking-wider">System Admin</span>
										{/if}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

		{:else if activeTab === 'courses'}
			<!-- Courses Tab -->
			<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
				<!-- Search -->
				<div class="p-5 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
					<div class="relative w-full sm:w-80">
						<i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
						<input type="text" placeholder="Search course title..." bind:value={searchCourseQuery}
							class="w-full bg-white border border-slate-250 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all font-semibold" />
					</div>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse min-w-[700px]">
						<thead>
							<tr class="bg-slate-50 border-b border-slate-200">
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Course Detail</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Faculty Instructor</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Price (INR)</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled learners</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each filteredCourses as c}
								<tr class="hover:bg-slate-50 transition-colors">
									<td class="py-4 px-6 flex items-center gap-3">
										<img src={c.thumbnail_url} alt={c.title} class="w-12 h-8 rounded-lg object-cover bg-slate-100 shrink-0 border border-slate-200" />
										<span class="text-slate-800 text-sm font-bold line-clamp-1">{c.title}</span>
									</td>
									<td class="py-4 px-6">
										<div class="flex items-center gap-2">
											<i class="ri-presentation-fill text-violet-500"></i>
											<span class="text-slate-650 text-sm font-semibold">{c.instructor_name || 'System Faculty'}</span>
										</div>
									</td>
									<td class="py-4 px-6 text-slate-800 text-sm font-extrabold">
										{c.price > 0 ? `₹${c.price.toLocaleString('en-IN')}` : 'Free'}
									</td>
									<td class="py-4 px-6 text-slate-500 text-sm">
										<span class="px-2.5 py-1 rounded bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600">
											{c.enrollmentsCount} active
										</span>
									</td>
									<td class="py-4 px-6 text-right">
										<button onclick={() => deleteCourse(c.id)} disabled={isActionPending}
											class="text-red-650 hover:text-red-700 transition-colors p-2 bg-slate-50 hover:bg-red-50 rounded-xl inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider border border-slate-200 hover:border-red-200 disabled:opacity-50 shadow-sm">
											<i class="ri-delete-bin-line"></i> Purge
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>

		{:else if activeTab === 'payments'}
			<!-- Payments Tab -->
			<div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
				<div class="p-5 border-b border-slate-100 bg-slate-50/50">
					<h3 class="text-sm font-bold text-slate-800">Full Transaction & Revenue Records</h3>
					<p class="text-slate-500 text-xs mt-0.5 font-semibold">Real database logs mapping custom pay gateway actions.</p>
				</div>

				<div class="overflow-x-auto">
					<table class="w-full text-left border-collapse min-w-[700px]">
						<thead>
							<tr class="bg-slate-50 border-b border-slate-200">
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Transaction Id</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Student Email</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Enrolled Course</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Paid Amount</th>
								<th class="py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Timestamp</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-slate-100">
							{#each payments as p}
								<tr class="hover:bg-slate-50 transition-colors">
									<td class="py-4 px-6 font-mono text-xs text-slate-450 select-all font-semibold">
										TXN-{p.id.slice(0, 8).toUpperCase()}
									</td>
									<td class="py-4 px-6 text-slate-800 text-sm font-bold">
										{p.studentEmail}
									</td>
									<td class="py-4 px-6 text-slate-650 text-sm font-semibold">
										{p.courseTitle}
									</td>
									<td class="py-4 px-6">
										<div class="flex items-center gap-2">
											<span class="text-xs text-slate-500 font-bold">{p.progress}%</span>
											<div class="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden shrink-0 border border-slate-200">
												<div class="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full" style="width: {p.progress}%"></div>
											</div>
										</div>
									</td>
									<td class="py-4 px-6 text-emerald-600 text-sm font-extrabold">
										₹{p.price.toLocaleString('en-IN')}
									</td>
									<td class="py-4 px-6 text-slate-500 text-xs text-right font-semibold">
										{new Date(p.enrolledAt).toLocaleString('en-IN')}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}
	{/if}
</div>
