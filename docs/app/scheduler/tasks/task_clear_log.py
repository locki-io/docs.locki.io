import logging

################################### LOGGER ########################
from app.services.tasks import TaskError, _task_boilerplate
from config.logging import alog

logger = alog.get_domain_logger(__name__)  # --> scheduler
###################################################################


######################### CLEAR LOGS ##################################
def task_clear_log(date_string: str):
    """
    Scheduled task to clear log files (truncate, not delete) and success keys for the day.
    Runs via orchestrate_task_chain daily at 10:40 AM.
    Uses root logger and TaskError, no retries.

    Args:
        date_string: Date in DATE_FORMAT (e.g., "03102025").

    Returns:
        dict: {"status": "success" | "skipped" | "failed", "date": str, "errors": list, "warnings": list,
               "reason": str | None, "task": str}

    Raises:
        TaskError: For general errors during log clearing
    """
    l, lock_key, success_key, result, task_id = _task_boilerplate(
        "task_clear_log", date_string
    )

    # Override for clear_log specifics (no counters needed)
    del result["clear_log_successes"]  # Remove boilerplate counter
    del result["clear_log_processed"]
    result["task"] = "task_clear_log"

    try:
        alog.clear_logs(delete_files=False)
        logger.info("Logs cleared successfully")
        # Delete all success keys for the given date
        keys_to_delete = l.keys(f"success:*:*{date_string}")
        if keys_to_delete:
            l.delete(*keys_to_delete)
            logger.info(f"Deleted {len(keys_to_delete)} success keys for {date_string}")
        else:
            logger.info(f"No success keys found for {date_string}")

        l.set(success_key, "completed", ex=86400)  # Mark as completed
        alog.display(result, title="Clear Log and keys Succeeded")  # Custom title
        return result

    except Exception as e:
        logger.error(f"Clear log routine failed for {date_string}: {e}", exc_info=True)
        result["status"] = "failed"
        if not result["errors"]:
            result["errors"].append(f"Log clearing error: {str(e)}")
        alog.display(result, title="Clear Log Failed")  # Custom title
        raise TaskError("failed", f"Log clearing error: {str(e)}")
    finally:
        l.delete(lock_key)  # Always release lock
