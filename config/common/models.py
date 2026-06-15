from django.db import models
from django.conf import settings

class RequestLog(models.Model):
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="request_logs"
    )
    path = models.CharField(max_length=1024)
    method = models.CharField(max_length=10)
    execution_time = models.DecimalField(max_digits=8, decimal_places=4)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        username = self.user.username if self.user else "Anonymous"
        return f"{self.method} {self.path} by {username} ({self.execution_time}s)"
