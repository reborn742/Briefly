import { handleNews } from '../server/handlers.js';
import { methodNotAllowed, vercelHandler } from '../server/vercel.js';

export const POST = vercelHandler(handleNews);
export const GET = methodNotAllowed;
