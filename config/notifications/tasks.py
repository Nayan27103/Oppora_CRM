from celery import shared_task

from notifications.models import Notification


@shared_task
def create_notification_task(
    user_id,
    title,
    message
):

    Notification.objects.create(
        user_id=user_id,
        title=title,
        message=message
    )

    return "Notification Created"