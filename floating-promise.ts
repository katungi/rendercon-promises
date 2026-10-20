async function saveUser() {
  throw new Error("Database is down");
}

try {
  await saveUser();
  console.log("User saved ✅");
} catch (e) {
  console.log("Something went wrong:", e instanceof Error ? e.message : String(e));
}