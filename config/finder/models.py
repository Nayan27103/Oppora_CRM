from django.db import models

# Create your models here.
from django.db import models
from accounts.models import User


class SearchQuery(models.Model):
    SEARCH_TYPE = [
        ('company', 'Company'),
        ('people', 'People'),
        ('both', 'Both'),
    ]
    STATUS = [
        ('pending', 'Pending'),
        ('running', 'Running'),
        ('done', 'Done'),
        ('failed', 'Failed'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='searches')
    domain = models.CharField(max_length=255, blank=True)
    industry = models.CharField(max_length=255, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    location = models.CharField(max_length=255, blank=True)
    search_type = models.CharField(max_length=10, choices=SEARCH_TYPE, default='both')
    status = models.CharField(max_length=10, choices=STATUS, default='pending')
    contacts_imported = models.IntegerField(default=0)
    companies_imported = models.IntegerField(default=0)
    error_message = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user.email} | {self.domain} | {self.status}"