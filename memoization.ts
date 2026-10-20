let online = false;

const main = () => Promise.resolve("Rendercon lazy mojo").then((value) => {
  console.log("Trying:", value); // <- remains as our side-effect
  if (!online) throw new Error("Network failed");
  return value.concat("!");
});

try {
  await main();
} catch (e) {
  console.log("First await:", e instanceof Error ? e.message : String(e));
}

online = true;
console.log("Network is back ✅");

try {
  console.log("Second await:", await main()
  );
} catch (e) {
  console.log("Second await:", e instanceof Error ? e.message : String(e));
}