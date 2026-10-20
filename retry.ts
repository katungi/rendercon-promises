let attempts = 0;

const fetchData = async (): Promise<string> => {
  attempts++;
  console.log("Attempt", attempts);
  if (attempts < 3) throw new Error("Network failed");
  return "Rendercon lazy mojo!";
};

async function retry<T>(fn: () => Promise<T>, times: number): Promise<T> {
  for (let i = 1; i <= times; i++) {
    try {
      return await fn();
    } catch {
      console.log(`Try ${i} failed`);
    }
  }
  throw new Error("Gave up");
}

try {
  // Pass the function itself so retry can create a fresh Promise each time.
  console.log(await retry(fetchData, 3));
} catch (e) {
  console.log(e instanceof Error ? e.message : String(e));
}