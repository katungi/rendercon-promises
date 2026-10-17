async function getUser(){
    throw "User not found";
  }
  
  try {
    await getUser();
  } catch (e) {
    console.log(e)
  }

//   catch (e) {
//     if (e instanceof DOMException && e.name === "AbortError") {
//       // the user cancelled
//     } else if (e instanceof Error) {
//       // a real error, probably
//     } else {
//       // ...no idea
//     }
//   }