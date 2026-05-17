<script>
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	
	let email = $state('');
	let password = $state('');
	let isSignUp = $state(false);
	let isLoading = $state(false);
	let errorMessage = $state('');
	let selectedRole = $state('Student');
	
	async function handleAuth(e) {
		e.preventDefault();
		isLoading = true;
		errorMessage = '';
		
		try {
			if (isSignUp) {
				const { error } = await supabase.from('custom_users').insert({
					email: email,
					password: password,
					role: selectedRole
				});
				
				if (error) {
					alert("Registration Error: " + error.message);
					throw error;
				}
				
				alert("Account created successfully! Please click Sign In to continue.");
				errorMessage = 'Account created successfully! You can now sign in.';
				isSignUp = false;
				password = '';
			} else {
				const { data, error } = await supabase.from('custom_users')
					.select('*')
					.eq('email', email)
					.eq('password', password)
					.single();
				
				if (error || !data) {
					alert("Sign In Error: Invalid email or password");
					throw new Error("Invalid credentials");
				}
				
				// Save session using our custom auth structure
				localStorage.setItem('currentUser', JSON.stringify(data));
				
				const role = data.role;
				alert("Login successful! Redirecting to " + role + " dashboard...");
				
				if (role === 'Teacher') {
					window.location.href = '/teacher/dashboard';
				} else if (role === 'Admin') {
					window.location.href = '/admin/dashboard';
				} else {
					window.location.href = '/student/dashboard';
				}
			}
		} catch (err) {
			console.error("Auth Exception:", err);
			errorMessage = err.message || "An unexpected error occurred. Please check console.";
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="min-h-screen flex relative overflow-hidden bg-slate-50">
	<!-- Background Effects -->
	<div class="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] pointer-events-none"></div>
	<div class="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-secondary/10 blur-[120px] pointer-events-none"></div>

	<div class="flex-1 flex flex-col justify-center px-4 sm:px-6 lg:flex-none lg:px-20 xl:px-24 z-10 w-full lg:w-1/2 py-10">
		<div class="mx-auto w-full max-w-sm lg:w-[420px] backdrop-blur-xl bg-white/80 p-6 sm:p-8 rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50">
			<div class="flex items-center gap-3 mb-8">
				<div class="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
					<svg class="w-7 h-7 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M16 2L2 9L16 16L30 9L16 2Z" fill="currentColor"/>
						<path d="M2 16L16 23L30 16" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M2 21.5L16 28.5L30 21.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
				</div>
				<h2 class="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">Dex LMS</h2>
			</div>

			<h2 class="mt-6 text-2xl font-black tracking-tight text-slate-800">{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
			<p class="mt-2 text-sm text-slate-500 font-semibold">{isSignUp ? 'Join our platform to access courses.' : 'Please sign in to access your courses and AI tools.'}</p>

			{#if errorMessage}
				<div class="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-650 text-sm font-semibold">
					{errorMessage}
				</div>
			{/if}

			<div class="mt-8">
				<form onsubmit={handleAuth} class="space-y-6">
					<div>
						<label for="email" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Email address</label>
						<div class="mt-1.5 relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
								<i class="ri-mail-line"></i>
							</div>
							<input id="email" bind:value={email} type="email" required class="block w-full pl-10 bg-white border border-slate-250 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all sm:text-sm font-semibold" placeholder="you@example.com">
						</div>
					</div>

					<div>
						<label for="password" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Password</label>
						<div class="mt-1.5 relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
								<i class="ri-lock-password-line"></i>
							</div>
							<input id="password" bind:value={password} type="password" required class="block w-full pl-10 bg-white border border-slate-250 rounded-xl py-3 px-4 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all sm:text-sm font-semibold" placeholder="••••••••">
						</div>
					</div>

					{#if isSignUp}
					<div>
						<label for="role" class="block text-xs font-bold text-slate-500 uppercase tracking-wider">Register As</label>
						<div class="mt-1.5 relative">
							<div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 z-10">
								<i class="ri-user-settings-line"></i>
							</div>
							<select id="role" bind:value={selectedRole} class="block w-full pl-10 bg-white border border-slate-250 rounded-xl py-3.5 px-4 text-slate-800 placeholder-slate-400 focus:ring-1 focus:ring-primary focus:border-primary outline-none transition-all sm:text-sm cursor-pointer appearance-none relative font-semibold">
								<option value="Student">Student</option>
								<option value="Teacher">Teacher</option>
								<option value="Admin">Admin</option>
							</select>
							<div class="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none text-slate-400">
								<i class="ri-arrow-down-s-line"></i>
							</div>
						</div>
					</div>
					{/if}

					{#if !isSignUp}
					<div class="flex items-center justify-between">
						<div class="flex items-center">
							<input id="remember-me" type="checkbox" class="h-4 w-4 rounded bg-white border-slate-300 text-primary focus:ring-primary">
							<label for="remember-me" class="ml-2 block text-sm text-slate-600 font-semibold">Remember me</label>
						</div>
						<div class="text-sm">
							<a href="#" class="font-bold text-primary hover:underline transition-colors">Forgot password?</a>
						</div>
					</div>
					{/if}

					<div>
						<button disabled={isLoading} type="submit" class="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-primary/20 text-sm font-bold text-white bg-gradient-to-r from-primary to-secondary hover:from-blue-600 hover:to-purple-650 focus:outline-none transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:pointer-events-none">
							{#if isLoading}
								<i class="ri-loader-4-line animate-spin mr-2"></i> Processing...
							{:else}
								{isSignUp ? 'Create Account' : 'Sign in'}
							{/if}
						</button>
					</div>
					
					<div class="text-center mt-4">
						<button type="button" onclick={() => { isSignUp = !isSignUp; errorMessage = ''; }} class="text-sm text-slate-500 hover:text-slate-800 transition-colors font-bold">
							{isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
						</button>
					</div>
				</form>
			</div>
		</div>
		<div class="mt-6 text-center text-xs text-slate-400 font-bold tracking-widest uppercase animate-pulse">
			Developed with 💜 by <span class="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary font-black">SHRADDHABA RANA</span>
		</div>
	</div>
	
	<div class="hidden lg:block relative w-1/2">
		<img class="absolute inset-0 h-full w-full object-cover" src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1920&q=80" alt="Students learning">
		<div class="absolute inset-0 bg-gradient-to-r from-slate-50 via-slate-50/40 to-transparent"></div>
		<div class="absolute bottom-12 left-12 right-12 backdrop-blur-md bg-white/70 p-8 rounded-2xl border border-slate-200/50 shadow-lg">
			<h3 class="text-2xl font-black text-slate-800 mb-2">Empowering Education with Dex AI</h3>
			<p class="text-slate-600 font-semibold leading-relaxed">The next generation Learning and Course Management Platform designed to integrate academic learning with intelligent insights, automated performance tracking, and custom course curation.</p>
		</div>
	</div>
</div>
