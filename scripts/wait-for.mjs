const target = process.argv[2];
if (!target) throw new Error('Usage: node scripts/wait-for.mjs <url>');
async function waitForService() {
  const deadline = Date.now() + 90000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(target, { signal: AbortSignal.timeout(3000) });
      await response.arrayBuffer();
      if (response.ok) {
        console.log('Ready: ' + target);
        return;
      }
    } catch {
      /* Retry until the deadline. */
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  throw new Error('Service did not become ready: ' + target);
}
await waitForService();
