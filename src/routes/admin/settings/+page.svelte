<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	let isLoading = $state(true);
	let isSaving = $state(false);
	let activeTab = $state('general'); // general, ai, security
	let showSuccessToast = $state(false);

	// Settings State
	let generalSettings = $state({
		platformName: 'Dex AI LMS',
		brandColor: 'rose',
		allowSignups: true
	});

	let aiSettings = $state({
		enableDex: true,
		enablePlans: true,
		modelName: 'llama-3.1-8b-instant',
		maxTokens: 1024
	});

	let securitySettings = $state({
		maintenanceMode: false
	});

	onMount(async () => {
		// Security check: Admin role only
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

		await fetchSettings();
		isLoading = false;
	});

	async function fetchSettings() {
		try {
			const { data, error } = await supabase.from('platform_settings').select('*');
			if (error) throw error;

			if (data) {
				const general = data.find(d => d.key === 'general');
				if (general) generalSettings = { ...generalSettings, ...general.value };

				const ai = data.find(d => d.key === 'ai_config');
				if (ai) aiSettings = { ...aiSettings, ...ai.value };

				const security = data.find(d => d.key === 'security');
				if (security) securitySettings = { ...securitySettings, ...security.value };
			}
		} catch (err) {
			console.error('Error fetching settings:', err);
		}
	}

	async function saveSettings(e) {
		if (e) e.preventDefault();
		isSaving = true;

		try {
			const updates = [
				{ key: 'general', value: generalSettings, updated_at: new Date() },
				{ key: 'ai_config', value: aiSettings, updated_at: new Date() },
				{ key: 'security', value: securitySettings, updated_at: new Date() }
			];

			const { error } = await supabase.from('platform_settings').upsert(updates);
			if (error) throw error;

			// Show success animation
			showSuccessToast = true;
			setTimeout(() => {
				showSuccessToast = false;
			}, 3000);

		} catch (err) {
			alert('Failed to save settings: ' + err.message);
		} finally {
			isSaving = false;
		}
	}
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out] pb-12 relative">
	<!-- Success Toast Notification -->
	{#if showSuccessToast}
		<div class="fixed top-6 right-6 z-50 flex items-center gap-3 bg-emerald-500 text-white px-5 py-3 rounded-2xl shadow-xl shadow-emerald-500/20 border border-emerald-400/20 animate-[slideIn_0.3s_ease-out]">
			<i class="ri-checkbox-circle-fill text-xl"></i>
			<div>
				<p class="font-bold text-xs uppercase tracking-wide">Success</p>
				<p class="text-[11px] text-emerald-100">Platform configurations synced successfully!</p>
			</div>
		</div>
	{/if}

	<!-- Header -->
	<div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
		<div>
			<h1 class="text-3xl font-black text-white tracking-wide flex items-center gap-3">
				<span class="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-violet-500/20">Config</span>
				Platform Global Settings
			</h1>
			<p class="mt-2 text-slate-400 text-sm">Tune General characteristics, AI model parameters, and platform uptime modes.</p>
		</div>
	</div>

	<!-- Custom Vanilla Tabs -->
	<div class="flex border-b border-slate-850 gap-2 shrink-0">
		<button onclick={() => activeTab = 'general'}
			class="px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'general' ? 'text-rose-500 border-rose-500' : 'text-slate-400 border-transparent hover:text-slate-200'}">
			<i class="ri-settings-4-line"></i> General settings
		</button>
		<button onclick={() => activeTab = 'ai'}
			class="px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'ai' ? 'text-rose-500 border-rose-500' : 'text-slate-400 border-transparent hover:text-slate-200'}">
			<i class="ri-brain-line"></i> AI Engine Config
		</button>
		<button onclick={() => activeTab = 'security'}
			class="px-5 py-3 text-sm font-semibold tracking-wide border-b-2 transition-all flex items-center gap-2
			{activeTab === 'security' ? 'text-rose-500 border-rose-500' : 'text-slate-400 border-transparent hover:text-slate-200'}">
			<i class="ri-shield-check-line"></i> Maintenance & Safety
		</button>
	</div>

	{#if isLoading}
		<div class="flex flex-col items-center justify-center py-20 text-slate-500">
			<i class="ri-loader-4-line animate-spin text-5xl text-rose-500 mb-4"></i>
			<p class="text-sm font-medium tracking-wide">Syncing configuration values...</p>
		</div>
	{:else}
		<form onsubmit={saveSettings} class="space-y-6">
			<!-- Settings content cards -->
			{#if activeTab === 'general'}
				<div class="bg-panel border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-6">
					<div>
						<h3 class="text-white font-bold text-base flex items-center gap-2 mb-1"><i class="ri-home-gear-line text-rose-500"></i> Platform Branding</h3>
						<p class="text-slate-400 text-xs">Configure the global look and feel of the AI LMS platform.</p>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
						<!-- Platform Name -->
						<div class="space-y-2">
							<label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Platform Display Name</label>
							<input type="text" bind:value={generalSettings.platformName} required
								class="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 focus:border-rose-500 outline-none transition-all" />
						</div>

						<!-- Brand Color -->
						<div class="space-y-2">
							<label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Default Brand Theme Accent</label>
							<select bind:value={generalSettings.brandColor}
								class="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 focus:border-rose-500 outline-none transition-all cursor-pointer">
								<option value="rose">Rose Sparkle (Default)</option>
								<option value="violet">Violet Eclipse (Sleek dark)</option>
								<option value="emerald">Emerald Oasis (Green bio)</option>
								<option value="blue">Deep Ocean Blue</option>
							</select>
						</div>

						<!-- Allow Signups Toggle -->
						<div class="col-span-full bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
							<div>
								<p class="text-white text-sm font-semibold">Allow Public Student Registration</p>
								<p class="text-slate-400 text-xs mt-0.5">Toggle whether users can sign up from the main landing page.</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={generalSettings.allowSignups} class="sr-only peer">
								<div class="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
							</label>
						</div>
					</div>
				</div>

			{:else if activeTab === 'ai'}
				<div class="bg-panel border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-6">
					<div>
						<h3 class="text-white font-bold text-base flex items-center gap-2 mb-1"><i class="ri-brain-line text-rose-500"></i> AI Assistant Engine Configuration</h3>
						<p class="text-slate-400 text-xs">Configure LLM model parameters, system coaching features, and execution limits.</p>
					</div>

					<div class="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-800">
						<!-- Model Standard -->
						<div class="space-y-2">
							<label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Groq LLM Model (Standardized)</label>
							<select bind:value={aiSettings.modelName}
								class="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 focus:border-rose-500 outline-none transition-all cursor-pointer">
								<option value="llama-3.1-8b-instant">llama-3.1-8b-instant (Fastest & Standard)</option>
								<option value="llama-3.3-70b-versatile">llama-3.3-70b-versatile (Smartest reasoning)</option>
								<option value="mixtral-8x7b-32768">mixtral-8x7b-32768 (High context)</option>
							</select>
						</div>

						<!-- Max Output Tokens -->
						<div class="space-y-2">
							<label class="block text-xs font-bold uppercase tracking-wider text-slate-300">Max Generated Completion Tokens</label>
							<input type="number" bind:value={aiSettings.maxTokens} min="256" max="4096"
								class="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 px-4 text-sm text-slate-200 focus:border-rose-500 outline-none transition-all" />
						</div>

						<!-- Enable Dex Toggle -->
						<div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
							<div>
								<p class="text-white text-sm font-semibold">Enable Global Dex AI Chat Coach</p>
								<p class="text-slate-400 text-xs mt-0.5">Toggle the visible chat assistant floating bubble across pages.</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={aiSettings.enableDex} class="sr-only peer">
								<div class="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
							</label>
						</div>

						<!-- Enable Plans Toggle -->
						<div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
							<div>
								<p class="text-white text-sm font-semibold">Enable DexPanel Study Plans</p>
								<p class="text-slate-400 text-xs mt-0.5">Toggle the automated study plans on student dashboard panels.</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={aiSettings.enablePlans} class="sr-only peer">
								<div class="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500"></div>
							</label>
						</div>
					</div>
				</div>

			{:else}
				<div class="bg-panel border border-slate-700/50 rounded-2xl p-6 shadow-xl space-y-6">
					<div>
						<h3 class="text-white font-bold text-base flex items-center gap-2 mb-1"><i class="ri-error-warning-line text-rose-500"></i> Platform Maintenance Controls</h3>
						<p class="text-slate-400 text-xs">Manage system uptime status and emergency platform overrides.</p>
					</div>

					<div class="pt-4 border-t border-slate-800 space-y-4">
						<!-- Maintenance Mode Toggle -->
						<div class="bg-slate-900/60 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-4">
							<div>
								<p class="text-white text-sm font-semibold flex items-center gap-2">
									<i class="ri-tools-line text-amber-500"></i> Platform Emergency Maintenance Mode
								</p>
								<p class="text-slate-400 text-xs mt-0.5">If turned on, all students and teachers will see a maintenance message, restricting platform usage to admins only.</p>
							</div>
							<label class="relative inline-flex items-center cursor-pointer">
								<input type="checkbox" bind:checked={securitySettings.maintenanceMode} class="sr-only peer">
								<div class="w-11 h-6 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
							</label>
						</div>

						{#if securitySettings.maintenanceMode}
							<div class="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 flex gap-3 items-start animate-[fadeIn_0.3s_ease-out]">
								<i class="ri-alert-line text-amber-500 text-xl shrink-0 mt-0.5 animate-bounce"></i>
								<div>
									<p class="text-amber-400 text-xs font-bold uppercase tracking-wider">Warning: Emergency Mode Activated</p>
									<p class="text-slate-300 text-[11px] mt-1 leading-relaxed">
										Saving this setting will restrict course access to only system administrators. Students trying to read lesson contents will be redirected safely.
									</p>
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}

			<!-- Form Actions -->
			<div class="flex justify-end gap-3 pt-4 border-t border-slate-850">
				<button type="button" onclick={fetchSettings} disabled={isSaving}
					class="px-5 py-3 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50">
					Reset Changes
				</button>
				<button type="submit" disabled={isSaving}
					class="px-6 py-3 rounded-xl text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg flex items-center gap-2 disabled:opacity-50
					{isSaving ? 'bg-rose-600/50' : 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/20 hover:scale-[1.02]'}"
				>
					{#if isSaving}
						<i class="ri-loader-4-line animate-spin"></i> Saving configs...
					{:else}
						<i class="ri-save-line"></i> Save Configurations
					{/if}
				</button>
			</div>
		</form>
	{/if}
</div>

<style>
	@keyframes slideIn {
		from { transform: translateX(100%) translateY(0); opacity: 0; }
		to { transform: translateX(0) translateY(0); opacity: 1; }
	}
</style>
