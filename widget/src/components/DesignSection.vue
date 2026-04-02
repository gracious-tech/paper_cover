
<template lang="pug">

//- Design section: theme, font, background image, color mode, and color pickers

//- Theme dropdown
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Theme
    USelect(v-model="form.theme" :items="theme_items")

//- Font dropdown
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Font
    USelect(v-model="form.font" :items="font_items")

//- Background image file input
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Background image
    UInput(type="file" accept=".jpg,.jpeg,.png,.webp" @change="on_image_change")

p(class="text-[11px] text-(--ui-text-dimmed) -mt-1") Required for hero, classic &amp; modern themes

//- Colors sub-section label
div(class="text-[10px] font-bold tracking-[0.07em] uppercase text-(--ui-text-muted) border-t border-(--ui-border-muted) pt-[6px] pb-[2px] mt-1") Colors

//- Dark/light mode toggle
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Mode
    div(class="flex")
        UButton(
            type="button"
            :color="form.color_mode_dark ? 'neutral' : 'neutral'"
            :variant="form.color_mode_dark ? 'solid' : 'outline'"
            size="sm"
            class="flex-1 rounded-r-none"
            @click="form.color_mode_dark = true"
        ) Dark
        UButton(
            type="button"
            :color="!form.color_mode_dark ? 'neutral' : 'neutral'"
            :variant="!form.color_mode_dark ? 'solid' : 'outline'"
            size="sm"
            class="flex-1 rounded-l-none"
            @click="form.color_mode_dark = false"
        ) Light

//- Primary color swatches and picker
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Primary
    div(class="flex items-center gap-[5px] flex-wrap")
        button(
            v-for="color in primary_swatches"
            :key="color"
            type="button"
            class="w-[22px] h-[22px] rounded-full border-2 p-0 cursor-pointer shrink-0 transition-transform duration-100 hover:scale-[1.15] outline-offset-2"
            :class="form.primary_color === color ? 'border-(--ui-text)' : 'border-transparent'"
            :style="{background: color}"
            @click="form.primary_color = color"
        )
        input(
            type="color"
            v-model="form.primary_color"
            class="w-[26px] h-[22px] border border-(--ui-border) rounded cursor-pointer bg-transparent ml-0.5"
            style="padding: 1px 2px"
        )

//- Secondary color swatches and picker
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Secondary
    div(class="flex items-center gap-[5px] flex-wrap")
        button(
            v-for="color in secondary_swatches"
            :key="color"
            type="button"
            class="w-[22px] h-[22px] rounded-full border-2 p-0 cursor-pointer shrink-0 transition-transform duration-100 hover:scale-[1.15] outline-offset-2"
            :class="form.secondary_color === color ? 'border-(--ui-text)' : 'border-transparent'"
            :style="{background: color}"
            @click="form.secondary_color = color"
        )
        input(
            type="color"
            v-model="form.secondary_color"
            class="w-[26px] h-[22px] border border-(--ui-border) rounded cursor-pointer bg-transparent ml-0.5"
            style="padding: 1px 2px"
        )

</template>

<script setup lang="ts">
// Design section — theme, font, background image, and color scheme controls

import {inject} from 'vue'
import {FORM_KEY} from '../form_state'

// Inject the shared form state
const form = inject(FORM_KEY)!

// Theme dropdown items
const theme_items = [
    {label: 'Minimal', value: 'minimal'},
    {label: 'Hero', value: 'hero'},
    {label: 'Classic', value: 'classic'},
    {label: 'Bold', value: 'bold'},
    {label: 'Modern', value: 'modern'},
]

// Font dropdown items
const font_items = [
    {label: 'Serif (Libertinus Serif)', value: 'serif'},
    {label: 'Serif (New Computer Modern)', value: 'sans'},
    {label: 'Mono (DejaVu Sans Mono)', value: 'mono'},
]

// Preset swatch colors for primary selection
const primary_swatches = [
    '#4f6bed', '#e0484a', '#e8782a', '#d4a017',
    '#2aab7a', '#2aa8d4', '#9b6fe0', '#e06fa8',
]

// Preset swatch colors for secondary selection
const secondary_swatches = [
    '#7f8cf7', '#f43f5e', '#fb923c', '#fbbf24',
    '#34d399', '#38bdf8', '#a78bfa', '#f472b6',
]

/** Read the selected file from the file input and store it on the form */
function on_image_change(event:Event): void {
    const input = event.target as HTMLInputElement
    form.bg_image = input.files?.[0] ?? null
}
</script>
