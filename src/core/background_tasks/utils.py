import redis
from redis import Redis
from redis.exceptions import LockError, LockNotOwnedError
from redis.lock import Lock

import settings


class RedisLockManager:
    def __init__(self, lock_key: str):
        self.lock_key: str = f"vr-{lock_key}"
        # lock ttl must be greater than batch processing time, so add addition 60 seconds for processing to batch_sleep time
        self._ttl = settings.RETENTION_GLOBAL_BATCH_PAUSE + 60
        self._acquired = True

        # every redis operation can lock for long period pinging unavailable server but retention perform in separate process so whatever
        self.redis_instance: Redis = redis.Redis(host=settings.REDIS_HOST, port=settings.REDIS_PORT)

        self._lock = Lock(self.redis_instance, self.lock_key, timeout=self._ttl, blocking=False)

    def acquire_lock(self) -> bool:
        acquired = self._lock.acquire()

        if not acquired:
            return self._lock.owned()
        else:
            return True

    def check_and_extend_lock(self) -> bool:
        try:
            self._lock.reacquire()
            return True
        except (LockNotOwnedError, LockError):
            return False

    def release_lock(self) -> bool:
        try:
            self._lock.release()
            return True
        except LockError:
            return False
