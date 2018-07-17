import readline from "readline";

enum Status {
  PENDING,
  REJECTED,
  FULFILLED,
}

type FulfilledHandler = (value?: any) => void;
type RejectedHandler = (resone?: Error) => void;
type Executor = (resolve: FulfilledHandler, reject: RejectedHandler) => void;

function resolveNext(
  next2: Next,
  x: any,
  resolve: FulfilledHandler,
  reject: RejectedHandler,
) {
  let isCalled = false;
  if (next2 === x) {
    return reject(new Error("Circular reference"));
  }

  if (x && (typeof x === "function" || typeof x === "object")) {
    const then = x.then;
    if (typeof then === "function") {
      then(
        (y: any) => {
          if (isCalled) {
            return;
          }
          isCalled = true;
          resolveNext(next2, y, resolve, reject);
        },
        (error: Error) => {
          if (isCalled) {
            return;
          }
          isCalled = true;
          reject(error);
        },
      );
    }
  } else {
    resolve(x);
  }
}

class Next {
  // public static resolve = (value: any): Next => {
  // }
  private value?: any;
  private reason?: Error;
  private status: Status = Status.PENDING;
  private fulilledQueue: FulfilledHandler[] = [];
  private rejectedQueue: RejectedHandler[] = [];

  constructor(executor: Executor) {
    try {
      executor(this.resolve, this.reject);
    } catch (error) {
      this.reason = error;
      this.reject(this.reason);
    }
  }

  public then = (onFulfilled: FulfilledHandler): Next => {
    const next2 = new Next((resolve, reject) => {
      if (this.status === Status.FULFILLED) {
        const x = onFulfilled(this.value);
        resolveNext(next2, x, resolve, reject);
      } else if (this.status === Status.PENDING) {
        this.fulilledQueue.push(() => {
          const x = onFulfilled(this.value);
          resolveNext(next2, x, resolve, reject);
        });
      }
    });
    return next2;
  }

  public catch = (onRejected: RejectedHandler) => {
    const next2 = new Next((resolve, reject) => {
      if (this.status === Status.REJECTED) {
        const x = onRejected(this.reason);
        resolveNext(next2, x, resolve, reject);
      } else if (this.status === Status.PENDING) {
        this.fulilledQueue.push(() => {
          const x = onRejected(this.reason);
          resolveNext(next2, x, resolve, reject);
        });
      }
    });
    return next2;
  }

  private resolve = (value: any) => {
    if (this.status === Status.PENDING) {
      this.status = Status.FULFILLED;
      this.value = value;
      this.fulilledQueue.forEach((onFulfilled) => onFulfilled());
    }
  }

  private reject = (resone?: Error) => {
    if (this.status === Status.REJECTED) {
      this.status = Status.REJECTED;
      this.reason = resone;
      this.rejectedQueue.forEach((onRejected) => onRejected());
    }
  }
}

// test
const delay = (t: number) => new Next((resolve) => setTimeout(resolve, t));

let timer: NodeJS.Timer;
(function loopTick(t = 0) {
  log(`${t} `);
  const dis = 50;
  timer = setTimeout(() => loopTick(t + dis), dis);
})();

function log(content: string) {
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0);
  process.stderr.write(content);
}

delay(1000)
  .then(() => {
    console.log("🤪\n");
    return delay(1000);
  })
  .then(() => {
    console.log("🤪\n");
    return delay(1000);
  })
  .then(() => {
    console.log("🤪\n");
    return delay(1000);
  })
  .then(() => {
    console.log("🤪\n");
    clearTimeout(timer);
  });
