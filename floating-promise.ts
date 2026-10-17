async function saveUser() {
  throw new Error("Database is down");
}

try {
  saveUser();
  console.log("User saved ✅");
} catch (e) {
  console.log("Something went wrong:", e.message);
}