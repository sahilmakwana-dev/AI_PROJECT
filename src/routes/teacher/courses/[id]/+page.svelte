<script>
	import { page } from '$app/stores';
	import { supabase } from '$lib/supabaseClient';
	import { PUBLIC_CLOUDINARY_CLOUD_NAME, PUBLIC_CLOUDINARY_API_KEY } from '$env/static/public';
	import { onMount } from 'svelte';
	
	let courseId = $derived($page.params.id);
	let course = $state(null);
	let materials = $state([]);
	let isLoading = $state(true);
	let currentUser = $state(null);
	
	// Upload states
	let newMaterialTitle = $state('');
	let materialStatus = $state('');
	let isUploading = $state(false);
	
	// Edit states
	let editingId = $state(null);
	let editingTitle = $state('');
	let isSavingEdit = $state(false);
	
	onMount(async () => {
		// Verify session
		const stored = localStorage.getItem('currentUser');
		if (!stored) { window.location.href = '/'; return; }
		currentUser = JSON.parse(stored);

		// Fetch course details
		const { data: cData } = await supabase.from('courses').select('*').eq('id', courseId).single();
		
		// SECURITY CHECK: Only the course owner (teacher) can access this page
		if (!cData || cData.teacher_id !== currentUser.id) {
			alert('Access denied. You do not own this course.');
			window.location.href = '/teacher/dashboard';
			return;
		}
		
		course = cData;
		
		// Fetch materials
		const { data: mData } = await supabase.from('course_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: true });
		if (mData) materials = mData;
		
		isLoading = false;
	});
	
	async function handleAddMaterial(e) {
		e.preventDefault();
		const fileInput = document.getElementById('materialFile');
		const file = fileInput.files?.[0];
		
		if (!newMaterialTitle || !file) {
			materialStatus = 'Please provide a title and select a file.';
			return;
		}
		
		isUploading = true;
		materialStatus = 'Generating secure signature...';
		
		try {
			// 1. Get signature for Signed Upload
			const upload_preset = 'new_upload';
			const timestamp = Math.round((new Date).getTime() / 1000);
			
			const signRes = await fetch('/api/cloudinary/sign', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ upload_preset, timestamp })
			});
			if (!signRes.ok) throw new Error('Failed to generate secure upload signature');
			const { signature } = await signRes.json();

			materialStatus = 'Uploading to Cloudinary...';

			// 2. Upload file
			const formData = new FormData();
			formData.append('file', file);
			formData.append('upload_preset', upload_preset);
			formData.append('api_key', PUBLIC_CLOUDINARY_API_KEY);
			formData.append('timestamp', timestamp);
			formData.append('signature', signature);
			
			const res = await fetch(`https://api.cloudinary.com/v1_1/${PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
				method: 'POST',
				body: formData
			});
			
			if (!res.ok) throw new Error('Cloudinary upload failed');
			const uploadData = await res.json();
			
			// Determine file type based on mime type
			let type = 'document';
			if (file.type.startsWith('image/')) type = 'image';
			else if (file.type.startsWith('video/')) type = 'video';
			else if (file.type.startsWith('audio/')) type = 'audio';

			materialStatus = 'Saving to database...';
			
			// 3. Insert into Supabase course_materials
			const { data, error } = await supabase.from('course_materials').insert({
				course_id: courseId,
				title: newMaterialTitle,
				material_url: uploadData.secure_url,
				material_type: type
			}).select().single();
			
			if (error) throw new Error(error.message);
			
			materials = [...materials, data];
			newMaterialTitle = '';
			fileInput.value = ''; // Reset file input
			materialStatus = 'Material added successfully!';
			setTimeout(() => materialStatus = '', 3000);
			
		} catch (error) {
			materialStatus = 'Error: ' + error.message;
		} finally {
			isUploading = false;
		}
	}
	
	async function deleteMaterial(id) {
		if (!confirm('Are you sure you want to delete this material?')) return;
		const { error } = await supabase.from('course_materials').delete().eq('id', id);
		if (!error) {
			materials = materials.filter(m => m.id !== id);
		}
	}
	
	function startEdit(mat) {
		editingId = mat.id;
		editingTitle = mat.title;
	}
	
	async function saveEdit() {
		isSavingEdit = true;
		try {
			const fileInput = document.getElementById('editFile');
			const file = fileInput?.files?.[0];
			
			let updates = { title: editingTitle };
			
			if (file) {
				// Upload new file to Cloudinary first
				const upload_preset = 'new_upload';
				const timestamp = Math.round((new Date).getTime() / 1000);
				
				const signRes = await fetch('/api/cloudinary/sign', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ upload_preset, timestamp })
				});
				if (!signRes.ok) throw new Error('Signature failed');
				const { signature } = await signRes.json();

				const formData = new FormData();
				formData.append('file', file);
				formData.append('upload_preset', upload_preset);
				formData.append('api_key', PUBLIC_CLOUDINARY_API_KEY);
				formData.append('timestamp', timestamp);
				formData.append('signature', signature);
				
				const res = await fetch(`https://api.cloudinary.com/v1_1/${PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
					method: 'POST',
					body: formData
				});
				if (!res.ok) throw new Error('Cloudinary upload failed');
				const uploadData = await res.json();
				
				let type = 'document';
				if (file.type.startsWith('image/')) type = 'image';
				else if (file.type.startsWith('video/')) type = 'video';
				else if (file.type.startsWith('audio/')) type = 'audio';
				
				updates.material_url = uploadData.secure_url;
				updates.material_type = type;
			}
			
			const { data, error } = await supabase.from('course_materials').update(updates).eq('id', editingId).select().single();
			if (error) throw new Error(error.message);
			
			materials = materials.map(m => m.id === editingId ? data : m);
			editingId = null;
		} catch(err) {
			alert('Edit failed: ' + err.message);
		} finally {
			isSavingEdit = false;
		}
	}
</script>

{#if isLoading}
	<div class="flex items-center justify-center h-64 text-primary">
		<i class="ri-loader-4-line animate-spin text-4xl"></i>
	</div>
{:else if course}
	<div class="space-y-8 animate-[fadeIn_0.5s_ease-out]">
		<div>
			<a href="/teacher/dashboard" class="text-sm text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-2 mb-4 font-semibold">
				<i class="ri-arrow-left-line"></i> Back to Dashboard
			</a>
			<div class="flex flex-col md:flex-row items-start gap-6">
				<img src={course.thumbnail_url} alt={course.title} class="w-full md:w-64 h-36 object-cover rounded-xl border border-slate-200 shadow-md" />
				<div>
					<h1 class="text-3xl font-extrabold text-slate-800 mb-2">{course.title}</h1>
					<p class="text-slate-600 max-w-3xl leading-relaxed font-medium">{course.description}</p>
				</div>
			</div>
		</div>

		<!-- Curriculum Section -->
		<div class="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm">
			<h2 class="text-xl font-bold text-slate-800 mb-6 border-b border-slate-100 pb-4">Curriculum & Materials</h2>
			
			{#if materials.length === 0}
				<div class="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-slate-200 border-dashed mb-8">
					<i class="ri-folder-video-line text-5xl mb-4 block opacity-50 text-slate-300"></i>
					<p class="text-lg font-bold text-slate-700">No materials uploaded yet.</p>
					<p class="text-sm mt-1 text-slate-500">Add your first video or document lesson below to build your course!</p>
				</div>
			{:else}
				<ul class="space-y-3 mb-8">
					{#each materials as mat, index}
						<li class="flex items-center justify-between p-4 bg-slate-50/50 border border-slate-200 rounded-xl hover:border-primary/50 transition-colors group">
							<div class="flex items-center gap-4 flex-1">
								<div class="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold shrink-0">
									{index + 1}
								</div>
								
								{#if editingId === mat.id}
									<div class="flex-1 flex flex-col gap-2 w-full pr-4">
										<input type="text" bind:value={editingTitle} class="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-slate-800 focus:outline-none focus:border-primary text-sm font-semibold">
										
										<div class="flex items-center gap-2">
											<input type="file" id="editFile" class="flex-1 bg-white border border-slate-250 rounded-md text-slate-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-600 transition-all cursor-pointer text-xs">
											
											<button onclick={saveEdit} disabled={isSavingEdit} class="px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white transition-colors rounded-lg disabled:opacity-50 flex items-center gap-1 text-sm font-semibold shrink-0 border border-emerald-250">
												{#if isSavingEdit}
													<i class="ri-loader-4-line animate-spin"></i>
												{:else}
													<i class="ri-check-line"></i> Save
												{/if}
											</button>
											<button onclick={() => editingId = null} disabled={isSavingEdit} class="px-3 py-1.5 text-slate-500 hover:bg-slate-100 rounded-lg disabled:opacity-50 text-sm font-semibold border border-slate-200 shrink-0">Cancel</button>
										</div>
									</div>
								{:else}
									<div>
										<h4 class="text-slate-800 font-bold flex items-center gap-2">
											{mat.title}
											<a href={mat.material_url} target="_blank" class="text-xs text-primary hover:underline ml-2"><i class="ri-external-link-line"></i> View File</a>
										</h4>
										<p class="text-xs text-slate-400 uppercase tracking-wider flex items-center gap-1 mt-1 font-semibold">
											<i class={mat.material_type === 'video' ? 'ri-video-line' : (mat.material_type === 'image' ? 'ri-image-line' : 'ri-file-text-line')}></i> {mat.material_type}
										</p>
									</div>
								{/if}
							</div>
							
							{#if editingId !== mat.id}
							<div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity ml-4 shrink-0">
								<button onclick={() => startEdit(mat)} class="p-2 text-slate-500 hover:text-primary bg-white border border-slate-200 hover:border-primary rounded-lg transition-all"><i class="ri-edit-line"></i></button>
								<button onclick={() => deleteMaterial(mat.id)} class="p-2 text-red-500 hover:text-white hover:bg-red-500 bg-white border border-slate-200 hover:border-red-500 rounded-lg transition-all"><i class="ri-delete-bin-line"></i></button>
							</div>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<!-- Add Material Form -->
			<form onsubmit={handleAddMaterial} class="bg-slate-50 p-6 md:p-8 rounded-xl border border-slate-200 border-dashed relative overflow-hidden">
				<div class="absolute right-0 bottom-0 w-64 h-64 bg-primary/5 blur-[80px] rounded-full pointer-events-none"></div>
				<h3 class="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
					<i class="ri-add-circle-line text-primary"></i> Add New Lesson
				</h3>
				<div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
					<div>
						<label class="block text-xs font-bold text-slate-500 mb-2">Lesson Title</label>
						<input type="text" bind:value={newMaterialTitle} placeholder="e.g. Introduction to Variables" class="w-full bg-white border border-slate-250 rounded-lg px-4 py-3 text-slate-800 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all text-sm font-semibold" required>
					</div>
					<div>
						<label class="block text-xs font-bold text-slate-500 mb-2">Upload File (Video, Image, PDF)</label>
						<input type="file" id="materialFile" required class="w-full bg-white border border-slate-250 rounded-lg px-4 py-2.5 text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white hover:file:bg-blue-600 transition-all cursor-pointer text-sm">
					</div>
				</div>
				<div class="flex items-center justify-between pt-4 border-t border-slate-200">
					{#if materialStatus}
						<span class="text-sm font-semibold {materialStatus.includes('Error') ? 'text-red-500' : 'text-emerald-600'} flex items-center gap-2">
							{#if isUploading}
								<i class="ri-loader-4-line animate-spin"></i>
							{:else if !materialStatus.includes('Error')}
								<i class="ri-check-line"></i>
							{/if}
							{materialStatus}
						</span>
					{:else}
						<span></span>
					{/if}
					
					<button disabled={isUploading} type="submit" class="px-6 py-2.5 bg-gradient-to-r from-primary to-secondary text-white rounded-xl font-bold hover:scale-[1.02] transition-all shadow-lg shadow-primary/20 flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none">
						<i class="ri-upload-cloud-2-line"></i> {isUploading ? 'Processing...' : 'Upload & Save Lesson'}
					</button>
				</div>
			</form>
		</div>
	</div>
{:else}
	<div class="text-center py-20 text-slate-500">
		<h2 class="text-2xl font-bold text-slate-800 mb-2">Course not found</h2>
		<p class="font-medium">The course you are looking for does not exist or has been deleted.</p>
	</div>
{/if}
