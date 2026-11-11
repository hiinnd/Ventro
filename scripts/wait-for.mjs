const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/wait-for.mjs <url>');
const deadline = Date.now() + 90000;
while (Date.now() < deadline) {
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
    if (response.ok) {
      console.log('Ready: ' + target);
      process.exit(0);
    }
  } catch {
    /* Retry until the deadline. */
  }
  await new Promise((resolve) => setTimeout(resolve, 1000));
}
throw new Error('Service did not become ready: ' + target);
