<script lang="ts">
	let {
		onfile,
		disabled = false
	}: {
		onfile: (file: File) => void;
		disabled?: boolean;
	} = $props();

	let dragging = $state(false);
	let inputEl: HTMLInputElement | undefined = $state();

	function accept(file: File | undefined) {
		if (!file || disabled) return;
		if (!file.name.toLowerCase().endsWith('.skb') && file.type !== 'application/zip') {
			// Still try — extension may vary
		}
		onfile(file);
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		dragging = false;
		accept(e.dataTransfer?.files?.[0]);
	}
</script>

<div
	class="dropzone"
	class:dragging
	class:disabled
	role="button"
	tabindex="0"
	ondragover={(e) => {
		e.preventDefault();
		dragging = true;
	}}
	ondragleave={() => (dragging = false)}
	ondrop={onDrop}
	onclick={() => inputEl?.click()}
	onkeydown={(e) => {
		if (e.key === 'Enter' || e.key === ' ') {
			e.preventDefault();
			inputEl?.click();
		}
	}}
>
	<input
		bind:this={inputEl}
		type="file"
		accept=".skb,application/zip"
		hidden
		onchange={() => accept(inputEl?.files?.[0])}
	/>
	<p class="title">Drop your Suikakeibo `.skb` backup</p>
	<p class="hint">or click to choose a file — data stays in your browser</p>
</div>

<style>
	.dropzone {
		border: 2px dashed var(--border);
		border-radius: 16px;
		padding: 3rem 1.5rem;
		text-align: center;
		cursor: pointer;
		background: color-mix(in oklab, var(--surface) 88%, transparent);
		transition:
			border-color 0.2s,
			background 0.2s,
			transform 0.2s;
	}
	.dropzone:hover,
	.dropzone.dragging {
		border-color: var(--accent);
		background: color-mix(in oklab, var(--accent) 12%, var(--surface));
		transform: translateY(-1px);
	}
	.dropzone.disabled {
		opacity: 0.6;
		pointer-events: none;
	}
	.title {
		margin: 0;
		font-family: var(--font-display);
		font-size: 1.35rem;
		color: var(--ink);
	}
	.hint {
		margin: 0.6rem 0 0;
		color: var(--muted);
		font-size: 0.95rem;
	}
</style>
