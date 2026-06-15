from django.conf import settings
from django.core.mail import send_mail
from .models import Notification


def create_notification(
    user,
    title,
    message
):

    Notification.objects.create(
        user=user,
        title=title,
        message=message
    )


def send_email_notification(
    user,
    subject,
    message,
    from_email=None
):
    if not user.email:
        return

    send_mail(
        subject,
        message,
        from_email or settings.DEFAULT_FROM_EMAIL,
        [user.email],
        fail_silently=False
    )