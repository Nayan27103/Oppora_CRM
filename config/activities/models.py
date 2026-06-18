from django.db import models

# Create your models here.
from django.db import models
from django.conf import settings
from leads.models import Lead


class Activity(models.Model):

    TYPE_CHOICES = [
        ("CALL", "CALL"),
        ("MEETING", "MEETING"),
        ("TASK", "TASK"),
        ("NOTE", "NOTE")
    ]

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="activities"
    )

    activity_type = models.CharField(
        max_length=20,
        choices=TYPE_CHOICES
    )

    title = models.CharField(
        max_length=255
    )

    description = models.TextField(
        blank=True
    )

    due_date = models.DateTimeField(
        null=True,
        blank=True
    )

    assigned_to = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    completed = models.BooleanField(
        default=False
    )

    is_deleted = models.BooleanField(
        default=False,
        db_index=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.title