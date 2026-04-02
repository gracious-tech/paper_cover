
// Shared reactive form state and injection key for the cover generator

import {reactive} from 'vue'
import type {InjectionKey} from 'vue'

/** All form fields for the book cover generator */
export interface FormState {
    // Content
    title:           string
    title_pre:       string
    title_post:      string
    subtitle:        string
    author:          string
    isbn:            string
    back_blurb:      string
    // Design
    theme:           string
    font:            string
    bg_image:        File | null
    color_mode_dark: boolean
    primary_color:   string
    secondary_color: string
    // Size & print
    trim_width:      number
    trim_height:     number
    trim_unit:       string
    page_count:      number
    printer_name:    string
    paper_type:      string
    custom_bleed:    number
    custom_spine:    number
    custom_units:    string
}

// Injection key for provide/inject across the component tree
export const FORM_KEY: InjectionKey<FormState> = Symbol('form')

/** Create a reactive FormState with default values */
export function make_form(): FormState {
    return reactive({
        title:           'Art of Code',
        title_pre:       '',
        title_post:      '',
        subtitle:        'A journey through software craft',
        author:          'Alice Chen',
        isbn:            '978-3-16-148410-0',
        back_blurb:      '*The Art of Code* is a deep dive into the timeless principles behind great software.\n\nWhether you are a seasoned engineer or just starting out, this book will challenge the way you think about your craft.',
        theme:           'minimal',
        font:            'serif',
        bg_image:        null,
        color_mode_dark: true,
        primary_color:   '#4f6bed',
        secondary_color: '#7f8cf7',
        trim_width:      152,
        trim_height:     229,
        trim_unit:       'mm',
        page_count:      300,
        printer_name:    'kdp',
        paper_type:      'white',
        custom_bleed:    3.175,
        custom_spine:    5,
        custom_units:    'mm',
    })
}
