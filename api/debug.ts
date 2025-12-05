import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const cwd = process.cwd();

    const debugInfo = {
        env: {
            VERCEL: process.env.VERCEL,
            VERCEL_ENV: process.env.VERCEL_ENV,
            NODE_ENV: process.env.NODE_ENV,
            SUPABASE_URL: process.env.SUPABASE_URL ? 'Set' : 'Not Set',
            SUPABASE_KEY: process.env.SUPABASE_KEY ? 'Set' : 'Not Set',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Set' : 'Not Set',
        },
        paths: {
            __dirname,
            __filename,
            cwd,
        },
        files: {
            cwd: await listDir(cwd),
            dirname: await listDir(__dirname),
            parent: await listDir(path.join(__dirname, '..')),
            build: await listDir(path.join(cwd, 'build')).catch(e => `Error: ${e.message}`),
            api_sibling_build: await listDir(path.join(__dirname, '..', 'build')).catch(e => `Error: ${e.message}`),
        }
    };

    res.status(200).json(debugInfo);
}

async function listDir(dirPath: string) {
    try {
        const files = await fs.promises.readdir(dirPath);
        return files;
    } catch (error) {
        return `Error listing ${dirPath}: ${error instanceof Error ? error.message : String(error)}`;
    }
}
