<script>
	import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY } from '$env/static/public';
	import { supabase } from '$lib/supabaseClient';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	let currentUser = $state(null);
	onMount(() => {
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);
	});

	let title = $state('');
	let description = $state('');
	let price = $state(0);
	let isUploading = $state(false);
	let uploadStatus = $state('');
	let selectedFile = $state(null);
	let previewUrl = $state(null);

	function handleFileSelect(e) {
		const file = e.target.files?.[0];
		if (file) {
			selectedFile = file;
			if (file.type.startsWith('image/')) {
				const reader = new FileReader();
				reader.onload = (e) => {
					previewUrl = e.target.result;
				};
				reader.readAsDataURL(file);
			} else {
				previewUrl = null;
			}
		}
	}
	
	async function handleUpload(e) {
		e.preventDefault();
		
		if (!selectedFile) {
			uploadStatus = 'Please select a file first.';
			return;
		}
		
		isUploading = true;
		uploadStatus = 'Uploading to Cloudinary...';
		
		try {
			const upload_preset = 'new_upload';
			const timestamp = Math.round((new Date).getTime() / 1000);
			
			// 1. Get secure signature from our backend
			const signRes = await fetch('/api/cloudinary/sign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ upload_preset, timestamp })
			});
			if (!signRes.ok) throw new Error('Failed to generate secure upload signature');
			const { signature } = await signRes.json();

			// 2. Upload to Cloudinary
			const formData = new FormData();
			formData.append('file', selectedFile);
			formData.append('upload_preset', upload_preset);
			formData.append('api_key', PUBLIC_CLOUDINARY_API_KEY);
			formData.append('timestamp', timestamp);
			formData.append('signature', signature);
			
			const res = await fetch(`https://api.cloudinary.com/v1_1/${PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
				method: 'POST',
				body: formData
			});
			
			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error?.message || 'Upload failed');
			}
			const data = await res.json();
			
			uploadStatus = `Upload Successful! Saving course...`;
			
			// 3. Save course to Supabase Database with teacher_id
			const { data: courseData, error: dbError } = await supabase
				.from('courses')
				.insert({ 
					title: title, 
					description: description, 
					price: price,
					thumbnail_url: data.secure_url,
					instructor_name: currentUser?.email || 'Instructor',
					teacher_id: currentUser?.id
				})
				.select();
				
			if (dbError) throw new Error(dbError.message);
			
			isUploading = false;
			
			// 4. Redirect the teacher to the specific course curriculum panel!
			if (courseData && courseData[0]) {
				goto(`/teacher/courses/${courseData[0].id}`);
			}
		} catch (error) {
			uploadStatus = `Error: ${error.message}`;
			isUploading = false;
		}
	}
</script>

<div class="space-y-8 animate-[fadeIn_0.5s_ease-out] max-w-3xl mx-auto">
	<div>
		<h1 class="text-3xl font-bold text-white flex items-center gap-3">
			<a href="/teacher/dashboard" class="text-slate-500 hover:text-white transition-colors"><i class="ri-arrow-left-line text-2xl"></i></a>
			Create New Course
		</h1>
		<p class="mt-2 text-slate-400 ml-9">Fill out the details below and upload your course materials.</p>
	</div>

	<form onsubmit={handleUpload} class="bg-panel rounded-2xl p-6 md:p-8 border border-slate-700/50 shadow-lg space-y-6">
		<div>
			<label for="title" class="block text-sm font-medium text-slate-300 mb-2">Course Title</label>
			<input id="title" bind:value={title} type="text" required class="block w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all" placeholder="e.g. Advanced JavaScript">
		</div>

		<div>
			<label for="price" class="block text-sm font-medium text-slate-300 mb-2">Course Price (₹)</label>
			<input id="price" bind:value={price} type="number" min="0" step="1" required class="block w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all" placeholder="e.g. 1999">
		</div>

		<div>
			<label for="description" class="block text-sm font-medium text-slate-300 mb-2">Description</label>
			<textarea id="description" bind:value={description} rows="4" required class="block w-full bg-slate-800/50 border border-slate-600 rounded-xl py-3 px-4 text-slate-100 placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all" placeholder="What will students learn?"></textarea>
		</div>

		<div class="border-2 border-dashed {previewUrl ? 'border-primary bg-primary/5' : 'border-slate-600 bg-slate-800/20'} rounded-2xl p-8 text-center hover:border-primary transition-colors relative group overflow-hidden">
			<input onchange={handleFileSelect} type="file" id="thumbnail" accept="image/*,video/*" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20" />
			
			{#if previewUrl}
				<div class="absolute inset-0 z-0">
					<img src={previewUrl} alt="Preview" class="w-full h-full object-cover opacity-20" />
				</div>
				<div class="relative z-10 flex flex-col items-center justify-center space-y-3">
					<div class="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white shadow-lg">
						<i class="ri-check-line text-3xl"></i>
					</div>
					<h3 class="text-lg font-medium text-white">{selectedFile?.name}</h3>
					<p class="text-sm text-slate-300">{(selectedFile?.size / 1024 / 1024).toFixed(2)} MB - Click to change</p>
				</div>
			{:else}
				<div class="relative z-10 flex flex-col items-center justify-center space-y-3">
					<div class="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
						<i class="ri-upload-cloud-2-line text-3xl"></i>
					</div>
					<h3 class="text-lg font-medium text-slate-300 group-hover:text-white transition-colors">Upload Course Thumbnail / Video</h3>
					<p class="text-sm text-slate-500">Drag and drop media, or click to browse (Powered by Cloudinary)</p>
				</div>
			{/if}
		</div>

		{#if uploadStatus}
			<div class="p-4 rounded-xl bg-slate-800 border border-slate-700 text-sm {isUploading ? 'text-amber-400' : 'text-emerald-400'} flex items-center gap-2">
				{#if isUploading}<i class="ri-loader-4-line animate-spin"></i>{/if}
				{uploadStatus}
			</div>
		{/if}

		<div class="pt-4 border-t border-slate-700/50 flex justify-end">
			<button disabled={isUploading} type="submit" class="px-6 py-3 bg-gradient-to-r from-primary to-secondary text-white font-medium rounded-xl hover:scale-105 transition-all shadow-lg shadow-primary/30 disabled:opacity-50 disabled:pointer-events-none">
				{isUploading ? 'Uploading...' : 'Publish Course'}
			</button>
		</div>
	</form>
</div>
