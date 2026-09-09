import { togglePanicMode } from './utils/panic';

export default async function Command() {
  await togglePanicMode();
}
