from datetime import datetime

import os
import uuid
from dotenv import load_dotenv
import pytz


from app.cache import get_lock_connection, get_redis_connection

import logging

################################### LOGGER ########################
from config.logging import alog

logger = alog.get_domain_logger(__name__)  # --> scheduler
###################################################################

##### environment variables :
load_dotenv()
# app_timezone = os.getenv("APP_TIMEZONE", "Europe/Paris")
tz_timezone = pytz.timezone(os.getenv("APP_TIMEZONE", "Europe/Paris"))
DATE_FORMAT = "%d%m%Y"
REDIS_LOCK_TIMEOUT = 300
REDIS_SUCCESS_TIMEOUT = 300
REDIS_DB_SCHEDULER = 6


class TaskError(Exception):
    """Custom exception for task failures."""

    def __init__(self, status, error_message):
        self.status = status
        self.error_message = error_message
        super().__init__(error_message)


def _task_boilerplate(
    task_name: str, date_string: str, skip_success_check: bool = False
):
    """
    Shared boilerplate for task routines: Initializes logging, lock/success keys, result dict,
    and handles skip logic for already-completed or running tasks.

    Args:
        task_name: Full task identifier (e.g., "task_program", "task_favorability").
        date_string: Date in DATE_FORMAT (e.g., "03102025").
        skip_success_check: If True, skip success key check (for recurring tasks like task_odds).
                            Default: False.

    Returns:
        tuple: (l: Redis conn, lock_key: str, success_key: str, result: dict, task_id: str)
    """
    task_id = str(uuid.uuid4())
    logger.info(f"Starting {task_name} routine task {task_id} in process {os.getpid()}")

    l = get_lock_connection()  # APScheduler Redis connection (db=11)
    lock_key = f"lock:{task_name}:{date_string}"
    success_key = f"success:{task_name}:{date_string}"

    # Dynamic counters: Strip "task_" prefix for brevity (e.g., "program_successes")
    short_name = task_name.replace("task_", "")
    counter_keys = {f"{short_name}_successes": 0, f"{short_name}_processed": 0}
    result = {
        "status": "success",
        "date": date_string,
        "errors": [],
        "warnings": [],  # For non-fatal issues
        "failed_races": [],
        "reason": None,
        **counter_keys,
    }

    # Check if task already succeeded (skip for recurring tasks)
    if not skip_success_check and l.exists(success_key):
        logger.info(f"Skipping {task_name}: already completed for {date_string}")
        result["status"] = "skipped"
        result["reason"] = f"Already completed on {date_string}"
        # Cleaner title: Capitalize short name
        short_title = f"{short_name.capitalize()} Routine Skipped"
        alog.display(result, title=short_title)
        return l, lock_key, success_key, result, task_id  # Early return

    # Acquire lock
    if not l.set(lock_key, task_id, ex=REDIS_LOCK_TIMEOUT, nx=True):
        logger.info(
            f"{task_name} already running for {date_string} (task_id: {task_id})"
        )
        result["status"] = "skipped"
        result["reason"] = "Already running"
        short_title = f"{short_name.capitalize()} Routine Skipped"
        alog.display(result, title=short_title)
        return l, lock_key, success_key, result, task_id  # Early return

    return l, lock_key, success_key, result, task_id


# Import all task functions AFTER defining utilities to avoid circular imports
from app.services.tasks.task_careers import task_careers
from app.services.tasks.task_clear_log import task_clear_log
from app.services.tasks.task_favorability import task_favorability
from app.services.tasks.task_ground_condition import task_ground_condition
from app.services.tasks.task_history import task_history
from app.services.tasks.task_odds import task_odds
from app.services.tasks.task_participants import task_participants
from app.services.tasks.task_pastraces import task_pastraces
from app.services.tasks.task_plan_race_task_init import plan_race_task_init
from app.services.tasks.task_predictions import task_predictions
from app.services.tasks.task_prepare_tomorrow import task_prepare_tomorrow
from app.services.tasks.task_program import task_program
from app.services.tasks.task_watch_for_results import task_watch_for_results
from app.services.tasks.task_sync_autochat import task_sync_autochat
from app.services.tasks.task_today import task_today
from app.services.tasks.task_tomorrow import task_tomorrow
from app.services.tasks.task_yesterday import task_yesterday

__all__ = [
    # Utilities
    "TaskError",
    "_task_boilerplate",
    "DATE_FORMAT",
    "REDIS_LOCK_TIMEOUT",
    "REDIS_SUCCESS_TIMEOUT",
    "tz_timezone",
    # Tasks
    "task_careers",
    "task_clear_log",
    "task_favorability",
    "task_ground_condition",
    "task_history",
    "task_odds",
    "task_participants",
    "task_pastraces",
    "task_plan_race_task_init",
    "task_predictions",
    "task_prepare_tomorrow",
    "task_program",
    "task_watch_for_results",
    "task_sync_autochat",
    "task_today",
    "task_tomorrow",
    "task_yesterday",
    "plan_race_task_init",
]
