import { VercelRequest, VercelResponse } from '@vercel/node';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Use global __dirname for CommonJS
    const currentDir = __dirname;
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
            __dirname: currentDir,
            cwd,
        },
        files: {
            cwd: await listDir(cwd),
            dirname: await listDir(currentDir),
            parent: await listDir(path.join(currentDir, '..')),
            build: await listDir(path.join(cwd, 'build')).catch(e => `Error: ${e.message}`),
            api_sibling_build: await listDir(path.join(currentDir, '..', 'build')).catch(e => `Error: ${e.message}`),
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
