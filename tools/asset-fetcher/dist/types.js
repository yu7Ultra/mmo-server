import { z } from 'zod';
export const PostActionSchema = z.discriminatedUnion('action', [
    z.object({
        action: z.literal('extractFrames'),
        frameWidth: z.number().positive(),
        frameHeight: z.number().positive(),
        pattern: z.string().optional(),
        margin: z.number().int().nonnegative().default(0).optional(),
        spacing: z.number().int().nonnegative().default(0).optional(),
        mode: z.enum(['meta', 'files', 'atlas']).default('meta').optional(),
        directionOrder: z.array(z.string()).optional(),
        directionBlockSize: z.number().int().positive().optional(),
        metaFile: z.string().optional()
    }),
    z.object({
        action: z.literal('rename'),
        from: z.string(),
        to: z.string()
    })
]);
export const AssetEntrySchema = z.object({
    id: z.string(),
    type: z.enum(['zip', 'image', 'file']),
    source: z.enum(['opengameart', 'direct']).default('direct'),
    url: z.string().url(),
    license: z.string().optional(),
    pathFilters: z.array(z.string()).optional(),
    post: z.array(PostActionSchema).optional()
});
export const ConfigSchema = z.object({
    outputDir: z.string(),
    concurrency: z.number().int().positive().max(10).default(3),
    userAgent: z.string().default('MMOAssetFetcher/0.1'),
    assets: z.array(AssetEntrySchema)
});
