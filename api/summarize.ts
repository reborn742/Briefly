import { handleSummarize } from '../server/handlers.js';
import { methodNotAllowed, vercelHandler } from '../server/vercel.js';

export const POST = vercelHandler(handleSummarize);
export const GET = methodNotAllowed;
