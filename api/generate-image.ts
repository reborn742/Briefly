import { handleImage } from '../server/handlers.js';
import { methodNotAllowed, vercelHandler } from '../server/vercel.js';

export const POST = vercelHandler(handleImage);
export const GET = methodNotAllowed;
