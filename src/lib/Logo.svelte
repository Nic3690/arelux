<script lang="ts">
	import { page } from '$app/state';

	export let top: boolean = true;

	const url = page.data.supabase.storage
		.from(page.data.tenant)
		.getPublicUrl(`${page.data.tenant}.png`).data.publicUrl;
</script>

<div
	class="flex items-center justify-center gap-3"
	style="position: absolute; left: 300px; right: 300px; {top ? 'top' : 'bottom'}: 20px;"
>
	<img src={url} style="max-height: 50px;" alt="" />
	<div class="bg-primary text-black px-3 py-1 rounded-md font-bold text-sm">
		BETA
	</div>
</div>
<div></div>