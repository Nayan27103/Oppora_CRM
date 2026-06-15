from django.db import models

# Create your models here.
from django.db import models
from contacts.models import Contact


class Lead(models.Model):

    STATUS_CHOICES = [
        ("NEW", "NEW"),
        ("CONTACTED", "CONTACTED"),
        ("QUALIFIED", "QUALIFIED"),
        ("PROPOSAL", "PROPOSAL"),
        ("WON", "WON"),
        ("LOST", "LOST"),
    ]

    contact = models.ForeignKey(
        Contact,
        on_delete=models.CASCADE,
        related_name="leads"
    )

    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="NEW"
    )

    score = models.IntegerField(
        default=0
    )

    notes = models.TextField(
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return f"{self.contact.first_name} - {self.status}"