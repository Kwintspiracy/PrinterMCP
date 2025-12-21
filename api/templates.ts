/**
 * Response Templates API
 * Endpoints for managing versioned response templates
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getTemplateEngine, DEFAULT_TEMPLATES, ResponseStyle, TemplateContent } from '../src/response-templates';

// CORS headers
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return res.status(200).json({ ok: true });
    }

    // Set CORS headers
    Object.entries(corsHeaders).forEach(([key, value]) => {
        res.setHeader(key, value);
    });

    const engine = getTemplateEngine();

    try {
        // GET /api/templates - List all templates with versions
        if (req.method === 'GET') {
            const { key, preview } = req.query;

            // Get single template preview
            if (key && preview) {
                const style = (req.query.style as ResponseStyle) || 'technical';
                const variables = req.query.variables
                    ? JSON.parse(req.query.variables as string)
                    : {};

                const message = await engine.format(key as string, style, variables);
                return res.status(200).json({
                    success: true,
                    key,
                    style,
                    message
                });
            }

            // Get all templates
            const templates = await engine.getAllTemplates();
            const defaults = Object.keys(DEFAULT_TEMPLATES);

            return res.status(200).json({
                success: true,
                templates,
                availableKeys: defaults,
                styles: ['technical', 'friendly', 'minimal'] as ResponseStyle[]
            });
        }

        // POST /api/templates - Save new template version
        if (req.method === 'POST') {
            const { action, key, content, name, version } = req.body;

            // Revert to a previous version
            if (action === 'revert') {
                if (!key || !version) {
                    return res.status(400).json({
                        success: false,
                        error: 'Missing required fields: key, version'
                    });
                }

                const template = await engine.revertToVersion(key, version);
                return res.status(200).json({
                    success: true,
                    message: `Reverted to version ${version}`,
                    template
                });
            }

            // Initialize defaults
            if (action === 'initialize') {
                await engine.initializeDefaults();
                return res.status(200).json({
                    success: true,
                    message: 'Default templates initialized'
                });
            }

            // Save new version
            if (!key || !content) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: key, content'
                });
            }

            // Validate content structure
            if (!content.technical || !content.friendly || !content.minimal) {
                return res.status(400).json({
                    success: false,
                    error: 'Content must include: technical, friendly, minimal'
                });
            }

            const template = await engine.saveTemplate(key, content as TemplateContent, name);
            return res.status(200).json({
                success: true,
                message: `Saved version ${template.version}`,
                template
            });
        }

        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        });

    } catch (error) {
        console.error('[Templates API] Error:', error);
        return res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Internal server error'
        });
    }
}
