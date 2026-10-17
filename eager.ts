const main = Promise.resolve("Rendercon lazy mojo").then((value) => {
    console.log("print " + value);
    return value.concat("!")
  })
 
const value = await main;
console.log(value);

// const again = await main;
// console.log(again);
