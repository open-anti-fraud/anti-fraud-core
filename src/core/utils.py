import asyncio
from functools import wraps, partial
from typing import Iterable, Any

async def wait_for_pipeline(result_end):
    while True:
        await asyncio.sleep(0.1)
        if result_end.poll():
            return result_end.recv()


def async_wrap(func):
    @wraps(func)
    def run(*args, **kwargs):
        loop = asyncio.get_event_loop()
        partial_func = partial(func, *args, **kwargs)
        return loop.run_in_executor(None, partial_func)

    return run


# class AsyncPipRead:
#     def __init__(self, pipe_end):
#         self._pipe_end = pipe_end
#         self._event = asyncio.Event()
#         loop = asyncio.get_event_loop()
#         loop.add_reader(self._pipe_end.fileno(), self._event.set)
#
#     async def recv(self, timeout):
#         print("recv")
#         if not self._pipe_end.poll():
#             print("wait")
#             await asyncio.wait_for(self._event.wait(), timeout)
#             print("no wait")
#
#         result = self._pipe_end.recv()
#         self._event.clear()
#         print(f"Result: {result}")
#         return result
#
#     def fileno(self):
#         return self._pipe_end.fileno()

class BatchedList(Iterable):
    def __init__(self, batch_count: int):
        self.batch_count = batch_count
        self.batch_list = [[]]

    def append(self, value: Any):
        last_filled_list = self.batch_list[-1]

        if len(last_filled_list) == self.batch_count:
            last_filled_list = []
            self.batch_list.append(last_filled_list)

        last_filled_list.append(value)

    def __iter__(self):
        return iter(self.batch_list)