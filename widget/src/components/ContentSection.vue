
<template lang="pug">

//- Content section: title, advanced fields, subtitle, author, isbn, back blurb

//- Title field (required)
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]")
        | Title&nbsp;
        span(class="text-red-500") *
    UInput(v-model="form.title")

//- Advanced section with collapsible prefix/suffix fields
div(class="flex flex-col gap-[10px]")
    UButton(
        type="button"
        color="primary"
        variant="link"
        size="xs"
        class="self-start"
        :aria-expanded="String(show_advanced)"
        @click="show_advanced = !show_advanced"
    ) {{ show_advanced ? '▾' : '▸' }} Advanced
    div(v-show="show_advanced" class="flex flex-col gap-[10px]")
        div(class="flex flex-col gap-1")
            label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Title prefix
            UInput(v-model="form.title_pre" placeholder="e.g. The")
        div(class="flex flex-col gap-1")
            label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Title suffix
            UInput(v-model="form.title_post" placeholder="e.g. and the Phoenix")

//- Subtitle field
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Subtitle
    UInput(v-model="form.subtitle")

//- Author field
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Author
    UInput(v-model="form.author")

//- ISBN field
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") ISBN
    UInput(v-model="form.isbn" placeholder="978-…")

//- Back blurb textarea (required)
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]")
        | Back blurb&nbsp;
        span(class="text-red-500") *
    UTextarea(v-model="form.back_blurb" :rows="4")

p(class="text-[11px] text-(--ui-text-dimmed) -mt-1") Back blurb accepts Typst markup: *bold*, _italic_

</template>

<script setup lang="ts">
// Content section — text fields for title, subtitle, author, ISBN, blurb

import {ref, inject} from 'vue'
import {FORM_KEY} from '../form_state'

// Inject the shared form state
const form = inject(FORM_KEY)!

// Toggle visibility of the advanced title prefix/suffix fields
const show_advanced = ref(false)
</script>
