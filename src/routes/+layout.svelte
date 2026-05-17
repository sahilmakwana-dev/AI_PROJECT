<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import AIChatWidget from '$lib/components/AIChatWidget.svelte';
	
	let { children } = $props();

	let isLogin = $derived($page.url.pathname === '/');
	let menuOpen = $state(false);
	
	let currentRole = $state('');
	let currentUser = $state(null);
	let isMaintenance = $state(false);
	
	onMount(() => {
		document.documentElement.className = 'light';

		const storedUser = localStorage.getItem('currentUser');
		let role = '';
		if (storedUser) {
			try {
				const user = JSON.parse(storedUser);
				currentUser = user;
				currentRole = user.role;
				role = user.role;
				
				// Auto-route based on role if on root or dashboard
				if ($page.url.pathname === '/' || $page.url.pathname === '/dashboard') {
					if (role === 'Teacher') window.location.href = '/teacher/dashboard';
					else if (role === 'Admin') window.location.href = '/admin/dashboard';
					else window.location.href = '/student/dashboard';
				}
			} catch (e) {
				localStorage.removeItem('currentUser');
			}
		} else {
			currentUser = null;
			currentRole = '';
			
			// If logged out and not on login page, force to login
			if ($page.url.pathname !== '/') {
				window.location.href = '/';
			}
		}

		// Fetch maintenance mode state
		supabase.from('platform_settings').select('value').eq('key', 'security').single().then(({ data }) => {
			if (data && data.value && data.value.maintenanceMode) {
				if (role !== 'Admin') {
					isMaintenance = true;
				}
			}
		});
	});
	
	let navLinks = $derived.by(() => {
		if (currentRole === 'Student') {
			return [
				{ name: 'Dashboard', path: '/student/dashboard', icon: 'ri-dashboard-line' },
				{ name: 'Course Catalog', path: '/courses', icon: 'ri-book-open-line' },
				{ name: 'Recommendations', path: '/recommendations', icon: 'ri-magic-line' },
				{ name: 'Performance', path: '/performance', icon: 'ri-bar-chart-box-line' }
			];
		} else if (currentRole === 'Teacher') {
			return [
				{ name: 'Teacher Panel', path: '/teacher/dashboard', icon: 'ri-presentation-line' },
				{ name: 'Create Course', path: '/teacher/courses/new', icon: 'ri-add-box-line' },
				{ name: 'Course Catalog', path: '/courses', icon: 'ri-book-open-line' }
			];
		} else if (currentRole === 'Admin') {
			return [
				{ name: 'Admin Dashboard', path: '/admin/dashboard', icon: 'ri-shield-keyhole-line' },
				{ name: 'Platform Settings', path: '/admin/settings', icon: 'ri-settings-4-line' },
				{ name: 'Course Catalog', path: '/courses', icon: 'ri-book-open-line' }
			];
		}
		return [];
	});

	function handleLogout() {
		localStorage.removeItem('currentUser');
		window.location.href = '/';
	}
</script>

{#if isLogin}
	{@render children()}
{:else if isMaintenance}
	<div class="min-h-screen bg-dark flex flex-col items-center justify-center p-6 text-center animate-[fadeIn_0.5s_ease-out]">
		<div class="w-20 h-20 bg-amber-500/10 rounded-2xl flex items-center justify-center border border-amber-500/20 mb-6 shadow-xl shadow-amber-500/5">
			<i class="ri-tools-line text-4xl text-amber-500 animate-pulse"></i>
		</div>
		<h2 class="text-3xl font-black text-white tracking-wide">Platform Maintenance Mode</h2>
		<p class="text-slate-400 max-w-md mt-3 text-sm leading-relaxed">
			We are currently upgrading the platform systems to serve you better. Non-administrator access is temporarily restricted.
		</p>
		<p class="text-slate-500 text-xs mt-6">Please try again in a few minutes.</p>
		<button onclick={handleLogout} class="mt-8 px-6 py-2.5 bg-slate-800 hover:bg-slate-750 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all">
			Return to Login
		</button>
	</div>
{:else}
	<div class="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
		<!-- Sidebar -->
		<aside class="w-64 bg-white border-r border-slate-200 md:flex flex-col {menuOpen ? 'fixed inset-y-0 left-0 z-50 flex' : 'hidden'}">
			<div class="p-6 flex items-center justify-between text-primary font-bold text-xl">
				<div class="flex items-center gap-3">
					<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
						<svg class="w-6 h-6 text-white" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
							<path d="M16 2L2 9L16 16L30 9L16 2Z" fill="currentColor"/>
							<path d="M2 16L16 23L30 16" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
							<path d="M2 21.5L16 28.5L30 21.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						</svg>
					</div>
					<span class="font-black text-xl text-slate-805 bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-900 tracking-tight">Dex LMS</span>
				</div>
				<button class="md:hidden text-slate-500 hover:text-slate-800" onclick={() => menuOpen = false}>
					<i class="ri-close-line text-2xl"></i>
				</button>
			</div>
			
			<nav class="flex-1 px-4 mt-6 space-y-2">
				{#each navLinks as link}
					<a href={link.path} onclick={() => menuOpen = false} class="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 {$page.url.pathname === link.path ? 'bg-primary/10 text-primary shadow-[0_2px_10px_rgba(76,29,149,0.08)] font-semibold' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'}">
						<i class="{link.icon} text-lg"></i>
						<span class="font-medium">{link.name}</span>
					</a>
				{/each}
			</nav>

			<div class="p-4 mt-auto space-y-4">
				<div class="p-4 rounded-xl bg-slate-50 border border-slate-200">
					<div class="flex items-center gap-3">
						<div class="w-10 h-10 rounded-full border-2 border-primary/50 bg-white flex items-center justify-center text-primary font-bold">
							{currentUser?.email?.charAt(0).toUpperCase() || 'U'}
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-semibold truncate text-slate-800">{currentUser?.email || 'User'}</p>
							<p class="text-xs text-primary font-medium truncate uppercase tracking-wider">{currentRole}</p>
						</div>
					</div>
					<button onclick={handleLogout} class="mt-4 w-full flex items-center justify-center gap-2 py-2 text-sm text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors font-medium">
						<i class="ri-logout-circle-line"></i> Logout
					</button>
				</div>
			</div>
		</aside>
		
		<!-- Mobile backdrop -->
		{#if menuOpen}
			<div class="fixed inset-0 bg-black/40 z-40 md:hidden" onclick={() => menuOpen = false}></div>
		{/if}

		<!-- Main Content -->
		<div class="flex-1 flex flex-col min-w-0 overflow-hidden">
			<!-- Mobile Header -->
			<header class="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200">
				<div class="flex items-center gap-2 text-primary font-bold">
					<svg class="w-6 h-6" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
						<path d="M16 2L2 9L16 16L30 9L16 2Z" fill="currentColor"/>
						<path d="M2 16L16 23L30 16" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
						<path d="M2 21.5L16 28.5L30 21.5" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
					</svg>
					<span class="font-black text-lg text-slate-850 tracking-tight">Dex LMS</span>
				</div>
				<button onclick={() => menuOpen = !menuOpen} class="text-slate-600 hover:text-slate-900">
					<i class="ri-menu-3-line text-2xl"></i>
				</button>
			</header>
			
			<main class="flex-1 overflow-y-auto p-4 md:p-8">
				<div class="max-w-7xl mx-auto">
					{@render children()}
				</div>
			</main>
		</div>
	</div>
	<!-- Global AI Chat Widget -->
	<AIChatWidget />
{/if}
