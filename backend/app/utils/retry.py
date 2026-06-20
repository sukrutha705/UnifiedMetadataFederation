import time
import functools
from typing import Callable, TypeVar, Any

_T = TypeVar("_T")


def retry_on_exception(
    max_attempts: int = 3,
    backoff_factor: float = 0.2,
    exceptions: tuple = (Exception,),
) -> Callable[[Callable[..., _T]], Callable[..., _T]]:
    """Decorator that retries a function on specified exceptions.

    Args:
        max_attempts: Total attempts (initial call + retries).
        backoff_factor: Base delay in seconds; actual delay = backoff_factor * (2 ** (attempt-1)).
        exceptions: Tuple of exception types to catch and retry.
    """

    def decorator(func: Callable[..., _T]) -> Callable[..., _T]:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> _T:
            attempt = 0
            while True:
                try:
                    return func(*args, **kwargs)
                except exceptions as exc:
                    attempt += 1
                    if attempt >= max_attempts:
                        raise
                    sleep_time = backoff_factor * (2 ** (attempt - 1))
                    time.sleep(sleep_time)
        return wrapper
    return decorator
