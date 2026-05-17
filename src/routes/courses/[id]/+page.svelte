<script>
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	
	let courseId = $derived($page.params.id);
	let course = $state(null);
	let materials = $state([]);
	let isLoading = $state(true);
	
	// Payment Modal States
	let showPaymentModal = $state(false);
	let isProcessingPayment = $state(false);
	let paymentStatus = $state('');
	
	// Auth
	let user = $state(null);
	
	onMount(async () => {
		// Get current user from custom auth
		const storedUser = localStorage.getItem('currentUser');
		if (storedUser) {
			user = JSON.parse(storedUser);
			
			// Check if already enrolled
			const { data: enrollment } = await supabase.from('enrollments')
				.select('*')
				.eq('user_id', user.id)
				.eq('course_id', courseId)
				.single();
				
			if (enrollment) {
				// Redirect straight to learning portal
				goto(`/student/courses/${courseId}`);
				return;
			}
		}
		
		// Fetch course details
		const { data: cData } = await supabase.from('courses').select('*').eq('id', courseId).single();
		if (cData) course = cData;
		
		// Fetch materials for preview
		const { data: mData } = await supabase.from('course_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
		if (mData) materials = mData;
		
		isLoading = false;
	});
	
	async function handlePayment(e) {
		e.preventDefault();
		if (!user) {
			alert('Please log in or sign up first to enroll in this course.');
			goto('/');
			return;
		}
		
		isProcessingPayment = true;
		paymentStatus = 'Processing payment securely...';
		
		// Simulate network delay for mock payment
		setTimeout(async () => {
			paymentStatus = 'Payment successful! Enrolling you...';
			
			const { error } = await supabase.from('enrollments').insert({
				user_id: user.id,
				course_id: courseId,
				progress: 0
			});
			
			if (error) {
				paymentStatus = 'Enrollment failed: ' + error.message;
				isProcessingPayment = false;
				return;
			}
			
			// Redirect to learning area
			setTimeout(() => {
				goto(`/student/courses/${courseId}`);
			}, 1500);
			
		}, 2500);
	}
</script>

{#if isLoading}
	<div class="flex items-center justify-center h-screen text-primary bg-slate-50">
		<i class="ri-loader-4-line animate-spin text-5xl"></i>
	</div>
{:else if course}
	<div class="max-w-6xl mx-auto space-y-12 animate-[fadeIn_0.5s_ease-out] pb-20 px-4">
		<!-- Hero Section -->
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-6">
			<div class="lg:col-span-2 space-y-6">
				<a href="/courses" class="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 mb-4 font-medium">
					<i class="ri-arrow-left-line"></i> Back to Catalog
				</a>
				<h1 class="text-4xl font-bold text-slate-800 leading-tight">{course.title}</h1>
				<p class="text-lg text-slate-600 leading-relaxed">{course.description}</p>
				
				<div class="flex items-center gap-6 text-sm text-slate-500 pt-4">
					<span class="flex items-center gap-2"><i class="ri-user-star-line text-primary text-xl"></i> Created by <span class="text-slate-800 font-semibold">{course.instructor_name || 'Expert Instructor'}</span></span>
					<span class="flex items-center gap-2"><i class="ri-vidicon-line text-primary text-xl"></i> {materials.length} Lessons</span>
				</div>
			</div>
			
			<!-- Checkout Card -->
			<div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
				<div class="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl blur opacity-5 group-hover:opacity-10 transition duration-1000"></div>
				<div class="relative bg-white rounded-xl flex flex-col h-full">
					<img src={course.thumbnail_url || 'https://images.unsplash.com/photo-1555949963-ff9fe0c870eb?auto=format&fit=crop&w=600&q=80'} alt="Course Thumbnail" class="w-full h-48 object-cover rounded-t-xl" />
					<div class="p-6 flex flex-col flex-1">
						<div class="text-4xl font-extrabold text-slate-850 mb-6">₹{course.price || 0}</div>
						<button onclick={() => showPaymentModal = true} class="w-full py-4 bg-gradient-to-br from-primary to-secondary text-white font-bold rounded-xl text-lg hover:scale-[1.02] transition-transform shadow-lg shadow-primary/20 flex items-center justify-center gap-2">
							<i class="ri-secure-payment-line"></i> Enroll Now
						</button>
						<div class="mt-6 space-y-3 text-sm text-slate-500 font-medium">
							<p class="flex items-center gap-2"><i class="ri-check-line text-emerald-500 text-lg"></i> Full lifetime access</p>
							<p class="flex items-center gap-2"><i class="ri-check-line text-emerald-500 text-lg"></i> Access on mobile and tablet</p>
							<p class="flex items-center gap-2"><i class="ri-check-line text-emerald-500 text-lg"></i> Certificate of completion</p>
						</div>
					</div>
				</div>
			</div>
		</div>

		<!-- Curriculum Preview -->
		<div class="max-w-3xl">
			<h2 class="text-2xl font-bold text-slate-800 mb-6 border-b border-slate-200 pb-4">Course Curriculum</h2>
			{#if materials.length === 0}
				<p class="text-slate-400 italic">Curriculum is being prepared.</p>
			{:else}
				<div class="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
					<ul class="divide-y divide-slate-100">
						{#each materials as mat, index}
							<li class="p-5 flex items-center gap-4 hover:bg-slate-50 transition-colors">
								<div class="text-slate-400 font-mono w-6">{index + 1}</div>
								<div class="w-8 h-8 rounded-full bg-slate-100 text-primary flex items-center justify-center text-sm font-semibold">
									<i class={mat.material_type === 'video' ? 'ri-play-fill' : (mat.material_type === 'image' ? 'ri-image-fill' : 'ri-file-text-fill')}></i>
								</div>
								<div class="flex-1">
									<h4 class="text-slate-700 font-semibold">{mat.title}</h4>
								</div>
								<div class="text-xs text-slate-400 uppercase flex items-center gap-1 font-medium"><i class="ri-lock-line"></i> Locked</div>
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	</div>

	<!-- MOCK PAYMENT MODAL -->
	{#if showPaymentModal}
		<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-[fadeIn_0.3s_ease-out]">
			<div class="bg-white border border-slate-200 w-full max-w-md rounded-3xl shadow-2xl overflow-hidden relative">
				<button onclick={() => !isProcessingPayment && (showPaymentModal = false)} class="absolute top-4 right-4 text-slate-400 hover:text-slate-700 p-2" disabled={isProcessingPayment}>
					<i class="ri-close-line text-2xl"></i>
				</button>
				
				<div class="p-8">
					<div class="flex items-center gap-3 mb-8">
						<div class="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
							<i class="ri-bank-card-line text-xl"></i>
						</div>
						<h2 class="text-xl font-bold text-slate-800">Secure Checkout</h2>
					</div>
					
					<div class="bg-slate-50 rounded-2xl p-5 mb-6 border border-slate-200">
						<div class="text-xs text-slate-500 mb-1 font-medium">You are purchasing</div>
						<div class="font-bold text-slate-800 mb-4">{course.title}</div>
						<div class="flex justify-between items-end border-t border-slate-200/80 pt-4">
							<span class="text-slate-500 font-medium text-sm">Total Amount</span>
							<span class="text-2xl font-black text-emerald-600">₹{course.price || 0}</span>
						</div>
					</div>

					{#if isProcessingPayment}
						<div class="flex flex-col items-center justify-center py-8 text-center space-y-4">
							<div class="relative w-16 h-16">
								<div class="absolute inset-0 border-4 border-slate-100 rounded-full"></div>
								<div class="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin"></div>
								{#if paymentStatus.includes('successful')}
									<div class="absolute inset-0 flex items-center justify-center text-primary animate-[zoomIn_0.3s_ease-out]">
										<i class="ri-check-line text-3xl font-bold"></i>
									</div>
								{/if}
							</div>
							<p class="text-slate-750 font-semibold text-sm">{paymentStatus}</p>
						</div>
					{:else}
						<form onsubmit={handlePayment} class="space-y-4">
							<div>
								<label class="block text-xs font-semibold text-slate-500 mb-2">Card Number</label>
								<div class="relative">
									<input type="text" placeholder="4111 1111 1111 1111" required class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 pl-12 text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none font-mono text-sm">
									<i class="ri-mastercard-line absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xl"></i>
								</div>
							</div>
							<div class="grid grid-cols-2 gap-4">
								<div>
									<label class="block text-xs font-semibold text-slate-500 mb-2">Expiry Date</label>
									<input type="text" placeholder="MM/YY" required class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:border-primary outline-none text-sm">
								</div>
								<div>
									<label class="block text-xs font-semibold text-slate-500 mb-2">CVV</label>
									<input type="password" placeholder="123" required class="w-full bg-white border border-slate-200 rounded-xl py-3 px-4 text-slate-800 focus:border-primary outline-none text-sm font-mono">
								</div>
							</div>
							<button type="submit" class="w-full py-3.5 mt-4 bg-primary hover:bg-violet-850 text-white font-bold rounded-xl text-lg shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2">
								Pay ₹{course.price || 0}
							</button>
						</form>
					{/if}
				</div>
			</div>
		</div>
	{/if}
{:else}
	<div class="flex flex-col items-center justify-center h-screen text-slate-450 bg-slate-50">
		<i class="ri-error-warning-line text-5xl mb-4 text-slate-300"></i>
		<h2 class="text-2xl font-bold text-slate-800 mb-2">Course not found</h2>
		<a href="/courses" class="text-primary hover:underline mt-4 font-semibold">Browse Catalog</a>
	</div>
{/if}
