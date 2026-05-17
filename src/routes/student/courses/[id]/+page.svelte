<script>
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let courseId = $derived($page.params.id);
	let course = $state(null);
	let materials = $state([]);
	let activeMaterial = $state(null);
	let isLoading = $state(true);
	let sessionUser = $state(null);
	let enrollmentId = $state(null);

	// Tracking state
	let completedIds = $state(new Set());
	let isMarkingComplete = $state(false);

	// Derived progress
	let progressPercent = $derived(
		materials.length > 0
			? Math.round((completedIds.size / materials.length) * 100)
			: 0
	);
	let isCurrentLessonDone = $derived(
		activeMaterial ? completedIds.has(activeMaterial.id) : false
	);

	onMount(async () => {
		const stored = localStorage.getItem('currentUser');
		if (!stored) { goto('/'); return; }
		sessionUser = JSON.parse(stored);

		// Security: must be enrolled
		const { data: enrollment } = await supabase.from('enrollments')
			.select('*')
			.eq('user_id', sessionUser.id)
			.eq('course_id', courseId)
			.single();

		if (!enrollment) { goto(`/courses/${courseId}`); return; }
		enrollmentId = enrollment.id;

		// Fetch course + materials
		const [{ data: cData }, { data: mData }, { data: compData }] = await Promise.all([
			supabase.from('courses').select('*').eq('id', courseId).single(),
			supabase.from('course_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: true }),
			supabase.from('lesson_completions').select('material_id').eq('user_id', sessionUser.id).eq('course_id', courseId)
		]);

		if (cData) course = cData;
		if (mData) {
			materials = mData;
			if (materials.length > 0) activeMaterial = materials[0];
		}
		if (compData) {
			completedIds = new Set(compData.map(c => c.material_id));
		}

		isLoading = false;
	});

	async function markLessonComplete() {
		if (!activeMaterial || isCurrentLessonDone || isMarkingComplete) return;
		isMarkingComplete = true;

		const { error } = await supabase.from('lesson_completions').insert({
			user_id: sessionUser.id,
			course_id: courseId,
			material_id: activeMaterial.id
		});

		if (!error) {
			completedIds = new Set([...completedIds, activeMaterial.id]);

			// Recalculate & update progress in enrollments table
			const newProgress = Math.round((completedIds.size / materials.length) * 100);
			await supabase.from('enrollments')
				.update({ progress: newProgress })
				.eq('id', enrollmentId);

			// Auto-advance to next lesson
			const currentIndex = materials.findIndex(m => m.id === activeMaterial.id);
			if (currentIndex < materials.length - 1) {
				setTimeout(() => {
					activeMaterial = materials[currentIndex + 1];
				}, 600);
			}
		}
		isMarkingComplete = false;
	}

	async function markLessonIncomplete() {
		if (!activeMaterial || !isCurrentLessonDone || isMarkingComplete) return;
		isMarkingComplete = true;

		const { error } = await supabase.from('lesson_completions')
			.delete()
			.eq('user_id', sessionUser.id)
			.eq('material_id', activeMaterial.id);

		if (!error) {
			const updated = new Set(completedIds);
			updated.delete(activeMaterial.id);
			completedIds = updated;

			const newProgress = materials.length > 0
				? Math.round((completedIds.size / materials.length) * 100)
				: 0;
			await supabase.from('enrollments')
				.update({ progress: newProgress })
				.eq('id', enrollmentId);
		}
		isMarkingComplete = false;
	}

	function goNext() {
		const i = materials.findIndex(m => m.id === activeMaterial?.id);
		if (i < materials.length - 1) activeMaterial = materials[i + 1];
	}

	function goPrev() {
		const i = materials.findIndex(m => m.id === activeMaterial?.id);
		if (i > 0) activeMaterial = materials[i - 1];
	}
</script>

{#if isLoading}
	<div class="flex items-center justify-center h-screen text-primary bg-slate-50">
		<i class="ri-loader-4-line animate-spin text-5xl"></i>
	</div>
{:else if course}
	<div class="flex flex-col lg:flex-row h-screen bg-slate-50 overflow-hidden animate-[fadeIn_0.5s_ease-out]">
		<!-- Main Content Area -->
		<div class="flex-1 flex flex-col min-w-0">
			<!-- Topbar -->
			<div class="h-16 bg-white border-b border-slate-200 flex items-center px-6 shrink-0 z-10 justify-between gap-4">
				<div class="flex items-center gap-4 min-w-0">
					<a href="/student/dashboard" class="text-slate-500 hover:text-slate-800 transition-colors shrink-0">
						<i class="ri-arrow-left-line text-xl"></i>
					</a>
					<h1 class="text-slate-800 font-semibold line-clamp-1 text-sm md:text-base">{course.title}</h1>
				</div>
				<!-- Top progress bar -->
				<div class="hidden md:flex items-center gap-3 shrink-0">
					<div class="w-32 bg-slate-200 h-1.5 rounded-full overflow-hidden">
						<div class="bg-gradient-to-r from-primary to-secondary h-full rounded-full transition-all duration-700"
							style="width: {progressPercent}%">
						</div>
					</div>
					<span class="text-sm font-medium {progressPercent === 100 ? 'text-emerald-600' : 'text-slate-500'}">
						{progressPercent}%
					</span>
				</div>
			</div>

			<!-- Player Area -->
			<div class="flex-1 bg-slate-900 flex items-center justify-center relative overflow-hidden">
				{#if !activeMaterial}
					<div class="text-center text-slate-400">
						<i class="ri-movie-line text-6xl mb-4 block opacity-50"></i>
						<p>No material available for this lesson.</p>
					</div>
				{:else if activeMaterial.material_type === 'video'}
					<video
						controls
						src={activeMaterial.material_url}
						class="w-full h-full object-contain bg-slate-950"
						onended={markLessonComplete}
					></video>
				{:else if activeMaterial.material_type === 'image'}
					<img src={activeMaterial.material_url} alt={activeMaterial.title} class="max-w-full max-h-full object-contain" />
				{:else}
					<div class="text-center bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
						<i class="ri-file-text-line text-8xl text-primary mb-6 block"></i>
						<a href={activeMaterial.material_url} target="_blank"
							class="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-violet-850 transition-colors shadow-lg shadow-primary/30 inline-block">
							Open Document
						</a>
					</div>
				{/if}
			</div>

			<!-- Bottom bar: lesson info + controls -->
			<div class="bg-white border-t border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center gap-4 shrink-0">
				<div class="flex-1 min-w-0">
					<h2 class="text-lg font-bold text-slate-800 line-clamp-1">{activeMaterial?.title || 'Course Content'}</h2>
					<p class="text-xs text-slate-500 mt-1 uppercase tracking-widest">{activeMaterial?.material_type || ''}</p>
				</div>

				<div class="flex items-center gap-3 shrink-0">
					<!-- Prev -->
					<button onclick={goPrev}
						disabled={materials.findIndex(m => m.id === activeMaterial?.id) === 0}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-2">
						<i class="ri-arrow-left-s-line"></i> Prev
					</button>

					<!-- Mark Complete / Undo -->
					{#if isCurrentLessonDone}
						<button onclick={markLessonIncomplete} disabled={isMarkingComplete}
							class="px-5 py-2 bg-emerald-50 border border-emerald-200 text-emerald-600 hover:bg-red-50 hover:border-red-200 hover:text-red-500 rounded-xl text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50">
							<i class="ri-check-double-line"></i>
							{isMarkingComplete ? 'Updating...' : 'Completed ✓'}
						</button>
					{:else}
						<button onclick={markLessonComplete} disabled={isMarkingComplete}
							class="px-5 py-2 bg-primary hover:bg-violet-850 text-white rounded-xl text-sm font-semibold shadow-lg shadow-primary/20 transition-all flex items-center gap-2 disabled:opacity-50">
							{#if isMarkingComplete}
								<i class="ri-loader-4-line animate-spin"></i> Saving...
							{:else}
								<i class="ri-check-line"></i> Mark Complete
							{/if}
						</button>
					{/if}

					<!-- Next -->
					<button onclick={goNext}
						disabled={materials.findIndex(m => m.id === activeMaterial?.id) === materials.length - 1}
						class="px-4 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium disabled:opacity-30 disabled:pointer-events-none transition-colors flex items-center gap-2">
						Next <i class="ri-arrow-right-s-line"></i>
					</button>
				</div>
			</div>
		</div>

		<!-- Sidebar Playlist -->
		<div class="w-full lg:w-96 bg-white border-l border-slate-200 flex flex-col shrink-0">
			<!-- Header with progress -->
			<div class="p-6 border-b border-slate-200 shrink-0 bg-slate-50">
				<h3 class="text-lg font-bold text-slate-800 mb-2">Course Content</h3>
				<div class="flex items-center justify-between text-sm mb-3">
					<span class="text-slate-600">{completedIds.size} / {materials.length} lessons</span>
					<span class="{progressPercent === 100 ? 'text-emerald-600 font-bold' : 'text-slate-600'}">{progressPercent}% Complete</span>
				</div>
				<div class="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
					<div class="h-full rounded-full transition-all duration-700
						{progressPercent === 100 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-primary to-secondary'}"
						style="width: {progressPercent}%">
					</div>
				</div>
				{#if progressPercent === 100}
					<div class="mt-3 text-center text-emerald-600 text-sm font-medium flex items-center justify-center gap-2">
						<i class="ri-trophy-line"></i> Course Complete! Congratulations! 🎉
					</div>
				{/if}
			</div>

			<div class="flex-1 overflow-y-auto">
				{#if materials.length === 0}
					<div class="p-8 text-center text-slate-400">
						<p>The instructor hasn't uploaded any lessons yet.</p>
					</div>
				{:else}
					<ul class="divide-y divide-slate-100">
						{#each materials as mat, index}
							{@const isDone = completedIds.has(mat.id)}
							{@const isActive = activeMaterial?.id === mat.id}
							<li>
								<button
									onclick={() => activeMaterial = mat}
									class="w-full text-left p-5 flex items-start gap-4 hover:bg-slate-50 transition-colors
										{isActive ? 'bg-slate-100/70 border-l-2 border-primary' : 'border-l-2 border-transparent'}"
								>
									<!-- Status Icon -->
									<div class="w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-sm mt-0.5
										{isDone ? 'bg-emerald-500 text-white' :
										 isActive ? 'bg-primary text-white' :
										 'bg-slate-100 border border-slate-200 text-slate-500'}">
										{#if isDone}
											<i class="ri-check-line font-bold"></i>
										{:else if isActive}
											<i class="ri-play-fill"></i>
										{:else}
											{index + 1}
										{/if}
									</div>

									<div class="flex-1 min-w-0">
										<h4 class="font-medium text-sm {isActive ? 'text-slate-900 font-semibold' : isDone ? 'text-slate-700 font-medium' : 'text-slate-600'} line-clamp-2">
											{mat.title}
										</h4>
										<p class="text-xs text-slate-500 mt-1 flex items-center gap-1">
											<i class={mat.material_type === 'video' ? 'ri-vidicon-line' : (mat.material_type === 'image' ? 'ri-image-line' : 'ri-file-text-line')}></i>
											{mat.material_type}
											{#if isDone}
												<span class="text-emerald-600 font-medium ml-1">• Done</span>
											{/if}
										</p>
									</div>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		</div>
	</div>
{/if}
