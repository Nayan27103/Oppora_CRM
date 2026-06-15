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

@shared_task
def send_email_task(user_id, subject, message):
    from django.contrib.auth import get_user_model
    from notifications.utils import send_email_notification
    
    User = get_user_model()
    try:
        user = User.objects.get(id=user_id)
        send_email_notification(user, subject, message)
        return f"Email sent to {user.email}"
    except User.DoesNotExist:
        return "User not found"