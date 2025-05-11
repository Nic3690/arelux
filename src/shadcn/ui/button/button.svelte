<script lang="ts">
	import { Button as ButtonPrimitive } from "bits-ui";
	import { type Props, type Events, buttonVariants } from "./index.js";
	import { cn } from "$shad/utils.js";

	type $$Props = Props;
	type $$Events = Events;

	let className: $$Props["class"] = undefined;
	export let variant: $$Props["variant"] = "default";
	export let size: $$Props["size"] = "default";
	export { className as class };
</script>

<ButtonPrimitive.Root
	class={cn(buttonVariants({ variant, size, className }))}
	type="button"
	{...$$restProps}
	onclick={$$props.onclick}
	onkeydown={$$props.onkeydown}
>
	<slot />
</ButtonPrimitive.Root>