export type Queue<T> = {
  head?: QueueNode<T>;
  tail?: QueueNode<T>;
  length: number;
};

export function createQueue<T>(): Queue<T> {
  return {
    head: undefined,
    tail: undefined,
    length: 0,
  };
}

type QueueNode<T> = {
  value: T;
  next?: QueueNode<T>;
};

export function createQueueNode<T>(value: T): QueueNode<T> {
  return {
    value,
    next: undefined,
  };
}

export function peek<T>(queue: Queue<T>): T | undefined {
  return queue.head?.value;
}

export function enqueue<T>(queue: Queue<T>, value: T) {
  const node = createQueueNode(value);
  queue.length++;
  if (queue.tail) {
    queue.tail.next = node;
    queue.tail = queue.tail.next;
    return;
  }

  queue.tail = node;
  queue.head = queue.tail;
}

export function deque<T>(queue: Queue<T>): T | undefined {
  if (!queue.head) {
    return undefined;
  }

  queue.length--;
  const value = queue.head.value;
  queue.head = queue.head.next;
  if (!queue.head) {
    queue.tail = undefined;
  }
  return value;
}
