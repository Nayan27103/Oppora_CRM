from django.db import models
from django.conf import settings


class Organization(models.Model):

    name = models.CharField(max_length=255)

    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_organizations"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    def __str__(self):
        return self.name
    
class TeamMember(models.Model):

    ROLE_CHOICES = (
        ("ADMIN", "ADMIN"),
        ("MANAGER", "MANAGER"),
        ("MEMBER", "MEMBER")
    )

    organization = models.ForeignKey(
        Organization,
        on_delete=models.CASCADE,
        related_name="members"
    )

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE
    )

    role = models.CharField(
        max_length=20,
        choices=ROLE_CHOICES,
        default="MEMBER"
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    class Meta:
        unique_together = (
            "organization",
            "user"
        )

    def __str__(self):
        return f"{self.user.email} - {self.role}"