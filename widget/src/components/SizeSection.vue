
<template lang="pug">

//- Size & Print section: trim size presets, page count, printer options

//- Trim size sub-section label (first — no top border)
div(class="text-[10px] font-bold tracking-[0.07em] uppercase text-(--ui-text-muted) pb-[2px]") Trim size

//- Preset size buttons
div(class="flex flex-wrap gap-[5px]")
    UButton(
        v-for="preset in presets"
        :key="preset.label"
        type="button"
        size="xs"
        :color="is_preset_active(preset) ? 'primary' : 'neutral'"
        :variant="is_preset_active(preset) ? 'solid' : 'outline'"
        @click="select_preset(preset)"
    ) {{ preset.label }}
    UButton(
        type="button"
        size="xs"
        :color="custom_size ? 'primary' : 'neutral'"
        :variant="custom_size ? 'solid' : 'outline'"
        @click="select_custom"
    ) Custom

//- Custom dimension inputs (shown only in custom mode)
div(v-show="custom_size" class="flex flex-col gap-[10px]")
    div(class="flex flex-col gap-1")
        label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Width
        div(class="flex gap-[6px]")
            UInput(
                type="number"
                v-model.number="form.trim_width"
                :min="1"
                :step="0.1"
                class="flex-1 min-w-0"
            )
            div(class="w-[72px] shrink-0")
                USelect(v-model="form.trim_unit" :items="unit_items")
    div(class="flex flex-col gap-1")
        label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Height
        UInput(type="number" v-model.number="form.trim_height" :min="1" :step="0.1")

//- Page count field
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Page count
    UInput(type="number" v-model.number="form.page_count" :min="1" :step="1")

//- Printer sub-section label
div(class="text-[10px] font-bold tracking-[0.07em] uppercase text-(--ui-text-muted) border-t border-(--ui-border-muted) pt-[6px] pb-[2px] mt-1") Printer

//- Printer dropdown
div(class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Printer
    USelect(v-model="form.printer_name" :items="printer_items")

//- Paper type dropdown (KDP and Lulu only)
div(v-if="show_paper_type" class="flex flex-col gap-1")
    label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Paper type
    USelect(v-model="form.paper_type" :items="paper_type_items")

//- Custom printer fields
div(v-if="show_custom_printer" class="flex flex-col gap-[10px]")
    div(class="flex flex-col gap-1")
        label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Bleed
        div(class="flex gap-[6px]")
            UInput(
                type="number"
                v-model.number="form.custom_bleed"
                :min="0"
                :step="0.001"
                class="flex-1 min-w-0"
            )
            div(class="w-[72px] shrink-0")
                USelect(v-model="form.custom_units" :items="unit_items")
    div(class="flex flex-col gap-1")
        label(class="text-[11px] font-semibold text-(--ui-text-muted) tracking-[0.02em]") Spine width
        UInput(type="number" v-model.number="form.custom_spine" :min="0" :step="0.01")

</template>

<script setup lang="ts">
// Size & Print section — trim size presets, page count, and printer settings

import {ref, computed, watch, inject} from 'vue'
import {FORM_KEY} from '../form_state'

// Inject the shared form state
const form = inject(FORM_KEY)!

// Whether the user has selected a custom size (not a preset)
const custom_size = ref(false)

// Standard trim size presets
const presets = [
    {label: 'A6',     w: 108, h: 175, unit: 'mm'},
    {label: 'Digest', w: 129, h: 198, unit: 'mm'},
    {label: '6×9″',   w: 152, h: 229, unit: 'mm'},
    {label: 'Trade',  w: 156, h: 234, unit: 'mm'},
    {label: 'A4',     w: 210, h: 297, unit: 'mm'},
]

// Unit select items
const unit_items = ['mm', 'in']

// Printer dropdown items
const printer_items = [
    {label: 'KDP', value: 'kdp'},
    {label: 'Lulu', value: 'lulu'},
    {label: 'Generic professional', value: 'generic'},
    {label: 'Home (no bleed)', value: 'home'},
    {label: 'Custom', value: 'custom'},
]

// Paper type items — Color option disabled unless Lulu is selected
const paper_type_items = computed(() => [
    {label: 'White', value: 'white'},
    {label: 'Cream', value: 'cream'},
    {label: 'Color (Lulu only)', value: 'color', disabled: form.printer_name !== 'lulu'},
])

/** Check whether a preset matches the current form size values */
function is_preset_active(preset:{label:string, w:number, h:number, unit:string}):boolean {
    return (
        !custom_size.value &&
        form.trim_width  === preset.w &&
        form.trim_height === preset.h &&
        form.trim_unit   === preset.unit
    )
}

/** Apply a size preset and hide the custom fields */
function select_preset(preset:{label:string, w:number, h:number, unit:string}):void {
    custom_size.value  = false
    form.trim_width    = preset.w
    form.trim_height   = preset.h
    form.trim_unit     = preset.unit
}

/** Switch to custom size mode and show the dimension inputs */
function select_custom():void {
    custom_size.value = true
}

// Show paper type for printers that support it
const show_paper_type = computed(() =>
    form.printer_name === 'kdp' || form.printer_name === 'lulu',
)

// Show custom bleed/spine fields only for the custom printer
const show_custom_printer = computed(() =>
    form.printer_name === 'custom',
)

// Reset paper type to white when switching away from Lulu with color selected
watch(() => form.printer_name, (name) => {
    if (name !== 'lulu' && form.paper_type === 'color')
        form.paper_type = 'white'
})
</script>
