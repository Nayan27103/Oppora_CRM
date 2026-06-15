from django.db import models

# Create your models here.
from django.db import models
from leads.models import Lead


class Deal(models.Model):

    STAGES = [
        ("DISCOVERY", "DISCOVERY"),
        ("DEMO", "DEMO"),
        ("NEGOTIATION", "NEGOTIATION"),
        ("CLOSED_WON", "CLOSED_WON"),
        ("CLOSED_LOST", "CLOSED_LOST"),
    ]

    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="deals"
    )

    title = models.CharField(
        max_length=255
    )

    value = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        db_index=True
    )

    stage = models.CharField(
        max_length=50,
        choices=STAGES,
        default="DISCOVERY",
        db_index=True
    )

    expected_close_date = models.DateField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    updated_at = models.DateTimeField(
        auto_now=True
    )

    def __str__(self):
        return self.title