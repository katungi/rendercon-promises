// sleep is a function that waits for a given number of milliseconds
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// checkStock is a function that waits for 100 milliseconds and then throws an error
const checkStock = async () => {
  await sleep(100);
  throw new Error("Out of stock");
};

// chargeCard is a function that waits for 1000 milliseconds and then logs a message
const chargeCard = async (user) => {
  await sleep(1000);
  console.log(`💳 Charged ${user}`);
};

// try to charge the card and check the stock
try {
  await Promise.all([checkStock(), chargeCard("Daniel")]);
} catch (e) {
  console.log("Order failed:", e.message);
}