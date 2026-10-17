let attempts = 0;

const fetchData = async () => {
  attempts++;
  console.log("Attempt", attempts);
  if (attempts < 3) throw new Error("Network failed");
  return "Rendercon lazy mojo!";
};

async function retry(promise, times) {
  for (let i = 1; i <= times; i++) {
    try {
      return await promise;
    } catch (e) {
      console.log(`Try ${i} failed`);
    }
  }
  throw new Error("Gave up");
}

try {
  console.log(await retry(fetchData(), 3));
} catch (e) {
  console.log(e.message);
}