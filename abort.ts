
// sleep is a function that waits for a given number of milliseconds
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// checkStock is a function that waits for 100 milliseconds and then throws an error
const checkStock = async () => {
    await sleep(100);
    throw new Error("Out of stock");
  };
  

const chargeCard = async (user: string, signal: AbortSignal) => {
    await sleep(1000);
    // Promise.all will not cancel this for us, so this function must cooperate.
    if (signal.aborted) {
      console.log("Charge cancelled");
      return;
    }
    console.log(`💳 Charged ${user}`);
  };

  //js has an api for stopping async work. 
  const controller = new AbortController();
  
  try {
    await Promise.all([checkStock(), chargeCard("Daniel", controller.signal)]);
  } catch (e) {
    controller.abort(); // <- always abort, else, it will not actually stop
    console.log("Order failed:", e instanceof Error ? e.message : String(e));
  }