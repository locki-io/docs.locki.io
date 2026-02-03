"""
Scheduler utility functions.

This module contains shared utilities used by both the scheduler and task modules.
Extracted to avoid circular imports between app.services.scheduler and app.services.tasks.
"""

import logging
from contextlib import contextmanager
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from apscheduler.schedulers.background import BackgroundScheduler in uvicorn

from config.logging --> logging of the application

logger = alog.get_domain_logger(__name__)
@contextmanager
def get_db_scheduler(engine):
    """
    Context manager to provide a SQLAlchemy connection with transaction handling and UDF registration.

    Args:
        engine: SQLAlchemy engine instance.

    Yields:
        SQLAlchemy connection object.

    Raises:
        SQLAlchemyError: If connection or transaction fails.
        Exception: For unexpected errors during setup or cleanup.
    """

--> replace with mongodb connection


def normalize_timestamp(ts):
    """
    Normalize timestamp to seconds.

    Converts millisecond timestamps to seconds if necessary.

    Args:
        ts: Timestamp (in seconds or milliseconds)

    Returns:
        float: Timestamp in seconds
    """
    ts = float(ts)
    if ts > 1e12:  # Greater than ~Sat Sep 09 2001 in ms
        ts = ts / 1000  # Convert from ms to seconds
    return ts


def clear_old_notification_jobs(scheduler: BackgroundScheduler) -> None:
    """
    Remove all existing notification jobs from the scheduler to prevent past jobs from lingering.

    Args:
        scheduler: APScheduler BackgroundScheduler instance
    """
    try:
        jobs = scheduler.get_jobs()
        for job in jobs:
            if job.id.startswith("notification_"):
                scheduler.remove_job(job.id)
                logging.info(f"Removed old job: {job.id}")
    except Exception as e:
        logging.error(f"Error clearing old jobs: {e}")


def clear_all_jobs(scheduler: BackgroundScheduler) -> None:
    """
    Remove all existing jobs from the scheduler to ensure a clean slate.

    Args:
        scheduler: APScheduler BackgroundScheduler instance
    """
    try:
        jobs = scheduler.get_jobs()
        for job in jobs:
            scheduler.remove_job(job.id)
            logging.info(f"Removed job: {job.id}")
    except Exception as e:
        logging.error(f"Error clearing jobs: {e}")
