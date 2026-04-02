
// TypeScript interfaces and Zod validation schema for the cover generator input

import {z} from 'zod'

// -- Printer types --

export type ThemeName = 'hero' | 'minimal' | 'classic' | 'bold' | 'modern'
export type FontName = 'serif' | 'sans' | 'mono'

// -- Color object --

export interface CoverColors {
    front_background?:string
    back_background?:string      // defaults to front_background
    spine_background?:string     // defaults to accent
    front_title?:string
    front_title_pre?:string
    front_title_post?:string
    front_subtitle?:string
    front_author?:string
    back_blurb?:string
    spine_title?:string
    spine_author?:string
    accent?:string
}

// -- Printer config --

export type PrinterConfig =
    | {name:'kdp',     paper_type:'white' | 'cream'}
    | {name:'lulu',    paper_type:'white' | 'cream' | 'color'}
    | {name:'generic'}
    | {name:'home'}
    | {name:'custom',  bleed:number, spine_width:number, units:'mm' | 'in'}

// -- Top-level schema --

export interface CoverSchema {
    text: {
        title_pre?:string
        title:string
        title_post?:string
        subtitle?:string
        author?:string
        isbn?:string
        back_blurb:string
    }
    colors:CoverColors
    size: {
        trim_width:number
        trim_height:number
        trim_unit:'mm' | 'in'
        page_count:number
    }
    images: {
        background?:string
    }
    theme: {
        name:ThemeName
        font:FontName
    }
    printer:PrinterConfig
}

// -- Zod validation --

const hex_color = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Must be a hex color like #1a2b3c')

const cover_colors_schema = z.object({
    front_background:   hex_color.optional(),
    back_background:    hex_color.optional(),
    spine_background:   hex_color.optional(),
    front_title:        hex_color.optional(),
    front_title_pre:    hex_color.optional(),
    front_title_post:   hex_color.optional(),
    front_subtitle:     hex_color.optional(),
    front_author:       hex_color.optional(),
    back_blurb:         hex_color.optional(),
    spine_title:        hex_color.optional(),
    spine_author:       hex_color.optional(),
    accent:             hex_color.optional(),
}).default({})

const printer_config_schema:z.ZodType<PrinterConfig> = z.discriminatedUnion('name', [
    z.object({name: z.literal('kdp'),     paper_type: z.enum(['white', 'cream'])}),
    z.object({name: z.literal('lulu'),    paper_type: z.enum(['white', 'cream', 'color'])}),
    z.object({name: z.literal('generic')}),
    z.object({name: z.literal('home')}),
    z.object({
        name:         z.literal('custom'),
        bleed:        z.number().nonnegative(),
        spine_width:  z.number().nonnegative(),
        units:        z.enum(['mm', 'in']),
    }),
])

export const cover_schema = z.object({
    text: z.object({
        title_pre:   z.string().optional(),
        title:       z.string().min(1),
        title_post:  z.string().optional(),
        subtitle:    z.string().optional(),
        author:      z.string().optional(),
        isbn:        z.string().optional(),
        back_blurb:  z.string().min(1),
    }),
    colors:  cover_colors_schema,
    size: z.object({
        trim_width:   z.number().positive(),
        trim_height:  z.number().positive(),
        trim_unit:    z.enum(['mm', 'in']),
        page_count:   z.number().int().positive(),
    }),
    images: z.object({
        background: z.string().optional(),
    }).default({}),
    theme: z.object({
        name:  z.enum(['hero', 'minimal', 'classic', 'bold', 'modern']),
        font:  z.enum(['serif', 'sans', 'mono']),
    }),
    printer: printer_config_schema,
})
