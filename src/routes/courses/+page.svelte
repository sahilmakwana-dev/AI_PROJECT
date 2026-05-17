<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let allCourses = $state([]);
	let isLoading = $state(true);
	let searchQuery = $state('');
	let selectedCategory = $state('All');

	onMount(async () => {
		const { data } = await supabase.from('courses').select('*').order('created_at', { ascending: false });
		if (data) {
			allCourses = data;
		}
		isLoading = false;
	});

	// Dynamic Category Mapping from Course Title & Description keywords
	function getCategory(course) {
		const title = (course.title || '').toLowerCase();
		const desc = (course.description || '').toLowerCase();
		if (title.includes('machine learning') || title.includes('rag') || title.includes('python') || title.includes('ai') || title.includes('data')) {
			return 'AI & Data';
		}
		if (title.includes('web') || title.includes('full stack') || title.includes('frontend') || title.includes('backend') || title.includes('react')) {
			return 'Web Dev';
		}
		if (title.includes('design') || title.includes('ui/ux') || title.includes('figma')) {
			return 'Design';
		}
		if (title.includes('cloud') || title.includes('devops') || title.includes('aws') || title.includes('docker') || title.includes('kubernetes') || title.includes('dev op')) {
			return 'Cloud';
		}
		if (title.includes('security') || title.includes('cyber') || title.includes('penetration') || title.includes('hack')) {
			return 'Security';
		}
		return 'Computer Science';
	}

	// Reactive filtering
	let filteredCourses = $derived.by(() => {
		return allCourses.filter(course => {
			const matchesSearch = 
				course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
				(course.description || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
				(course.instructor_name || '').toLowerCase().includes(searchQuery.toLowerCase());
				
			const matchesCategory = selectedCategory === 'All' || getCategory(course) === selectedCategory;
			
			return matchesSearch && matchesCategory;
		});
	});

	const categories = ['All', 'AI & Data', 'Web Dev', 'Computer Science', 'Design', 'Cloud', 'Security'];
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-12">
	<!-- Top Section with Search -->
	<div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
		<div>
			<h1 class="text-3xl font-black text-white tracking-wide">
				Course Catalog <span class="text-rose-500 font-medium text-xs ml-2 tracking-widest uppercase">Explore curriculum</span>
			</h1>
			<p class="mt-2 text-slate-400 text-sm">Empower your academic journey with intelligent expert-led paths.</p>
		</div>
		
		<!-- Search box with reset button -->
		<div class="relative w-full md:w-80">
			<i class="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 text-lg"></i>
			<input type="text" placeholder="Search title, instructor..." bind:value={searchQuery}
				class="w-full bg-panel border border-slate-700/60 rounded-2xl py-3 pl-11 pr-10 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none transition-all duration-300" />
			{#if searchQuery}
				<button onclick={() => searchQuery = ''} class="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white p-1 rounded-full transition-colors" title="Clear search" aria-label="Clear search">
					<i class="ri-close-circle-fill text-lg"></i>
				</button>
			{/if}
		</div>
	</div>

	<!-- Premium Category Pills -->
	<div class="flex gap-2.5 overflow-x-auto pb-3 scrollbar-none relative">
		{#each categories as category}
			{@const active = selectedCategory === category}
			<button onclick={() => selectedCategory = category}
				class="px-5 py-2.5 rounded-2xl font-bold text-xs uppercase tracking-wider whitespace-nowrap transition-all duration-300 border
				{active 
					? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20 scale-[1.03]' 
					: 'bg-panel border-slate-750 text-slate-400 hover:text-white hover:border-slate-600'}"
			>
				{category} 
				{#if category !== 'All'}
					<span class="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black
						{active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}"
					>
						{allCourses.filter(c => getCategory(c) === category).length}
					</span>
				{:else}
					<span class="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px] font-black
						{active ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-500'}"
					>
						{allCourses.length}
					</span>
				{/if}
			</button>
		{/each}
	</div>

	<!-- Course Grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
		{#if isLoading}
			<div class="col-span-full flex flex-col items-center justify-center py-24 text-slate-500">
				<i class="ri-loader-4-line animate-spin text-5xl text-rose-500 mb-4"></i>
				<p class="text-sm font-medium tracking-wide">Syncing course inventory...</p>
			</div>
		{:else if filteredCourses.length === 0}
			<div class="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 bg-slate-800/10 rounded-3xl border border-slate-850 border-dashed">
				<i class="ri-search-eye-line text-5xl mb-4 text-rose-500/40"></i>
				<p class="text-lg font-bold text-white">No courses match your criteria</p>
				<p class="text-sm text-slate-500 mt-1">Try expanding your search query or selecting another category.</p>
				<button onclick={() => { searchQuery = ''; selectedCategory = 'All'; }} 
					class="mt-5 px-5 py-2.5 bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded-xl hover:bg-slate-700 transition-colors">
					Reset All Filters
				</button>
			</div>
		{:else}
			{#each filteredCourses as course}
				{@const courseCategory = getCategory(course)}
				<div class="group bg-panel rounded-2xl overflow-hidden border border-slate-700/50 hover:border-rose-500/40 transition-all duration-300 hover:-translate-y-1 shadow-xl flex flex-col relative">
					<div class="h-48 overflow-hidden relative">
						<img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=600&q=80'} alt={course.title} class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
						
						<!-- Dynamic Category pill -->
						<div class="absolute top-3.5 left-3.5 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl text-[10px] font-bold text-rose-400 border border-rose-500/20 uppercase tracking-wider">
							{courseCategory}
						</div>
						
						<!-- Price pill -->
						<div class="absolute top-3.5 right-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white px-3 py-1.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/30 border border-emerald-400/20">
							{course.price > 0 ? `₹${course.price.toLocaleString('en-IN')}` : 'Free'}
						</div>
					</div>
					
					<div class="p-6 flex-1 flex flex-col justify-between">
						<div>
							<div class="flex items-center gap-1.5 text-slate-400 text-xs mb-3 font-semibold">
								<i class="ri-user-star-line text-rose-500"></i> 
								<span>{course.instructor_name || 'System Faculty'}</span>
							</div>
							<h3 class="text-lg font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-rose-400 transition-colors">{course.title}</h3>
							<p class="text-slate-400 text-xs line-clamp-3 leading-relaxed mb-6">{course.description || 'No description provided.'}</p>
						</div>
						
						<div class="pt-4 flex items-center justify-between border-t border-slate-800">
							<a href={`/courses/${course.id}`} class="w-full text-center bg-slate-850 hover:bg-rose-500/10 hover:text-rose-400 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition-all duration-300 border border-slate-800 hover:border-rose-500/20 block">
								View Course details
							</a>
						</div>
					</div>
				</div>
			{/each}
		{/if}
	</div>
</div>
