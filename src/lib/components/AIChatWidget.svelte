<script>
	import { supabase } from '$lib/supabaseClient';
	import { onMount } from 'svelte';

	let isOpen = $state(false);
	let isTyping = $state(false);
	let inputText = $state('');
	let messagesEl = $state(null);
	let currentUser = $state(null);
	let userContext = $state('');

	let messages = $state([
		{
			role: 'assistant',
			content: "Hey! 👋 I'm Dex, your personal AI learning coach. Tell me your goal and I'll build you a study plan, suggest which lessons to tackle today, and keep you on track. What are you working on?"
		}
	]);

	const quickPrompts = [
		"What should I study today?",
		"Build me a weekly plan",
		"Which course should I start?",
		"How am I doing overall?"
	];

	onMount(async () => {
		const stored = localStorage.getItem('currentUser');
		if (stored) {
			currentUser = JSON.parse(stored);

			const { data: enrollData } = await supabase
				.from('enrollments')
				.select('progress, course_id, courses(title)')
				.eq('user_id', currentUser.id);

			const { data: compData } = await supabase
				.from('lesson_completions')
				.select('material_id, course_id, course_materials(title)')
				.eq('user_id', currentUser.id);

			const { data: pendingData } = await supabase
				.from('course_materials')
				.select('id, title, course_id')
				.in('course_id', (enrollData || []).map(e => e.course_id));

			if (enrollData && enrollData.length > 0) {
				const completedIds = new Set((compData || []).map(c => c.material_id));
				const courseDetails = enrollData.map(e => {
					const total = (pendingData || []).filter(l => l.course_id === e.course_id).length;
					const done = (compData || []).filter(c => c.course_id === e.course_id).length;
					const nextLesson = (pendingData || []).find(l => l.course_id === e.course_id && !completedIds.has(l.id));
					return `"${e.courses?.title}": ${done}/${total} lessons done (${e.progress || 0}%), next: ${nextLesson?.title || 'All complete!'}`;
				}).join(' | ');
				userContext = `Student: ${currentUser.email}. Courses: ${courseDetails}.`;
			} else {
				userContext = `Student: ${currentUser.email}. No courses enrolled yet.`;
			}
		}
	});

	async function sendMessage(text) {
		const msg = text || inputText.trim();
		if (!msg) return;
		inputText = '';

		messages = [...messages, { role: 'user', content: msg }];
		isTyping = true;
		scrollToBottom();

		try {
			const res = await fetch('/api/chat', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					messages: messages.map(m => ({ role: m.role, content: m.content })),
					userContext
				})
			});
			const data = await res.json();
			messages = [...messages, { role: 'assistant', content: data.reply }];
		} catch (e) {
			messages = [...messages, { role: 'assistant', content: "Hmm, I'm having a moment. Try again in a sec! 🔄" }];
		} finally {
			isTyping = false;
			scrollToBottom();
		}
	}

	function scrollToBottom() {
		setTimeout(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		}, 50);
	}

	function handleKeydown(e) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			sendMessage();
		}
	}

	function clearChat() {
		messages = [messages[0]];
	}
</script>

<!-- Floating Dex Button -->
<button
	onclick={() => isOpen = !isOpen}
	class="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-2xl shadow-violet-500/40 flex flex-col items-center justify-center hover:scale-110 transition-all duration-300 group border border-white/20"
	aria-label="Open Dex AI"
>
	{#if isOpen}
		<i class="ri-close-line text-2xl"></i>
	{:else}
		<span class="text-xs font-black tracking-wider text-white/90 leading-none">DEX</span>
		<i class="ri-sparkling-2-fill text-sm text-violet-200 mt-0.5"></i>
		<span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white animate-pulse"></span>
	{/if}
</button>

<!-- Dex Chat Panel -->
{#if isOpen}
	<div class="fixed bottom-28 right-6 z-50 w-[400px] max-w-[calc(100vw-1.5rem)] flex flex-col rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/80 border border-violet-100 animate-[slideUp_0.25s_ease-out]"
		style="height: 540px; background: #ffffff;">

		<!-- Dex Header -->
		<div class="shrink-0 px-5 py-4 flex items-center justify-between bg-gradient-to-r from-violet-900 to-indigo-850 border-b border-violet-800">
			<div class="flex items-center gap-3">
				<div class="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-white/10 backdrop-blur-md border border-white/15">
					<div class="text-center">
						<span class="text-xs font-black text-white leading-none block">DEX</span>
						<i class="ri-sparkling-2-fill text-violet-300 text-xs"></i>
					</div>
				</div>
				<div>
					<h3 class="text-white font-bold text-sm tracking-wide">Dex AI</h3>
					<p class="text-violet-200 text-xs flex items-center gap-1.5">
						<span class="w-1.5 h-1.5 bg-emerald-450 rounded-full animate-pulse inline-block"></span>
						Your Personal Learning Assistant
					</p>
				</div>
			</div>
			<button onclick={clearChat} class="text-violet-200 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-white/10" title="New conversation" aria-label="New conversation">
				<i class="ri-restart-line text-base"></i>
			</button>
		</div>

		<!-- Messages -->
		<div bind:this={messagesEl} class="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth bg-slate-50">
			{#each messages as msg}
				<div class="flex {msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-[fadeIn_0.3s_ease-out]">
					{#if msg.role === 'assistant'}
						<div class="w-7 h-7 rounded-lg shrink-0 mr-2 mt-1 flex items-center justify-center text-center bg-gradient-to-br from-primary to-secondary shadow-sm">
							<span class="text-[8px] font-black text-white leading-none">DEX</span>
						</div>
					{/if}
					<div class="max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm
						{msg.role === 'user'
							? 'text-white rounded-br-sm bg-gradient-to-r from-violet-600 to-indigo-650'
							: 'text-slate-700 rounded-bl-sm border border-slate-200/80 bg-white'}"
					>
						{msg.content}
					</div>
				</div>
			{/each}

			{#if isTyping}
				<div class="flex justify-start">
					<div class="w-7 h-7 rounded-lg shrink-0 mr-2 mt-1 flex items-center justify-center bg-gradient-to-br from-primary to-secondary">
						<span class="text-[8px] font-black text-white">DEX</span>
					</div>
					<div class="px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-1.5 border border-slate-200/80 bg-white shadow-sm">
						<span class="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
						<span class="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
						<span class="w-2 h-2 bg-violet-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Quick Prompts -->
		{#if messages.length <= 1}
			<div class="px-4 pt-2 pb-1 flex flex-wrap gap-2 shrink-0 bg-slate-50 border-t border-slate-200/60">
				{#each quickPrompts as prompt}
					<button onclick={() => sendMessage(prompt)}
						class="text-xs text-violet-750 px-3 py-1.5 rounded-full transition-all hover:bg-violet-100 bg-white border border-violet-200/60 shadow-sm"
					>
						{prompt}
					</button>
				{/each}
			</div>
		{/if}

		<!-- Input -->
		<div class="p-3 flex gap-2 items-end shrink-0 bg-white border-t border-slate-200/60">
			<textarea
				bind:value={inputText}
				onkeydown={handleKeydown}
				placeholder="Ask Dex anything..."
				rows="1"
				class="flex-1 text-sm text-slate-800 placeholder-slate-400 outline-none resize-none leading-relaxed rounded-xl px-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-violet-300 focus:bg-white transition-all max-h-[100px] overflow-y-auto"
			></textarea>
			<button
				onclick={() => sendMessage()}
				disabled={!inputText.trim() || isTyping}
				class="w-10 h-10 rounded-xl text-white flex items-center justify-center transition-all shrink-0 bg-gradient-to-br from-violet-600 to-indigo-650 disabled:opacity-30 disabled:pointer-events-none shadow-md shadow-primary/20"
				aria-label="Send message"
				title="Send message"
			>
				<i class="ri-send-plane-fill text-sm"></i>
			</button>
		</div>
	</div>
{/if}

<style>
	@keyframes slideUp {
		from { opacity: 0; transform: translateY(16px); }
		to { opacity: 1; transform: translateY(0); }
	}
</style>
