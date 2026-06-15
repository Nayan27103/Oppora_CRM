from django.contrib import admin
from .models import Lead


@admin.register(Lead)
class LeadAdmin(admin.ModelAdmin):

    list_display = (
        "id",
        "contact",
        "status",
        "score",
        "created_at"
    )

    search_fields = (
        "contact__first_name",
        "contact__email"
    )

    list_filter = (
        "status",
    )