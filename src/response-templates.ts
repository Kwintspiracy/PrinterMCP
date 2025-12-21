/**
 * Response Template System
 * Enables customizable, versioned templates for how the MCP describes printer states to LLMs
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Types
// ============================================

export type ResponseStyle = 'technical' | 'friendly' | 'minimal' | 'exactCopy';

export interface TemplateContent {
    technical: string;
    friendly: string;
    minimal: string;
    exactCopy?: string;
    custom?: string;
}

export interface ResponseTemplate {
    id: string;
    template_key: string;
    version: number;
    name: string | null;
    content: TemplateContent;
    is_active: boolean;
    created_at: string;
}

export interface TemplateVariable {
    name: string;
    value: string | number | boolean;
}

// ============================================
// Default Templates
// ============================================

export const DEFAULT_TEMPLATES: Record<string, TemplateContent> = {
    'status_ready': {
        technical: 'PRINTER_STATUS: READY. All systems operational.',
        friendly: 'The printer is ready and waiting for your print jobs! 🖨️',
        minimal: 'Ready'
    },
    'status_printing': {
        technical: 'PRINTER_STATUS: PRINTING. Job "${jobName}" in progress (${progress}%).',
        friendly: 'Currently printing "${jobName}" - ${progress}% complete!',
        minimal: 'Printing: ${progress}%'
    },
    'status_error': {
        technical: 'PRINTER_STATUS: ERROR. ${errorType}: ${errorMessage}. Action required.',
        friendly: 'Uh oh! The printer has an issue: ${errorMessage}. Let me help you fix it.',
        minimal: 'Error: ${errorType}'
    },
    'status_paused': {
        technical: 'PRINTER_STATUS: PAUSED. Awaiting resume command.',
        friendly: 'The printer is paused. Ready to continue when you are!',
        minimal: 'Paused'
    },
    'low_ink_warning': {
        technical: 'INK_WARNING: ${color} cartridge at ${level}%. Replacement recommended.',
        friendly: 'Heads up! Your ${color} ink is running low (${level}%). You might want to grab a replacement soon.',
        minimal: '${color} ink: ${level}%'
    },
    'ink_depleted': {
        technical: 'INK_CRITICAL: ${color} cartridge depleted. Printing disabled for color jobs.',
        friendly: 'The ${color} ink is empty! You\'ll need to replace it before printing in color.',
        minimal: '${color} ink empty!'
    },
    'paper_low': {
        technical: 'PAPER_WARNING: ${count} sheets remaining in tray. Capacity: ${capacity}.',
        friendly: 'Running low on paper - only ${count} sheets left. Time to reload!',
        minimal: 'Paper: ${count}/${capacity}'
    },
    'paper_empty': {
        technical: 'PAPER_CRITICAL: Paper tray empty. Load paper to continue.',
        friendly: 'The paper tray is empty! Please load some paper to continue printing.',
        minimal: 'No paper!'
    },
    'paper_jam': {
        technical: 'ERROR: Paper jam detected. Clear obstruction and resume.',
        friendly: 'Paper jam! Open the printer and gently remove the stuck paper, then we can try again.',
        minimal: 'Paper jam'
    },
    'maintenance_needed': {
        technical: 'MAINTENANCE: Print head cleaning recommended after ${pageCount} pages.',
        friendly: 'The printer could use some TLC! Consider running a cleaning cycle for best print quality.',
        minimal: 'Needs maintenance'
    },
    'job_completed': {
        technical: 'JOB_COMPLETE: "${jobName}" printed successfully. ${pages} pages.',
        friendly: 'Done! "${jobName}" has finished printing (${pages} pages). Go grab it! 📄',
        minimal: 'Printed: ${pages} pages'
    },
    'job_failed': {
        technical: 'JOB_FAILED: "${jobName}" could not be printed. Reason: ${reason}.',
        friendly: 'Unfortunately "${jobName}" couldn\'t be printed because: ${reason}',
        minimal: 'Print failed'
    },
    'printer_switch_notify': {
        technical: 'PRINTER_FALLBACK: Default printer "${defaultPrinter}" unavailable (${reason}). Printing on "${fallbackPrinter}" instead.',
        friendly: 'Heads up! Your ${defaultPrinter} can\'t print right now (${reason}), so I\'m using ${fallbackPrinter} instead. 🔄',
        minimal: 'Using ${fallbackPrinter} (fallback)'
    },
    'printer_switch_ask': {
        technical: 'CONFIRMATION_REQUIRED: Default printer "${defaultPrinter}" unavailable (${reason}). Approve printing on "${fallbackPrinter}"?',
        friendly: 'Your ${defaultPrinter} isn\'t available right now (${reason}). Would you like me to print on ${fallbackPrinter} instead? 🤔',
        minimal: 'Use ${fallbackPrinter}? (${defaultPrinter} unavailable)'
    }
};

// ============================================
// Template Engine
// ============================================

export class TemplateEngine {
    private supabase: SupabaseClient | null = null;
    private cachedTemplates: Map<string, ResponseTemplate> = new Map();
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL = 60000; // 1 minute

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_KEY;

        if (supabaseUrl && supabaseKey) {
            this.supabase = createClient(supabaseUrl, supabaseKey);
        }
    }

    /**
     * Interpolate variables into a template string
     */
    interpolate(template: string, variables: Record<string, any>): string {
        return template.replace(/\$\{(\w+)\}/g, (match, key) => {
            return variables[key] !== undefined ? String(variables[key]) : match;
        });
    }

    /**
     * Get the active template for a key, with fallback to defaults
     */
    async getTemplate(key: string): Promise<TemplateContent> {
        // Try to get from Supabase if available
        if (this.supabase) {
            try {
                // Check cache first
                if (Date.now() - this.cacheTimestamp < this.CACHE_TTL) {
                    const cached = this.cachedTemplates.get(key);
                    if (cached) return cached.content;
                }

                const { data, error } = await this.supabase
                    .from('response_templates')
                    .select('*')
                    .eq('template_key', key)
                    .eq('is_active', true)
                    .single();

                if (data && !error) {
                    this.cachedTemplates.set(key, data);
                    this.cacheTimestamp = Date.now();
                    return data.content;
                }
            } catch (e) {
                console.warn(`[TemplateEngine] Failed to fetch template ${key}:`, e);
            }
        }

        // Fallback to default
        return DEFAULT_TEMPLATES[key] || {
            technical: key,
            friendly: key,
            minimal: key
        };
    }

    /**
     * Format a message using the appropriate template and style
     */
    async format(
        key: string,
        style: ResponseStyle,
        variables: Record<string, any> = {}
    ): Promise<string> {
        const template = await this.getTemplate(key);
        const templateString = template[style] || template.technical;
        return this.interpolate(templateString, variables);
    }

    /**
     * Get all templates with version history
     */
    async getAllTemplates(): Promise<Record<string, ResponseTemplate[]>> {
        if (!this.supabase) {
            // Return defaults as single-version templates
            return Object.entries(DEFAULT_TEMPLATES).reduce((acc, [key, content]) => {
                acc[key] = [{
                    id: key,
                    template_key: key,
                    version: 1,
                    name: 'Default',
                    content,
                    is_active: true,
                    created_at: new Date().toISOString()
                }];
                return acc;
            }, {} as Record<string, ResponseTemplate[]>);
        }

        const { data, error } = await this.supabase
            .from('response_templates')
            .select('*')
            .order('template_key')
            .order('version', { ascending: false });

        if (error) throw error;

        // Group by template_key
        return (data || []).reduce((acc, template) => {
            if (!acc[template.template_key]) {
                acc[template.template_key] = [];
            }
            acc[template.template_key].push(template);
            return acc;
        }, {} as Record<string, ResponseTemplate[]>);
    }

    /**
     * Save a new version of a template
     */
    async saveTemplate(
        key: string,
        content: TemplateContent,
        name?: string
    ): Promise<ResponseTemplate> {
        if (!this.supabase) {
            throw new Error('Supabase not configured - templates are read-only');
        }

        // Get current max version
        const { data: existing } = await this.supabase
            .from('response_templates')
            .select('version')
            .eq('template_key', key)
            .order('version', { ascending: false })
            .limit(1);

        const nextVersion = existing && existing.length > 0 ? existing[0].version + 1 : 1;

        // Deactivate all existing versions
        await this.supabase
            .from('response_templates')
            .update({ is_active: false })
            .eq('template_key', key);

        // Insert new version as active
        const { data, error } = await this.supabase
            .from('response_templates')
            .insert({
                template_key: key,
                version: nextVersion,
                name: name || `Version ${nextVersion}`,
                content,
                is_active: true
            })
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        this.cachedTemplates.delete(key);

        return data;
    }

    /**
     * Revert to a previous template version
     */
    async revertToVersion(key: string, version: number): Promise<ResponseTemplate> {
        if (!this.supabase) {
            throw new Error('Supabase not configured - templates are read-only');
        }

        // Deactivate all versions
        await this.supabase
            .from('response_templates')
            .update({ is_active: false })
            .eq('template_key', key);

        // Activate the target version
        const { data, error } = await this.supabase
            .from('response_templates')
            .update({ is_active: true })
            .eq('template_key', key)
            .eq('version', version)
            .select()
            .single();

        if (error) throw error;

        // Invalidate cache
        this.cachedTemplates.delete(key);

        return data;
    }

    /**
     * Initialize default templates in database
     */
    async initializeDefaults(): Promise<void> {
        if (!this.supabase) return;

        for (const [key, content] of Object.entries(DEFAULT_TEMPLATES)) {
            const { data } = await this.supabase
                .from('response_templates')
                .select('id')
                .eq('template_key', key)
                .limit(1);

            if (!data || data.length === 0) {
                await this.supabase
                    .from('response_templates')
                    .insert({
                        template_key: key,
                        version: 1,
                        name: 'Default',
                        content,
                        is_active: true
                    });
            }
        }
    }
}

// Singleton instance
let templateEngine: TemplateEngine | null = null;

export function getTemplateEngine(): TemplateEngine {
    if (!templateEngine) {
        templateEngine = new TemplateEngine();
    }
    return templateEngine;
}
