# Your async code is lying to you

This started as a talk I gave at RenderCon. The slides are here: [async-code.pptx](./async-code.pptx).

Promises are everywhere in JavaScript and React. We use them for data fetching, file uploads, database calls, queues, timers, basically every time our code has to wait for something.

The funny thing is that Promises look simple. You make one, you `await` it, you get a value, life is good. Then production happens and suddenly this innocent little `Promise` is moving mad.

This is not a deep talk about the internals of Promises. If you came here for the event loop, microtasks, and the full spec, sorry man. We are staying at the level where most of us actually write bugs.

The examples are in this repo. Run them with Bun:

```sh
bun eager.ts
bun memoization.ts
bun retry.ts
bun floating-promise.ts
bun cant-stop.ts
bun abort.ts
bun e.ts
```

## 1. Promises run eagerly

Start with [`eager.ts`](./eager.ts).

The first annoying thing about Promises is that they start running when you create them, not when you `await` them.

That sounds small until you put a side effect inside one:

```ts
const main = Promise.resolve("Rendercon lazy mojo").then((value) => {
  console.log("print " + value);
  return value.concat("!");
});
```

Even if you do not use `main`, the work has already started. The `console.log` runs because creating the Promise kicked off the computation.

So yes, your editor can complain that `main` was never called, and the program can still print something. Weird? Yes. Broken? No. That is just how Promises work.

`await` does not start a Promise. `await` only waits for a Promise that is already running.

That means these three things can be true at the same time:

1. The code type checks.
2. The code has a side effect even before you `await` it.
3. You cannot get the value without accepting that the side effect already happened.

That sucks a little.

## 2. Promises memoize their result

Still in [`eager.ts`](./eager.ts), try this:

```ts
const value = await main;
console.log(value);

const again = await main;
console.log(again);
```

You will get the value twice, but the side effect only runs once.

That is because a Promise remembers how it resolved. Once it has a value, every future `await` gets that same value. It does not rerun the work.

Sometimes that is useful. Sometimes it is clanker code waiting to enter prod wearing a fake moustache.

If the work is "fetch this once and share the value", memoization is nice. If the work is "try this operation again", memoization is a trap. You cannot retry a Promise that already failed or already succeeded. You can only observe the same result again.

The fix is boring and powerful:

```ts
const main = () =>
  Promise.resolve("Rendercon lazy mojo").then((value) => {
    console.log("Trying:", value);
    return value.concat("!");
  });
```

Make it a function.

A Promise is not callable. A function is. Every time you call the function, you get a fresh Promise and a fresh run.

That is what [`memoization.ts`](./memoization.ts) is showing. First the network is down, so the call fails. Then the network comes back, and calling `main()` again actually runs the work again.

## 3. Retrying means retrying a function

Now look at [`retry.ts`](./retry.ts).

Retries sound simple:

> Try this thing three times.

But what is "this thing"?

If "this thing" is already a Promise, then it has already started. It might already be done. It might already have failed. You cannot ask it politely to please become young again and rerun itself. This is JavaScript, not witchcraft.

Retry helpers need a function:

```ts
async function retry(fn, times) {
  for (let i = 1; i <= times; i++) {
    try {
      return await fn();
    } catch (e) {
      console.log(`Try ${i} failed`);
    }
  }

  throw new Error("Gave up");
}
```

The function is the recipe. The Promise is the meal already on the table.

If you pass the meal to the chef and ask them to cook it again, do not be shocked when everyone looks at you funny.

So the retry call should look like this:

```ts
await retry(fetchData, 3);
```

Not this:

```ts
await retry(fetchData(), 3);
```

The second version starts the work before `retry` gets a chance to control anything. The eagerness thing is biting us again.

## 4. Floating Promises will embarrass you

[`floating-promise.ts`](./floating-promise.ts) has the smallest example, but it is one of the easiest bugs to ship.

If you call an async function and do not `await` it, the Promise is now floating. Your `try/catch` will not catch what happens inside it because the error happens later, outside the synchronous flow you wrapped.

This works:

```ts
try {
  await saveUser();
  console.log("User saved");
} catch (e) {
  console.log("Something went wrong:", e);
}
```

This does not do what people think:

```ts
try {
  saveUser();
  console.log("User saved");
} catch (e) {
  console.log("Something went wrong:", e);
}
```

The `catch` does not wait around like a bouncer at the club door. If you do not `await`, the rejection walks past it.

This is common enough that TypeScript projects often use lint rules for it, like `no-floating-promises`. That rule exists because humans are optimistic and async code is petty.

## 5. You cannot stop reggae

Now open [`cant-stop.ts`](./cant-stop.ts).

This example runs two things with `Promise.all`:

1. Check if an item is in stock.
2. Charge the card.

The stock check fails quickly. The card charge takes longer.

You might expect `Promise.all` to stop the other work when one Promise fails. It does not.

`Promise.all` rejects when one Promise rejects, but it does not cancel the other Promises. They keep running until they finish.

So the order can fail because the item is out of stock, and the card can still be charged afterwards.

Which is bad.

Like, "please explain this to finance" bad.

Promises do not have a built-in stop button. If you want cancellation, you must design for cancellation.

## 6. AbortController helps, but you do the work

[`abort.ts`](./abort.ts) shows the usual JavaScript answer: `AbortController`.

The idea is good. You create a controller, pass its `signal` into the async work, and call `controller.abort()` when you want the work to stop.

But there is a catch, because of course there is.

The signal does not magically stop your function. Your code has to check it:

```ts
if (signal.aborted) {
  console.log("Charge cancelled");
  return;
}
```

That means:

1. You pass the signal through every layer that needs to care.
2. Each layer must check the signal at the right time.
3. You still need to call `controller.abort()` yourself.
4. Abort often shows up as an error, so now you are also dealing with `AbortError`.

It works. It is just very manual. If you forget one part, the code smiles at you and charges Daniel anyway.

## 7. What type is `e`?

Now look at [`e.ts`](./e.ts).

This one is not only a Promise problem. It is a JavaScript problem.

Inside `catch`, what is `e`?

```ts
try {
  await getUser();
} catch (e) {
  console.log(e);
}
```

It could be an `Error`. It could be a string. It could be an object. It could be `null` if someone woke up and chose violence.

TypeScript knows this, so with strict settings `e` is `unknown`. That is annoying, but TypeScript is right.

This is how you end up writing little error parsers everywhere:

```ts
catch (e) {
  if (e instanceof DOMException && e.name === "AbortError") {
    // The user cancelled.
  } else if (e instanceof Error) {
    // A normal Error, probably.
  } else {
    // No idea. Good luck, my brother.
  }
}
```

A `Promise<A>` only tells you the success type. It does not tell you the error type.

That is a big part of why async code in JavaScript can feel slippery. Success looks typed. Failure is basically "vibes".

## Honorable mentions

There are more sharp edges:

1. Promises do not give you much control over concurrency by default.
2. The built-in combinators are useful, but limited.
3. A lot of behavior depends on discipline and lint rules.

This is your homework. Go figure it out.

## So what do we do?

All of these are weaknesses in the Promise model:

1. Work starts too early.
2. Results are memoized whether you wanted that or not.
3. Retrying needs a function, not a Promise.
4. Floating Promises escape your `try/catch`.
5. `Promise.all` does not cancel other work.
6. Cancellation is manual.
7. Errors are not typed.

Not to sound like a shill, but this is why I like Effect.

Effect gives you primitives for laziness, retrying, interruption, concurrency, resource safety, and typed errors. It also gives you a different way to think about programs: describe the work first, then run it at the edge.

That matters because most Promise bugs come from work starting before you had a chance to say how it should run.

Promises are not bad. They are just lower-level than they look.

And if you forget that, your async code will lie to you with a straight face.