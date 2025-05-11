#!/bin/bash

# Fix command.svelte
sed -i '' 's/type $$Props = CommandPrimitive.CommandProps;/type $$Props = CommandPrimitive.CommandProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command.svelte

# Fix command-empty.svelte
sed -i '' 's/type $$Props = CommandPrimitive.EmptyProps;/type $$Props = CommandPrimitive.EmptyProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-empty.svelte

# Fix command-group.svelte
sed -i '' 's/type $$Props = CommandPrimitive.GroupProps;/type $$Props = CommandPrimitive.GroupProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-group.svelte

# Fix command-item.svelte
sed -i '' 's/type $$Props = CommandPrimitive.ItemProps;/type $$Props = CommandPrimitive.ItemProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-item.svelte

# Fix command-input.svelte
sed -i '' 's/type $$Props = CommandPrimitive.InputProps;/type $$Props = CommandPrimitive.InputProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-input.svelte

# Fix command-list.svelte
sed -i '' 's/type $$Props = CommandPrimitive.ListProps;/type $$Props = CommandPrimitive.ListProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-list.svelte

# Fix command-separator.svelte
sed -i '' 's/type $$Props = CommandPrimitive.SeparatorProps;/type $$Props = CommandPrimitive.SeparatorProps \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-separator.svelte

# Fix command-shortcut.svelte - this one is different
sed -i '' 's/type $$Props = HTMLAttributes<HTMLSpanElement>;/type $$Props = HTMLAttributes<HTMLSpanElement> \& { class?: string | null | undefined; };/g' src/shadcn/ui/command/command-shortcut.svelte

# Fix form-description.svelte
sed -i '' 's/type $$Props = HTMLAttributes<HTMLSpanElement>;/type $$Props = HTMLAttributes<HTMLSpanElement> \& { class?: string | null | undefined; };/g' src/shadcn/ui/form/form-description.svelte

echo "Fixed all ClassValue issues in command components"
